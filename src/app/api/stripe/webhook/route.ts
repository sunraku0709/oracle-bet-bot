import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPlanById, PLAN_DAILY_LIMITS } from '@/lib/plans'

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Configuration Stripe manquante' }, { status: 400 })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' })

  let event: import('stripe').Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Webhook signature error:', msg)
    return NextResponse.json({ error: `Signature invalide: ${msg}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const planId = getPlanById(session.metadata?.plan)

        if (!userId || !session.subscription) break

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const sub = subscription as unknown as {
          id: string; status: string; current_period_end: number;
          current_period_start: number; customer: string; metadata: Record<string, string>
        }

        // Propagate user_id + plan into subscription metadata for future events
        await stripe.subscriptions.update(sub.id, {
          metadata: { user_id: userId, plan: planId },
        })

        await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: sub.id,
          status: sub.status === 'active' ? 'active' : sub.status,
          plan: planId,
          daily_limit: PLAN_DAILY_LIMITS[planId],
          analyses_used: 0,
          billing_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as unknown as {
          id: string; status: string; current_period_end: number;
          current_period_start: number; customer: string; metadata: Record<string, string>
        }
        const userId = sub.metadata?.user_id
        const planId = getPlanById(sub.metadata?.plan)
        if (!userId) break

        // Fetch existing subscription to check if period changed (→ reset usage)
        const { data: existing } = await supabaseAdmin
          .from('subscriptions')
          .select('billing_period_start')
          .eq('user_id', userId)
          .single()

        const newPeriodStart = new Date(sub.current_period_start * 1000).toISOString()
        const periodChanged = existing?.billing_period_start !== newPeriodStart

        await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          status: sub.status === 'active' ? 'active' : sub.status,
          plan: planId,
          daily_limit: PLAN_DAILY_LIMITS[planId],
          ...(periodChanged ? { analyses_used: 0 } : {}),
          billing_period_start: newPeriodStart,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as unknown as {
          id: string; metadata: Record<string, string>
        }
        const userId = sub.metadata?.user_id
        if (!userId) break

        await supabaseAdmin.from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('user_id', userId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as { subscription: string }
        if (!invoice.subscription) break

        const sub = await stripe.subscriptions.retrieve(invoice.subscription)
        const userId = (sub.metadata as Record<string, string>)?.user_id
        if (!userId) break

        await supabaseAdmin.from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('user_id', userId)
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    // Return 200 so Stripe doesn't retry on logic errors
  }

  return NextResponse.json({ received: true })
}

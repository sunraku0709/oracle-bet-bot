import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Stripe-Signature manquant' }, { status: 400 })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
  })

  let event: import('stripe').Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
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

        if (!userId || !session.subscription) break

        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

        await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          status: subscription.status === 'active' ? 'active' : subscription.status,
          current_period_end: new Date(
            (subscription as unknown as { current_period_end: number }).current_period_end * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

        // Also store user_id in subscription metadata for future webhook events
        await stripe.subscriptions.update(subscription.id, {
          metadata: { user_id: userId },
        })
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as unknown as {
          id: string
          status: string
          current_period_end: number
          customer: string
          metadata: Record<string, string>
        }
        const userId = sub.metadata?.user_id
        if (!userId) break

        await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          status: sub.status === 'active' ? 'active' : sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice
        const subId = (invoice as unknown as { subscription: string }).subscription
        if (!subId) break

        const sub = await stripe.subscriptions.retrieve(subId)
        const userId = (sub.metadata as Record<string, string>)?.user_id
        if (!userId) break

        await supabaseAdmin.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: sub.id,
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    // Don't return 500 – Stripe will retry. Log and return 200.
  }

  return NextResponse.json({ received: true })
}

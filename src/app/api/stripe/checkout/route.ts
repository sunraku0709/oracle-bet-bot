import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { PLANS, getPlanById, type PlanId } from '@/lib/plans'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY non configurée' }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const planId: PlanId = getPlanById(body.plan)
    const plan = PLANS[planId]

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      || req.headers.get('origin')
      || 'https://www.oracle-bet.fr'

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })

    // Reuse existing Stripe customer if available
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    // Use pre-created Stripe price IDs if set in env, otherwise create dynamically
    const priceIdEnvKey = `STRIPE_PRICE_${planId.toUpperCase()}` as keyof NodeJS.ProcessEnv
    const priceId = process.env[priceIdEnvKey]

    const lineItem = priceId
      ? { price: priceId, quantity: 1 }
      : {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Oracle Bet — ${plan.name}`,
              description: plan.features.slice(0, 2).join(' · '),
            },
            unit_amount: plan.priceEur,
            recurring: { interval: 'month' as const },
          },
          quantity: 1,
        }

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [lineItem],
      metadata: {
        user_id: user.id,
        plan: planId,
      },
      success_url: `${baseUrl}/dashboard?success=true&plan=${planId}`,
      cancel_url: `${baseUrl}/abonnement?canceled=true`,
      allow_promotion_codes: true,
    }

    if (existingSub?.stripe_customer_id) {
      sessionParams.customer = existingSub.stripe_customer_id
    } else {
      sessionParams.customer_email = user.email
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    console.error('Stripe checkout error:', error)
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    if (msg.includes('Invalid API Key') || msg.includes('No API key')) {
      return NextResponse.json({
        error: 'Clé Stripe invalide. Vérifiez STRIPE_SECRET_KEY dans Vercel → Settings → Environment Variables.',
      }, { status: 500 })
    }
    return NextResponse.json({ error: 'Erreur paiement : ' + msg }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { PLANS, getPlanById, COMBO_ADDON, type PlanId } from '@/lib/plans'

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

    const stripeKey = process.env.STRIPE_SECRET_KEY.trim()

    // Diagnostic log — visible dans Vercel → Functions → Logs
    console.log('[stripe/checkout] KEY DIAG:', {
      raw_length: process.env.STRIPE_SECRET_KEY.length,
      trimmed_length: stripeKey.length,
      has_whitespace: process.env.STRIPE_SECRET_KEY !== stripeKey,
      prefix: stripeKey.slice(0, 12) + '…',
      starts_with_sk: stripeKey.startsWith('sk_'),
      mode: stripeKey.startsWith('sk_live_') ? 'LIVE' : stripeKey.startsWith('sk_test_') ? 'TEST' : 'UNKNOWN',
    })

    if (!stripeKey.startsWith('sk_')) {
      return NextResponse.json({
        error: `STRIPE_SECRET_KEY invalide — doit commencer par sk_live_ ou sk_test_ (valeur actuelle commence par: "${stripeKey.slice(0, 8)}")`,
      }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const planId: PlanId = getPlanById(body.plan)
    const plan = PLANS[planId]
    const addons: string[] = Array.isArray(body.addons) ? body.addons : []
    const withComboAddon = addons.includes('combo_daily') && planId === 'premium'

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      || req.headers.get('origin')
      || 'https://oracle-bet-bot.vercel.app'

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey, {
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

    const lineItems = [lineItem]

    // Add combo addon line item if requested
    if (withComboAddon) {
      const comboPriceId = COMBO_ADDON.stripePriceId
      if (comboPriceId) {
        lineItems.push({ price: comboPriceId, quantity: 1 })
      } else {
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Oracle Bet — ${COMBO_ADDON.name}`,
              description: COMBO_ADDON.description,
            },
            unit_amount: Math.round(COMBO_ADDON.price * 100),
            recurring: { interval: 'month' as const },
          },
          quantity: 1,
        })
      }
    }

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: lineItems,
      metadata: {
        user_id: user.id,
        plan: planId,
        combo_addon: withComboAddon ? 'true' : 'false',
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
    // Return the raw Stripe error message — helps diagnose the real cause in production
    return NextResponse.json({ error: 'Erreur Stripe : ' + msg }, { status: 500 })
  }
}

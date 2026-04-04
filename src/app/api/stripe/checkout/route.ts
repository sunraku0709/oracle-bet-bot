import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
      || req.headers.get('origin')
      || 'http://localhost:3000'

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })

    // Check if user already has a Stripe customer ID
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: 'Oracle Bet — Abonnement Mensuel',
              description: 'Analyses IA illimitées · Football · Basketball · Tennis',
            },
            unit_amount: 2000, // 20.00 EUR
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      metadata: { user_id: user.id },
      success_url: `${baseUrl}/dashboard?success=true`,
      cancel_url: `${baseUrl}/abonnement?canceled=true`,
      allow_promotion_codes: true,
    }

    // Attach existing customer if we have one
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
        error: 'Clé Stripe invalide. Vérifiez STRIPE_SECRET_KEY dans vos variables Vercel.',
      }, { status: 500 })
    }
    return NextResponse.json({ error: 'Erreur paiement : ' + msg }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { PLANS, type PlanId } from '@/lib/plans'

/**
 * GET /api/admin/setup-stripe
 *
 * Creates (or retrieves existing) Stripe products and recurring prices for all
 * Oracle Bet plans. Safe to call multiple times — looks up by metadata before
 * creating.
 *
 * Returns a map of { planId: priceId } to paste into Vercel env vars:
 *   STRIPE_PRICE_ESSENTIAL, STRIPE_PRICE_PREMIUM, STRIPE_PRICE_UNLIMITED
 *
 * Protect this route with ADMIN_SECRET in production.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not set' }, { status: 500 })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  })

  const result: Record<string, { productId: string; priceId: string; envVar: string }> = {}

  const planIds: PlanId[] = ['essential', 'premium', 'unlimited']

  for (const planId of planIds) {
    const plan = PLANS[planId]

    // --- Find or create product ---
    const existingProducts = await stripe.products.search({
      query: `metadata['oracle_plan']:'${planId}'`,
    })

    let product: { id: string }
    if (existingProducts.data.length > 0) {
      product = existingProducts.data[0]
    } else {
      product = await stripe.products.create({
        name: `Oracle Bet — ${plan.name}`,
        description: plan.features.slice(0, 2).join(' · '),
        metadata: { oracle_plan: planId },
      })
    }

    // --- Find or create recurring price ---
    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
      recurring: { interval: 'month' },
    } as Parameters<typeof stripe.prices.list>[0])

    const existingPrice = existingPrices.data.find(
      (p) => p.unit_amount === plan.priceEur && p.currency === 'eur'
    )

    let price: { id: string }
    if (existingPrice) {
      price = existingPrice
    } else {
      price = await stripe.prices.create({
        product: product.id,
        currency: 'eur',
        unit_amount: plan.priceEur,
        recurring: { interval: 'month' },
        metadata: { oracle_plan: planId },
      })
    }

    const envVar = `STRIPE_PRICE_${planId.toUpperCase()}`
    result[planId] = { productId: product.id, priceId: price.id, envVar }
  }

  // Build the env vars block ready to paste in Vercel
  const envBlock = Object.values(result)
    .map(({ envVar, priceId }) => `${envVar}=${priceId}`)
    .join('\n')

  return NextResponse.json({
    success: true,
    plans: result,
    envVarsToPaste: envBlock,
  })
}

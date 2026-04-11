import { NextResponse } from 'next/server'

/**
 * GET /api/admin/health?secret=<ADMIN_SECRET>
 *
 * Diagnostic endpoint — checks all required env vars and tests live connections.
 * Safe to call multiple times, read-only.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  const adminSecret = process.env.ADMIN_SECRET || 'oracle-admin-2025'
  if (secret !== adminSecret) {
    return NextResponse.json({ error: 'Unauthorized — passez ?secret=<ADMIN_SECRET>' }, { status: 401 })
  }

  // ── Env var checks ──────────────────────────────────────────────────────────
  const envChecks: Record<string, { set: boolean; preview: string }> = {}

  const required = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_ESSENTIAL',
    'STRIPE_PRICE_PREMIUM',
    'STRIPE_PRICE_UNLIMITED',
    'ANTHROPIC_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_BASE_URL',
  ]

  for (const key of required) {
    const val = process.env[key]
    envChecks[key] = {
      set: !!val,
      preview: val
        ? key.startsWith('NEXT_PUBLIC_')
          ? val
          : val.slice(0, 10) + '…'
        : '(non défini)',
    }
  }

  // ── Stripe connection ───────────────────────────────────────────────────────
  let stripeStatus = 'not_tested'
  let stripeWebhookUrl = ''
  const stripeDetails: Record<string, string> = {}

  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' })

      // Test API key by listing one product
      await stripe.products.list({ limit: 1 })
      stripeStatus = 'ok'

      // Verify Price IDs exist in Stripe
      const priceEnvs: Record<string, string> = {
        STRIPE_PRICE_ESSENTIAL: process.env.STRIPE_PRICE_ESSENTIAL || '',
        STRIPE_PRICE_PREMIUM: process.env.STRIPE_PRICE_PREMIUM || '',
        STRIPE_PRICE_UNLIMITED: process.env.STRIPE_PRICE_UNLIMITED || '',
      }
      for (const [envKey, priceId] of Object.entries(priceEnvs)) {
        if (!priceId) {
          stripeDetails[envKey] = 'non défini — le checkout utilisera price_data dynamique'
          continue
        }
        try {
          const price = await stripe.prices.retrieve(priceId)
          stripeDetails[envKey] = `ok — ${price.unit_amount ? price.unit_amount / 100 : '?'}€/mois (${price.id})`
        } catch {
          stripeDetails[envKey] = `INVALIDE — price ID "${priceId}" introuvable dans Stripe`
        }
      }

      // Get registered webhook endpoints
      const webhooks = await stripe.webhookEndpoints.list({ limit: 10 })
      stripeWebhookUrl = webhooks.data.map((w) => w.url).join(', ') || '(aucun webhook configuré)'
    } catch (e) {
      stripeStatus = 'error: ' + (e instanceof Error ? e.message : String(e))
    }
  }

  // ── Supabase connection ─────────────────────────────────────────────────────
  let supabaseStatus = 'not_tested'
  const supabaseTables: Record<string, string> = {}

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )

      for (const table of ['subscriptions', 'analyses']) {
        const { error, count } = await client.from(table).select('id', { count: 'exact', head: true })
        supabaseTables[table] = error
          ? `MANQUANTE — ${error.message}`
          : `ok (${count ?? 0} ligne${(count ?? 0) > 1 ? 's' : ''})`
      }
      supabaseStatus = 'ok'
    } catch (e) {
      supabaseStatus = 'error: ' + (e instanceof Error ? e.message : String(e))
    }
  }

  // ── Anthropic key format ────────────────────────────────────────────────────
  let anthropicStatus = 'not_tested'
  if (process.env.ANTHROPIC_API_KEY) {
    const key = process.env.ANTHROPIC_API_KEY
    if (key.startsWith('sk-ant-')) {
      anthropicStatus = 'ok — format clé valide'
    } else {
      anthropicStatus = 'INVALIDE — doit commencer par sk-ant-'
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const missingCritical = required.filter((k) => !process.env[k])

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    status: missingCritical.length === 0 ? 'all_configured' : 'missing_vars',
    missingCritical,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '⚠ NON DÉFINI — doit être https://www.oracle-bet.fr',
    env: envChecks,
    connections: {
      stripe: stripeStatus,
      stripeWebhookRegistered: stripeWebhookUrl || '(non testé)',
      expectedWebhookUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.oracle-bet.fr'}/api/stripe/webhook`,
      stripePrices: stripeDetails,
      supabase: supabaseStatus,
      supabaseTables,
      anthropic: anthropicStatus,
    },
    nextSteps: missingCritical.length === 0
      ? ['Toutes les variables sont définies. Testez un paiement sur /abonnement.']
      : missingCritical.map((k) => `Ajouter ${k} dans Vercel → Settings → Environment Variables`),
  })
}

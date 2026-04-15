import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/test-account?secret=<ADMIN_SECRET>
 *
 * Creates (or resets) a test account with an active Premium subscription
 * directly in Supabase — no Stripe required.
 *
 * Body (all optional):
 *   { email?: string, password?: string }
 *
 * Defaults:
 *   email:    test@oracle-bet.app
 *   password: OracleTest2025!
 *
 * Protected by ADMIN_SECRET env var (falls back to "oracle-admin-2025").
 */
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const expectedSecret = process.env.ADMIN_SECRET || 'oracle-admin-2025'

  if (secret !== expectedSecret) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Variables Supabase manquantes' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const email = body.email || 'test@oracle-bet.app'
  const password = body.password || 'OracleTest2025!'

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Create user or fetch existing
  let userId: string

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) {
    if (createError.message.includes('already registered') || createError.message.includes('already been registered')) {
      // User exists — fetch their id and update password
      const { data: users } = await supabaseAdmin.auth.admin.listUsers()
      const existing = users?.users?.find(u => u.email === email)
      if (!existing) {
        return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 500 })
      }
      userId = existing.id
      // Reset password
      await supabaseAdmin.auth.admin.updateUserById(userId, { password, email_confirm: true })
    } else {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }
  } else {
    userId = created.user.id
  }

  // Upsert Gold active subscription (no Stripe needed, unlimited access)
  const now = new Date()
  const oneYearFromNow = new Date(now)
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)

  const { error: subError } = await supabaseAdmin.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: 'test_customer_' + userId.slice(0, 8),
    stripe_subscription_id: 'test_sub_' + userId.slice(0, 8),
    status: 'active',
    plan: 'gold',
    analyses_used: 0,
    billing_period_start: now.toISOString(),
    current_period_end: oneYearFromNow.toISOString(),
    updated_at: now.toISOString(),
  }, { onConflict: 'user_id' })

  if (subError) {
    // Table may not exist yet
    if (subError.message?.includes('relation') || subError.code === 'PGRST205' || subError.code === '42P01') {
      return NextResponse.json({
        error: 'La table subscriptions n\'existe pas encore. Visitez /setup pour créer les tables.',
        setup: true,
        userId,
      }, { status: 503 })
    }
    return NextResponse.json({ error: 'Erreur Supabase : ' + subError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Compte test Gold créé/réinitialisé avec succès (accès illimité)',
    credentials: { email, password },
    plan: 'gold',
    validUntil: oneYearFromNow.toISOString().split('T')[0],
    userId,
    nextStep: 'Connectez-vous sur /auth avec ces identifiants',
  })
}

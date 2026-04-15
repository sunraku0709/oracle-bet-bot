import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST() {
  try {
    // Authenticate via cookie session
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY non configurée' }, { status: 500 })
    }

    // Fetch subscription record (needs service-role to bypass RLS)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: sub, error: subError } = await adminClient
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (subError || !sub) {
      return NextResponse.json({ error: 'Aucun abonnement actif trouvé' }, { status: 404 })
    }

    if (!sub.stripe_subscription_id) {
      // Admin-created subscription (no Stripe) — just mark as canceled in DB
      await adminClient
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
      return NextResponse.json({ success: true, canceled: true })
    }

    // Cancel immediately in Stripe
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY.trim(), {
      apiVersion: '2024-12-18.acacia',
    })

    await stripe.subscriptions.cancel(sub.stripe_subscription_id)

    // Update Supabase (webhook will also fire, but this ensures immediate UI update)
    await adminClient
      .from('subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    return NextResponse.json({ success: true, canceled: true })
  } catch (error: unknown) {
    console.error('Cancel subscription error:', error)
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    return NextResponse.json({ error: 'Erreur : ' + msg }, { status: 500 })
  }
}

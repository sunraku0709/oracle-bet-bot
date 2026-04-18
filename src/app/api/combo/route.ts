import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { buildComboSafePrompt } from '@/lib/prompts/ultimate-bet-v2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ])
}

export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null
    let userEmail: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { createClient } = await import('@supabase/supabase-js')
      const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
      const { data } = await anon.auth.getUser(token)
      userId = data.user?.id ?? null
      userEmail = data.user?.email ?? null
    } else {
      const supabase = await createSupabaseServerClient()
      const { data } = await supabase.auth.getUser()
      userId = data.user?.id ?? null
      userEmail = data.user?.email ?? null
    }
    if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401, headers: CORS_HEADERS })

    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
    const isAdmin = userEmail !== null && ADMIN_EMAILS.includes(userEmail)

    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

    if (!isAdmin) {
      const { data: sub } = await adminClient.from('subscriptions').select('plan, status, combo_access').eq('user_id', userId).eq('status', 'active').single()
      if (!sub) return NextResponse.json({ error: 'Abonnement requis' }, { status: 403, headers: CORS_HEADERS })
      const subData = sub as { plan: string; combo_access: boolean }
      if (subData.plan !== 'premium') return NextResponse.json({ error: 'Combo reserve au plan Premium', upgrade: 'premium' }, { status: 403, headers: CORS_HEADERS })
      if (!subData.combo_access) return NextResponse.json({ error: "Activez l'option Combo du jour (+8.99€/mois)", addon: 'combo_access' }, { status: 403, headers: CORS_HEADERS })
    }

    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await adminClient.from('daily_combos').select('*').eq('date', today).single()
    if (existing) return NextResponse.json({ combo: (existing as { data: unknown }).data, cached: true }, { headers: CORS_HEADERS })

    return NextResponse.json({ error: 'Combo du jour non encore genere. Reviens dans quelques minutes.' }, { status: 404, headers: CORS_HEADERS })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'inconnue'
    return NextResponse.json({ error: 'Erreur: ' + msg }, { status: 500, headers: CORS_HEADERS })
  }
}

export async function POST(req: NextRequest) {
  try {
    const cronSecret = req.headers.get('x-cron-secret')
    if (cronSecret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Non autorise' }, { status: 401, headers: CORS_HEADERS })

    const body = await req.json() as { matches?: unknown[] }
    const { matches } = body
    if (!Array.isArray(matches) || matches.length < 3) return NextResponse.json({ error: 'Minimum 3 matches requis' }, { status: 400, headers: CORS_HEADERS })

    const today = new Date().toISOString().split('T')[0]
    const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const prompt = buildComboSafePrompt({ matches: matches as Parameters<typeof buildComboSafePrompt>[0]['matches'], date: dateStr })

    const res = await withTimeout(fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }, { role: 'assistant', content: '{' }],
      }),
    }), 30_000)

    if (!res.ok) throw new Error(`Anthropic ${res.status}`)
    const data = await res.json() as { content?: Array<{ text: string }> }
    const text = '{' + (data.content?.[0]?.text ?? '')
    const first = text.indexOf('{')
    const last = text.lastIndexOf('}')
    const combo = JSON.parse(text.slice(first, last + 1))

    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
    await adminClient.from('daily_combos').upsert({ date: today, data: combo, created_at: new Date().toISOString() })

    return NextResponse.json({ combo, generated: true }, { headers: CORS_HEADERS })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'inconnue'
    return NextResponse.json({ error: 'Erreur generation combo: ' + msg }, { status: 500, headers: CORS_HEADERS })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getPlanById, getAnalysesLimit, PLANS, type PlanId } from '@/lib/plans'
import { buildUltimateBetPrompt } from '@/lib/prompts/ultimate-bet-v2'
import crypto from 'crypto'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// Cache 30 min
const cache = new Map<string, { data: unknown; expires: number }>()
const CACHE_TTL_MS = 30 * 60 * 1000

function cacheKey(body: Record<string, unknown>): string {
  const normalized = JSON.stringify({ h: body.homeTeam, a: body.awayTeam, s: body.sport, d: body.matchDate, oh: body.oddsHome, od: body.oddsDraw, oa: body.oddsAway })
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

// Rate limit 10/min
const rateLimits = new Map<string, number[]>()
function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const timestamps = (rateLimits.get(userId) || []).filter(t => now - t < 60_000)
  if (timestamps.length >= 10) return false
  timestamps.push(now)
  rateLimits.set(userId, timestamps)
  return true
}

function parseAnalysis(text: string): Record<string, unknown> | null {
  try {
    const first = text.indexOf('{')
    const last = text.lastIndexOf('}')
    if (first === -1 || last <= first) return null
    const raw = JSON.parse(text.slice(first, last + 1)) as Record<string, unknown>
    if (!raw.classification || !Array.isArray(raw.sections) || !raw.verdict) return null
    if (!['GOLD', 'SILVER', 'NO BET'].includes(raw.classification as string)) return null
    const verdict = raw.verdict as Record<string, unknown>
    if (!verdict.bet || (verdict.bet as string).trim() === '') {
      verdict.bet = 'Double chance favori - pari de repli safe'
    }
    return raw
  } catch { return null }
}

function buildConsensus(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const scoreA = a.score as number
  const scoreB = b.score as number
  const scoreDiff = Math.abs(scoreA - scoreB)
  if (scoreDiff > 20) {
    const lowest = scoreA < scoreB ? a : b
    const lowestVerdict = lowest.verdict as Record<string, unknown>
    return {
      ...lowest,
      classification: 'NO BET',
      score: Math.min(scoreA, scoreB, 55),
      confidence_level: 'LOW',
      verdict: {
        ...lowestVerdict,
        bet: lowestVerdict.bet || 'Double chance favori - pari de repli safe',
        stake_suggestion: '0.5%',
        reasoning_chain: `Divergence ${scoreDiff} pts entre IA. Repli safe recommande.`,
      },
    }
  }
  const conservative = scoreA <= scoreB ? a : b
  const conservativeVerdict = conservative.verdict as Record<string, unknown>
  const aEst = a.probabilities_estimated as Record<string, number>
  const bEst = b.probabilities_estimated as Record<string, number>
  const homeAvg = Math.round((aEst.home_pct + bEst.home_pct) / 2)
  const drawAvg = Math.round((aEst.draw_pct + bEst.draw_pct) / 2)
  return {
    ...conservative,
    probabilities_estimated: {
      home_pct: homeAvg, draw_pct: drawAvg, away_pct: 100 - homeAvg - drawAvg,
      reliability_pct: Math.min(aEst.reliability_pct, bEst.reliability_pct),
    },
    verdict: { ...conservativeVerdict, reasoning_chain: `Consensus 2 IA (ecart ${scoreDiff}pts). ${conservativeVerdict.reasoning_chain}` },
  }
}

async function callClaudeFast(prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 3500,
      messages: [{ role: 'user', content: prompt }, { role: 'assistant', content: '{' }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json() as { content?: Array<{ text: string }> }
  return '{' + (data.content?.[0]?.text ?? '')
}

async function callDeepSeekFast(prompt: string): Promise<string> {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3500,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`)
  const data = await res.json() as { choices?: Array<{ message: { content: string } }> }
  return data.choices?.[0]?.message?.content ?? ''
}

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null
    let userEmail: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { createClient } = await import('@supabase/supabase-js')
      const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
      const { data } = await anonClient.auth.getUser(token)
      userId = data.user?.id ?? null
      userEmail = data.user?.email ?? null
    } else {
      const supabase = await createSupabaseServerClient()
      const { data } = await supabase.auth.getUser()
      userId = data.user?.id ?? null
      userEmail = data.user?.email ?? null
    }
    if (!userId) return NextResponse.json({ error: 'Non authentifie' }, { status: 401, headers: CORS_HEADERS })
    if (!checkRateLimit(userId)) return NextResponse.json({ error: 'Trop de requetes. Reessaie dans 1 min.' }, { status: 429, headers: CORS_HEADERS })

    const isAdmin = userEmail !== null && ADMIN_EMAILS.includes(userEmail)
    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

    let planId: PlanId = 'gold'
    let limit: number | null = null
    let usedToday = 0
    let subUsed = 0

    if (!isAdmin) {
      const { data: sub, error: subErr } = await adminClient.from('subscriptions').select('status, plan, analyses_used').eq('user_id', userId).eq('status', 'active').single()
      if (subErr || !sub) return NextResponse.json({ error: 'Abonnement requis' }, { status: 403, headers: CORS_HEADERS })
      planId = getPlanById((sub as { plan: string }).plan)
      limit = getAnalysesLimit(planId)
      subUsed = (sub as { analyses_used?: number }).analyses_used || 0
      if (limit !== null) {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const { count } = await adminClient.from('analyses').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', todayStart.toISOString())
        usedToday = count ?? 0
        if (usedToday >= limit) return NextResponse.json({ error: `Limite atteinte (${limit}/jour)`, limitReached: true, used: usedToday, limit, plan: planId }, { status: 403, headers: CORS_HEADERS })
      }
    }

    const body = await req.json() as Record<string, string>
    const { homeTeam, awayTeam, sport, competition, matchDate, oddsHome, oddsDraw, oddsAway, realTimeData } = body
    if (!homeTeam?.trim() || !awayTeam?.trim() || !sport) return NextResponse.json({ error: 'Equipes et sport requis' }, { status: 400, headers: CORS_HEADERS })
    if (!process.env.DEEPSEEK_API_KEY || !process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'API keys manquantes' }, { status: 500, headers: CORS_HEADERS })

    const key = cacheKey(body)
    const cached = cache.get(key)
    if (cached && cached.expires > Date.now()) return NextResponse.json({ result: JSON.stringify(cached.data), remaining: limit === null ? null : limit - usedToday, plan: planId, cached: true }, { headers: CORS_HEADERS })

    const dateStr = matchDate ? new Date(matchDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const prompt = buildUltimateBetPrompt({ homeTeam, awayTeam, sport, competition: competition || sport, matchDate: dateStr, oddsHome, oddsDraw, oddsAway, realTimeData })

    const [deepseekRes, claudeRes] = await Promise.allSettled([
      callDeepSeekFast(prompt),
      callClaudeFast(prompt),
    ])

    const deepseekText = deepseekRes.status === 'fulfilled' ? deepseekRes.value : ''
    const claudeText = claudeRes.status === 'fulfilled' ? claudeRes.value : ''

    const a = parseAnalysis(deepseekText)
    const b = parseAnalysis(claudeText)

    if (!a && !b) return NextResponse.json({ error: 'IA non disponible, reessaie dans quelques secondes' }, { status: 503, headers: CORS_HEADERS })

    let merged = a && b ? buildConsensus(a, b) : (a ?? b)!
    const mergedScore = merged.score as number
    if (mergedScore < 70) merged.classification = 'NO BET'
    else if (mergedScore < 85) merged.classification = 'SILVER'
    else merged.classification = 'GOLD'

    const mergedVerdict = merged.verdict as Record<string, unknown>
    if (!mergedVerdict.bet || (mergedVerdict.bet as string).trim() === '') {
      mergedVerdict.bet = 'Double chance favori - pari de repli safe'
    }

    cache.set(key, { data: merged, expires: Date.now() + CACHE_TTL_MS })

    const result = JSON.stringify(merged)
    const record = {
      user_id: userId, home_team: homeTeam.trim(), away_team: awayTeam.trim(), sport,
      competition: competition || sport, match_date: matchDate || new Date().toISOString().split('T')[0],
      odds_home: oddsHome || null, odds_draw: oddsDraw || null, odds_away: oddsAway || null, result,
      classification: merged.classification as string, score: merged.score as number,
      predicted_bet: mergedVerdict.bet as string, predicted_odds: (mergedVerdict.odds as string) ?? null,
      edge_pct: (mergedVerdict.edge_pct as number) ?? null, actual_result: null, bet_won: null,
    }

    if (isAdmin) {
      await adminClient.from('analyses').insert(record)
    } else {
      await Promise.all([
        adminClient.from('subscriptions').update({ analyses_used: subUsed + 1, updated_at: new Date().toISOString() }).eq('user_id', userId),
        adminClient.from('analyses').insert(record),
      ])
    }

    return NextResponse.json({ result, remaining: limit === null ? null : limit - usedToday - 1, plan: planId }, { headers: CORS_HEADERS })
  } catch (error: unknown) {
    console.error('Analyze error:', error)
    const msg = error instanceof Error ? error.message : 'inconnue'
    return NextResponse.json({ error: 'Erreur serveur: ' + msg }, { status: 500, headers: CORS_HEADERS })
  }
}

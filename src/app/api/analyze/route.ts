import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getPlanById, getAnalysesLimit, PLANS } from '@/lib/plans'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(req: NextRequest) {
try {
// Support both cookie-based sessions (web) and Bearer token (mobile)
let user = null
const authHeader = req.headers.get('Authorization')
if (authHeader?.startsWith('Bearer ')) {
const token = authHeader.slice(7)
const { createClient } = await import('@supabase/supabase-js')
const anonClient = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
{ auth: { autoRefreshToken: false, persistSession: false } }
)
const { data } = await anonClient.auth.getUser(token)
user = data.user
} else {
const supabase = await createSupabaseServerClient()
const { data } = await supabase.auth.getUser()
user = data.user
}

if (!user) {
return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
}

const { data: subscription, error: subError } = await supabase
.from('subscriptions')
.select('status, plan, analyses_used, billing_period_start, current_period_end')
.eq('user_id', user.id)
.eq('status', 'active')
.single()

if (subError) {
if (subError.message?.includes('relation') || subError.code === 'PGRST205') {
return NextResponse.json({
error: 'Base de données non initialisée. Visitez /setup pour configurer les tables.',
setup: true,
}, { status: 503 })
}
return NextResponse.json({ error: 'Abonnement requis' }, { status: 403 })
}

if (!subscription) {
return NextResponse.json({ error: 'Abonnement requis' }, { status: 403 })
}

const planId = getPlanById(subscription.plan)
const limit = getAnalysesLimit(planId)

let usedToday = 0
if (limit !== null) {
const todayStart = new Date()
todayStart.setHours(0, 0, 0, 0)

const { count, error: countError } = await supabase
.from('analyses')
.select('id', { count: 'exact', head: true })
.eq('user_id', user.id)
.gte('created_at', todayStart.toISOString())

if (!countError) usedToday = count ?? 0

if (usedToday >= limit) {
const planName = PLANS[planId].name
return NextResponse.json({
error: `Limite atteinte pour votre plan ${planName} (${limit} analyse${limit > 1 ? 's' : ''}/jour). Passez au plan supérieur pour continuer.`,
limitReached: true,
used: usedToday,
limit,
plan: planId,
}, { status: 403 })
}
}

const body = await req.json()
const { homeTeam, awayTeam, sport, competition, matchDate, oddsHome, oddsDraw, oddsAway } = body

if (!homeTeam?.trim() || !awayTeam?.trim() || !sport) {
return NextResponse.json({ error: 'Équipe domicile, équipe extérieure et sport sont requis' }, { status: 400 })
}

if (!process.env.ANTHROPIC_API_KEY) {
return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configurée' }, { status: 500 })
}

const oddsSection = (oddsHome || oddsDraw || oddsAway)
? `COTES EN TEMPS REEL (Bet365 | Unibet) : Domicile ${oddsHome || 'N/A'} / Nul ${oddsDraw || 'N/A'} / Extérieur ${oddsAway || 'N/A'}`
: 'COTES EN TEMPS REEL : Non renseignées'

const dateStr = matchDate
? new Date(matchDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const prompt = `Tu es Team Oracle Bet, assistant d'analyse sportive ultra-structuré et pronostiqueur expert.
Fiabilité minimum : 65%.

MATCH : ${homeTeam} vs ${awayTeam}
COMPETITION : ${competition || sport}
DATE : ${dateStr}
${oddsSection}

STRUCTURE OBLIGATOIRE :

1. FORME RECENTE (5 à 10 derniers matchs)
- Résultats + performances globales
- Tendances : progression / stagnation / chute
- Stats clés : xG, xGA, occasions créées, buts marqués/encaissés

2. H2H
- Dynamiques significatives uniquement
- Si aucune tendance claire : Aucune tendance H2H exploitable

3. STYLE DE JEU + FORCES ET FAIBLESSES
- Système tactique principal
- Points forts / Points faibles

4. ABSENCES ET IMPACT REEL
- Blessés / suspendus / incertains
- Si inconnu : Aucune source fiable disponible

5. CALENDRIER ET CONTEXTE PHYSIQUE
- Charge des matchs récents
- Risques de rotation, fatigue probable

6. ENJEUX DU MATCH
- Classement et objectifs
- Niveau de motivation

7. DECLARATIONS ENTRAINEURS
- Infos concrètes uniquement
- Si absent : Aucune source fiable disponible

8. STATISTIQUES AVANCEES
- xG moyen, xGA moyen, tirs cadrés par match, clean sheets

9. RED FLAGS
- Match sans enjeu, rotation prévisible, fatigue, tensions internes

10. SYNTHESE FINALE + PRONOSTIC
- 4 à 6 éléments décisifs
- Probabilité estimée % pour chaque option (victoire domicile / nul / victoire extérieure)
- VALUE BET : oui ou non (justifié par rapport aux cotes si disponibles)
- TOP 3 paris par ordre de préférence avec justification
- Classification : GOLD (75%+) / SILVER (65-74%) / NO BET

RÈGLES ABSOLUES :
- Zéro blabla, zéro supposition non justifiée
- Données et raisonnement structuré uniquement
- Si info absente : indiquer "Aucune source fiable disponible"
- Rapport entre 800 et 1200 mots`

const Anthropic = (await import('@anthropic-ai/sdk')).default
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const message = await client.messages.create({
model: 'claude-sonnet-4-5',
max_tokens: 2048,
messages: [{ role: 'user', content: prompt }],
})

const result = message.content[0].type === 'text' ? message.content[0].text : ''

if (!result) {
return NextResponse.json({ error: "L'IA n'a pas retourné de résultat" }, { status: 500 })
}

const adminClient = (await import('@supabase/supabase-js')).createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.SUPABASE_SERVICE_ROLE_KEY!,
{ auth: { autoRefreshToken: false, persistSession: false } }
)

await Promise.all([
adminClient.from('subscriptions')
.update({ analyses_used: (subscription.analyses_used || 0) + 1, updated_at: new Date().toISOString() })
.eq('user_id', user.id),
adminClient.from('analyses').insert({
user_id: user.id,
home_team: homeTeam.trim(),
away_team: awayTeam.trim(),
sport,
competition: competition || sport,
match_date: matchDate || new Date().toISOString().split('T')[0],
odds_home: oddsHome || null,
odds_draw: oddsDraw || null,
odds_away: oddsAway || null,
result,
}),
])

const remaining = limit === null ? null : limit - usedToday - 1

const corsHeaders = { 'Access-Control-Allow-Origin': '*' }
return NextResponse.json({ result, remaining, plan: planId }, { headers: corsHeaders })
} catch (error: unknown) {
console.error('Analyze error:', error)
const msg = error instanceof Error ? error.message : 'Erreur inconnue'
const corsHeaders = { 'Access-Control-Allow-Origin': '*' }
if (msg.includes('API_KEY') || msg.includes('API key')) {
return NextResponse.json({ error: 'Clé ANTHROPIC_API_KEY invalide ou non configurée' }, { status: 500, headers: corsHeaders })
}
return NextResponse.json({ error: 'Erreur serveur : ' + msg }, { status: 500, headers: corsHeaders })
}
}

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getPlanById, getAnalysesLimit, PLANS, type PlanId } from '@/lib/plans'

export const runtime = 'nodejs'
export const maxDuration = 60

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(req: NextRequest) {
  try {
    // Resolve the authenticated user — supports both:
    //   • Cookie session  (web browser)
    //   • Bearer token    (mobile app)
    let userId: string | null = null
    let userEmail: string | null = null
    const authHeader = req.headers.get('Authorization')

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { createClient } = await import('@supabase/supabase-js')
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
      const { data } = await anonClient.auth.getUser(token)
      userId = data.user?.id ?? null
      userEmail = data.user?.email ?? null
    } else {
      const supabase = await createSupabaseServerClient()
      const { data } = await supabase.auth.getUser()
      userId = data.user?.id ?? null
      userEmail = data.user?.email ?? null
    }

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401, headers: CORS_HEADERS })
    }

    // Admin bypass — unlimited access regardless of subscription
    const ADMIN_EMAILS = ['test@oracle-bet.app', 'admin@oracle-bet.com']
    const isAdminUser = userEmail !== null && ADMIN_EMAILS.includes(userEmail)

    // All DB reads/writes use the service-role client (bypasses RLS, works for both auth paths)
    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    let planId: PlanId = 'gold'
    let limit: number | null = null
    let usedToday = 0
    let subscriptionAnalysesUsed = 0

    if (!isAdminUser) {
      const { data: subscription, error: subError } = await adminClient
        .from('subscriptions')
        .select('status, plan, analyses_used, billing_period_start, current_period_end')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (subError) {
        if (subError.message?.includes('relation') || subError.code === 'PGRST205') {
          return NextResponse.json(
            { error: 'Base de données non initialisée. Visitez /setup pour configurer les tables.', setup: true },
            { status: 503, headers: CORS_HEADERS },
          )
        }
        return NextResponse.json({ error: 'Abonnement requis' }, { status: 403, headers: CORS_HEADERS })
      }

      if (!subscription) {
        return NextResponse.json({ error: 'Abonnement requis' }, { status: 403, headers: CORS_HEADERS })
      }

      planId = getPlanById(subscription.plan)
      limit = getAnalysesLimit(planId)
      subscriptionAnalysesUsed = subscription.analyses_used || 0

      if (limit !== null) {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const { count, error: countError } = await adminClient
          .from('analyses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', todayStart.toISOString())

        if (!countError) usedToday = count ?? 0

        if (usedToday >= limit) {
          const planName = PLANS[planId].name
          return NextResponse.json(
            {
              error: `Limite atteinte pour votre plan ${planName} (${limit} analyse${limit > 1 ? 's' : ''}/jour). Passez au plan supérieur pour continuer.`,
              limitReached: true,
              used: usedToday,
              limit,
              plan: planId,
            },
            { status: 403, headers: CORS_HEADERS },
          )
        }
      }
    }

    const body = await req.json()
    const { homeTeam, awayTeam, sport, competition, matchDate, oddsHome, oddsDraw, oddsAway } = body

    if (!homeTeam?.trim() || !awayTeam?.trim() || !sport) {
      return NextResponse.json(
        { error: 'Équipe domicile, équipe extérieure et sport sont requis' },
        { status: 400, headers: CORS_HEADERS },
      )
    }

    // Sanitize API key: strip non-ASCII characters that break ByteString headers
    const apiKey = (process.env.DEEPSEEK_API_KEY || '').replace(/[^\x20-\x7E]/g, '').trim()

    if (!apiKey) {
      return NextResponse.json({ error: 'DEEPSEEK_API_KEY non configurée' }, { status: 500, headers: CORS_HEADERS })
    }

    // TEMP debug: key length + first 8 chars (remove after verification)
    console.log(`[analyze] DEEPSEEK_API_KEY length=${apiKey.length} prefix=${apiKey.slice(0, 8)}`)

    const oddsSection = (oddsHome || oddsDraw || oddsAway)
      ? `COTES EN TEMPS REEL (Bet365 | Unibet) : Domicile ${oddsHome || 'N/A'} / Nul ${oddsDraw || 'N/A'} / Extérieur ${oddsAway || 'N/A'}`
      : 'COTES EN TEMPS REEL : Non renseignées'

    const dateStr = matchDate
      ? new Date(matchDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    const prompt = `PROMPT Team Soccer Bet - Analyse de match ultra-structurée

Objectif : Tu es mon assistant d'analyse et pronostiqueur. Tu collectes, filtres et structures toutes les informations pertinentes pour analyser un match de football. Tu pronos avec un taux de réussite entre 60 à 75%.

Match à analyser : ${homeTeam} vs ${awayTeam} - ${competition} – ${matchDate}

Structure du rapport attendu (obligatoire)

1. Forme récente (5 à 10 derniers matchs)
- Résultats + performances globales
- Tendances : progression / stagnation / chute
- Statistiques clés : xG, xGA, occasions créées, buts marqués/encaissés
- Lecture factuelle de la dynamique réelle

2. Confrontations directes (H2H pertinent)
Ne fais jamais de H2H basique.
Analyse uniquement :
- les dynamiques réellement significatives
- les renversements de tendance
- les éléments récurrents d'un match à l'autre

3. Style de jeu + forces & faiblesses
Pour chaque équipe :
- Système tactique principal
- Tendances : pressing, bloc, transitions, ailes, jeu axial, jeu aérien
- Points forts
- Points faibles
- Zones ou phases qui peuvent réellement peser sur le match

4. Absences, effectifs & impact réel
- Joueurs blessés / suspendus / incertains
- Impact réel (pas une simple liste) : titulaire clé ? remplaçant important ? poste non doublé ?
- Compositions probables si disponibles et fiables
Fiabilité : ✅ confirmé / ⚠️ probable / ❓ à confirmer

5. Calendrier & contexte physique
- Charge des matchs récents et à venir
- Déplacements compliqués
- Match européen avant/après
- Risques de rotation
- Fatigue probable
- Mentionne uniquement les données de la saison en cours

6. Enjeux du match
- Situation au classement
- Objectifs : titre, Europe, maintien, derby, match charnière
- Niveau de motivation / pression attendue

7. Déclarations d'entraîneurs
- Extrais uniquement les informations concrètes (composition, stratégie, état d'esprit, blessures évoquées, objectifs annoncés)
- Ignore toute déclaration vague ou sans valeur analytique
- Cite systématiquement la source (presse, conférence, média fiable)

8. Statistiques avancées clés
- xG / xGA
- Tirs cadrés / occasions franches
- Possession utile
- Duels gagnés
- Clean sheets / buts concédés
Analyse uniquement ce qui peut faire basculer la rencontre

9. Red flags à vérifier absolument
Indique clairement si l'un de ces points est présent :
- Match sans enjeu réel
- Dynamique instable ou incohérente
- Rotation probable
- Gros match juste avant ou juste après
- Conflits internes / tensions
- Baisse de forme non expliquée
- Contexte externe (fatigue, climat, pression médiatique)

10. Synthèse finale (avec prono)
- 4 à 6 éléments décisifs
- Ce qui peut réellement influencer l'issue
- Facteurs à surveiller de près
- Pronostic final avec taux de fiabilité de 60% à 75%

RÈGLES DE STYLE (OBLIGATOIRES) :
- Ton factuel, neutre et professionnel
- Pas de narration ni interprétation émotionnelle
- Pas de phrases vagues ou narratives
- Pas de supposition
- Pas de formulation directe, indirecte ou implicite non factuelle

Exemples interdits :
"Ils voudront se rattraper…"
"On peut imaginer que…"
"Cette équipe pourrait être dangereuse…"

Si une info est absente : "Aucune source fiable disponible sur ce point."

PRIORITÉS D'ANALYSE (dans cet ordre) :
1. Absences clés
2. État physique / calendrier
3. Contexte & enjeux réels
4. Statistiques avancées
5. Style / tactique / dynamiques

FIABILITÉ DES SOURCES (exigée) :
Utilise uniquement des sources reconnues : presse sportive de référence, sites statistiques établis, organismes officiels, conférences de presse, déclarations validées.
Ignore tout contenu provenant de sites peu connus, non vérifiés, non spécialisés.
Si une donnée provient d'une source douteuse : "Aucune source fiable disponible pour confirmer cette information."

FORMAT :
- Rapport attendu : 800 à 1200 mots
- Priorité : pertinence > exhaustivité
- Indique le degré de certitude : confirmé / probable / rumeur`

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.3,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`DeepSeek API error ${response.status}: ${errText}`)
    }

    const data = await response.json()
    const analysisText: string = data.choices?.[0]?.message?.content ?? ''

    type AP = {
      classification: 'GOLD' | 'SILVER' | 'NO BET'
      score: number
      probabilities: {
        home: { pct: number; odds: string | null }
        draw: { pct: number; odds: string | null }
        away: { pct: number; odds: string | null }
      }
      sections: { n: number; title: string; content: string }[]
      verdict: {
        bet: string; odds: string | null; edge_pct: number | null
        value_bet: boolean; top_bets: string[]
      }
    }

    const parseAP = (text: string): AP | null => {
      try {
        const first = text.indexOf('{')
        const last = text.lastIndexOf('}')
        if (first === -1 || last <= first) return null
        const d = JSON.parse(text.slice(first, last + 1)) as AP
        if (!d.classification || !Array.isArray(d.sections) || !d.verdict) return null
        return d
      } catch { return null }
    }

    const merged = parseAP(analysisText)

    if (!merged) {
      return NextResponse.json({ error: "L'IA n'a pas retourné de résultat valide" }, { status: 500, headers: CORS_HEADERS })
    }

    const result = JSON.stringify(merged)

    const analysisRecord = {
      user_id: userId,
      home_team: homeTeam.trim(),
      away_team: awayTeam.trim(),
      sport,
      competition: competition || sport,
      match_date: matchDate || new Date().toISOString().split('T')[0],
      odds_home: oddsHome || null,
      odds_draw: oddsDraw || null,
      odds_away: oddsAway || null,
      result,
    }

    if (isAdminUser) {
      await adminClient.from('analyses').insert(analysisRecord)
    } else {
      await Promise.all([
        adminClient
          .from('subscriptions')
          .update({ analyses_used: subscriptionAnalysesUsed + 1, updated_at: new Date().toISOString() })
          .eq('user_id', userId),
        adminClient.from('analyses').insert(analysisRecord),
      ])
    }

    const remaining = limit === null ? null : limit - usedToday - 1

    return NextResponse.json({ result, remaining, plan: planId }, { headers: CORS_HEADERS })
  } catch (error: unknown) {
    console.error('Analyze error:', error)
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    if (msg.includes('API_KEY') || msg.includes('API key')) {
      return NextResponse.json(
        { error: 'Clé API invalide ou non configurée (DEEPSEEK_API_KEY)' },
        { status: 500, headers: CORS_HEADERS },
      )
    }
    return NextResponse.json({ error: 'Erreur serveur : ' + msg }, { status: 500, headers: CORS_HEADERS })
  }
}

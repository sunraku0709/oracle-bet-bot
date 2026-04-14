import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getPlanById, getAnalysesLimit, PLANS } from '@/lib/plans'

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
    } else {
      const supabase = await createSupabaseServerClient()
      const { data } = await supabase.auth.getUser()
      userId = data.user?.id ?? null
    }

    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401, headers: CORS_HEADERS })
    }

    // All DB reads/writes use the service-role client (bypasses RLS, works for both auth paths)
    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

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

    const planId = getPlanById(subscription.plan)
    const limit = getAnalysesLimit(planId)

    let usedToday = 0
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

    const body = await req.json()
    const { homeTeam, awayTeam, sport, competition, matchDate, oddsHome, oddsDraw, oddsAway } = body

    if (!homeTeam?.trim() || !awayTeam?.trim() || !sport) {
      return NextResponse.json(
        { error: 'Équipe domicile, équipe extérieure et sport sont requis' },
        { status: 400, headers: CORS_HEADERS },
      )
    }

    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: 'DEEPSEEK_API_KEY non configurée' }, { status: 500, headers: CORS_HEADERS })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configurée' }, { status: 500, headers: CORS_HEADERS })
    }

    const oddsSection = (oddsHome || oddsDraw || oddsAway)
      ? `COTES EN TEMPS REEL (Bet365 | Unibet) : Domicile ${oddsHome || 'N/A'} / Nul ${oddsDraw || 'N/A'} / Extérieur ${oddsAway || 'N/A'}`
      : 'COTES EN TEMPS REEL : Non renseignées'

    const dateStr = matchDate
      ? new Date(matchDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    const prompt = `Tu es Team Oracle Bet, assistant d'analyse sportive ultra-structuré et pronostiqueur expert.
Fiabilite minimum : 65%.

MATCH : ${homeTeam} vs ${awayTeam}
COMPETITION : ${competition || sport}
DATE : ${dateStr}
${oddsSection}

Retourne UNIQUEMENT un objet JSON valide (sans texte avant ni apres, sans backticks, sans markdown).
Schema obligatoire :
{
  "classification": "GOLD" | "SILVER" | "NO BET",
  "score": <entier 0-100 reflétant la confiance globale>,
  "probabilities": {
    "home": { "pct": <entier>, "odds": "<cote string ou null>" },
    "draw": { "pct": <entier>, "odds": "<cote string ou null>" },
    "away": { "pct": <entier>, "odds": "<cote string ou null>" }
  },
  "sections": [
    { "n": 1, "title": "FORME RECENTE", "content": "<analyse 80-150 mots, bullet points avec prefix - >" },
    { "n": 2, "title": "H2H", "content": "<analyse>" },
    { "n": 3, "title": "STYLE DE JEU ET FORCES FAIBLESSES", "content": "<analyse>" },
    { "n": 4, "title": "ABSENCES ET IMPACT REEL", "content": "<analyse>" },
    { "n": 5, "title": "CALENDRIER ET CONTEXTE PHYSIQUE", "content": "<analyse>" },
    { "n": 6, "title": "ENJEUX DU MATCH", "content": "<analyse>" },
    { "n": 7, "title": "DECLARATIONS ENTRAINEURS", "content": "<analyse>" },
    { "n": 8, "title": "STATISTIQUES AVANCEES", "content": "<analyse>" },
    { "n": 9, "title": "RED FLAGS", "content": "<analyse>" },
    { "n": 10, "title": "SYNTHESE FINALE", "content": "<synthese 100-200 mots avec elements decisifs>" }
  ],
  "verdict": {
    "bet": "<paris principal recommande, ex: Victoire Domicile (1), Double chance 1X, Plus de 2.5 buts>",
    "odds": "<cote string ou null>",
    "edge_pct": <entier ou null>,
    "value_bet": <true|false>,
    "top_bets": ["<paris 1 avec justification>", "<paris 2>", "<paris 3>"]
  }
}

Regles :
- classification = GOLD si confiance 75%+, SILVER si 65-74%, NO BET sinon
- score = entier 0-100 (GOLD >= 75, SILVER 65-74, NO BET < 65)
- probabilities : home.pct + draw.pct + away.pct = 100
- odds dans probabilities : reprendre les cotes renseignees si disponibles, sinon null
- sections[].content : minimum 80 mots, bullet points avec "- " prefix pour les elements, zéro supposition non justifiée
- Si info absente : ecrire "Aucune source fiable disponible"
- Retourne UNIQUEMENT le JSON brut, sans introduction ni conclusion`

    // Run both AI calls in parallel
    const [deepseekRes, claudeRes] = await Promise.all([
      fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 800,
        }),
      }),
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 800,
          messages: [{ role: 'user', content: prompt }],
        }),
      }),
    ])

    if (!deepseekRes.ok) {
      const errText = await deepseekRes.text()
      throw new Error(`DeepSeek API error ${deepseekRes.status}: ${errText}`)
    }

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      throw new Error(`Anthropic API error ${claudeRes.status}: ${errText}`)
    }

    const [deepseekData, claudeData] = await Promise.all([
      deepseekRes.json(),
      claudeRes.json(),
    ])

    const deepseekAnalysis: string = deepseekData.choices?.[0]?.message?.content ?? ''
    const claudeAnalysis: string = claudeData.content?.[0]?.text ?? ''

    if (!deepseekAnalysis || !claudeAnalysis) {
      return NextResponse.json({ error: "L'IA n'a pas retourné de résultat" }, { status: 500, headers: CORS_HEADERS })
    }

    // Fusion: synthesise both analyses into a final verdict via DeepSeek
    const fusionPrompt = `Expert analyse sportive. Fusionne ces 2 analyses en JSON brut uniquement (pas de backticks).

A1:${deepseekAnalysis}

A2:${claudeAnalysis}

JSON obligatoire:
{"classification":"GOLD"|"SILVER"|"NO BET","score":<0-100>,"probabilities":{"home":{"pct":<n>,"odds":<str|null>},"draw":{"pct":<n>,"odds":<str|null>},"away":{"pct":<n>,"odds":<str|null>}},"sections":[{"n":1,"title":"FORME RECENTE","content":"<50-80 mots>"},{"n":2,"title":"H2H","content":"<>"},{"n":3,"title":"STYLE DE JEU ET FORCES FAIBLESSES","content":"<>"},{"n":4,"title":"ABSENCES ET IMPACT REEL","content":"<>"},{"n":5,"title":"CALENDRIER ET CONTEXTE PHYSIQUE","content":"<>"},{"n":6,"title":"ENJEUX DU MATCH","content":"<>"},{"n":7,"title":"DECLARATIONS ENTRAINEURS","content":"<>"},{"n":8,"title":"STATISTIQUES AVANCEES","content":"<>"},{"n":9,"title":"RED FLAGS","content":"<divergences entre A1 et A2>"},{"n":10,"title":"SYNTHESE FINALE","content":"<accords=haute fiabilite, divergences=incertitude, verdict consolide>"}],"verdict":{"bet":"<paris>","odds":<str|null>,"edge_pct":<n|null>,"value_bet":<bool>,"top_bets":["<p1>","<p2>","<p3>"]}}
Regles: GOLD>=75, SILVER 65-74, sinon NO BET. home.pct+draw.pct+away.pct=100.`

    const fusionRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: fusionPrompt }],
        max_tokens: 1000,
      }),
    })

    if (!fusionRes.ok) {
      const errText = await fusionRes.text()
      throw new Error(`DeepSeek fusion API error ${fusionRes.status}: ${errText}`)
    }

    const fusionData = await fusionRes.json()
    const raw: string = fusionData.choices?.[0]?.message?.content ?? ''

    if (!raw) {
      return NextResponse.json({ error: "La fusion IA n'a pas retourné de résultat" }, { status: 500, headers: CORS_HEADERS })
    }

    // Strip potential markdown fences
    const result = raw
      .replace(/^```json\s*/m, '')
      .replace(/^```\s*/m, '')
      .replace(/```\s*$/m, '')
      .trim()

    await Promise.all([
      adminClient
        .from('subscriptions')
        .update({ analyses_used: (subscription.analyses_used || 0) + 1, updated_at: new Date().toISOString() })
        .eq('user_id', userId),
      adminClient.from('analyses').insert({
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
      }),
    ])

    const remaining = limit === null ? null : limit - usedToday - 1

    return NextResponse.json({ result, remaining, plan: planId }, { headers: CORS_HEADERS })
  } catch (error: unknown) {
    console.error('Analyze error:', error)
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    if (msg.includes('API_KEY') || msg.includes('API key')) {
      return NextResponse.json(
        { error: 'Clé API invalide ou non configurée (DEEPSEEK_API_KEY / ANTHROPIC_API_KEY)' },
        { status: 500, headers: CORS_HEADERS },
      )
    }
    return NextResponse.json({ error: 'Erreur serveur : ' + msg }, { status: 500, headers: CORS_HEADERS })
  }
}

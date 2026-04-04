import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Check active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Abonnement requis' }, { status: 403 })
    }

    const body = await req.json()
    const { homeTeam, awayTeam, sport, competition, matchDate, oddsHome, oddsDraw, oddsAway } = body

    if (!homeTeam?.trim() || !awayTeam?.trim() || !sport) {
      return NextResponse.json({ error: 'Équipe domicile, équipe extérieure et sport sont requis' }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'GEMINI_API_KEY non configurée' }, { status: 500 })
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

    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
      },
    })

    const geminiResult = await model.generateContent(prompt)
    const result = geminiResult.response.text()

    if (!result) {
      return NextResponse.json({ error: 'L\'IA n\'a pas retourné de résultat' }, { status: 500 })
    }

    // Save to database (best-effort – don't fail the request if save fails)
    await supabase.from('analyses').insert({
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
    }).then(({ error }) => {
      if (error) console.error('Save analysis error:', error.message)
    })

    return NextResponse.json({ result })
  } catch (error: unknown) {
    console.error('Analyze error:', error)
    const msg = error instanceof Error ? error.message : 'Erreur inconnue'
    if (msg.includes('API_KEY') || msg.includes('API key')) {
      return NextResponse.json({ error: 'Clé GEMINI_API_KEY invalide ou non configurée' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Erreur serveur : ' + msg }, { status: 500 })
  }
}

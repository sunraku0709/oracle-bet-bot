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
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!subscription) {
      return NextResponse.json({ error: 'Abonnement requis' }, { status: 403 })
    }

    const { homeTeam, awayTeam, sport, competition, matchDate, oddsHome, oddsDraw, oddsAway } = await req.json()

    if (!homeTeam || !awayTeam || !sport) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const oddsSection = (oddsHome || oddsDraw || oddsAway)
      ? `COTES EN TEMPS REEL (Bet365 | Unibet) : ${oddsHome || 'N/A'} / ${oddsDraw || 'N/A'} / ${oddsAway || 'N/A'}`
      : 'COTES EN TEMPS REEL : Non renseignées'

    const prompt = `Tu es Team Oracle Bet, assistant d'analyse sportive ultra-structuré et pronostiqueur expert.
Fiabilité minimum : 65%.

MATCH : ${homeTeam} vs ${awayTeam}
COMPETITION : ${competition || sport}
DATE : ${matchDate || new Date().toLocaleDateString('fr-FR')}
${oddsSection}

STRUCTURE OBLIGATOIRE :

1. FORME RECENTE (5 à 10 derniers matchs)
- Résultats + performances globales
- Tendances : progression / stagnation / chute
- Stats clés : xG, xGA, occasions créées, buts marqués/encaissés

2. H2H
- Dynamiques significatives uniquement
- Si aucune tendance : Aucune tendance H2H exploitable

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
- xG, xGA, tirs cadrés, clean sheets

9. RED FLAGS
- Match sans enjeu, rotation, fatigue, tensions

10. SYNTHESE FINALE + PRONOSTIC
- 4 à 6 éléments décisifs
- Probabilité estimée % pour chaque option
- VALUE BET : oui ou non
- TOP 3 paris par ordre de préférence
- GOLD (75%+) / SILVER (65-74%) / NO BET

RÈGLES ABSOLUES :
- Zéro blabla, zéro supposition
- Données uniquement
- Si info absente : Aucune source fiable disponible
- Rapport 800 à 1200 mots`

    // Gemini API
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const geminiResult = await model.generateContent(prompt)
    const result = geminiResult.response.text()

    // Save analysis to database
    await supabase.from('analyses').insert({
      user_id: user.id,
      home_team: homeTeam,
      away_team: awayTeam,
      sport,
      competition: competition || sport,
      match_date: matchDate || new Date().toISOString().split('T')[0],
      odds_home: oddsHome || null,
      odds_draw: oddsDraw || null,
      odds_away: oddsAway || null,
      result,
    })

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Analyze error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

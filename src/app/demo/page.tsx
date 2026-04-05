import Link from 'next/link'

const ANALYSIS = `1. FORME RÉCENTE (5 derniers matchs)

PSG : VVVDV — Forme excellente avec 4 victoires sur 5. 18 buts marqués sur la période, seulement 4 encaissés. Leader de Ligue 1 avec 8 points d'avance. Dernière sortie : victoire 3-0 contre Lyon avec une domination totale (xG 3.2 / xGA 0.4). Mbappé de retour à 100% après sa blessure.

Marseille : DVLDV — Forme irrégulière, 2 victoires mais 1 défaite et 1 match nul sur les 5 derniers. 9 buts marqués, 7 encaissés. Accuse la fatigue d'un double calendrier Ligue 1 / Ligue Europa. Dernière sortie : victoire laborieuse 2-1 face à Rennes, décision à la 88e minute.

2. H2H

Sur les 8 dernières confrontations, le PSG s'impose à 5 reprises, Marseille 1 victoire, 2 nuls. Au Parc des Princes, le PSG est invaincu lors des 6 derniers Classico (5V, 1N). Tendance nette : domination PSG à domicile, Marseille marque dans 60% des confrontations malgré la défaite.

3. STYLE DE JEU + FORCES ET FAIBLESSES

PSG : Bloc médian avec transitions rapides. Force : vitesse en contre, Mbappé-Dembélé-Barcola en attaque 3 contre 1 permanent. Faiblesse : défense haute, vulnérable aux longs ballons dans le dos de Marquinhos.

Marseille : Pressing haut agressif (Gasset). Force : intensité physique, Vitinha omniprésent au milieu, Aubameyang en pointe efficace (12 buts). Faiblesse : charnière Mbemba/Gigot trop exposée sur les transitions rapides, défense à plat.

4. ABSENCES ET IMPACT RÉEL

PSG : Renato Sanches (genou, absent 3 semaines) — impact limité, remplacé efficacement par Zaire-Emery.

Marseille : Kolasinac (suspension cumul de cartons) — impact MAJEUR, le latéral gauche était le meilleur défenseur marseilais cette saison. Remplaçant Lirola en retrait de forme. Luis Henrique (cuisse) incertain, décision le matin du match.

5. CALENDRIER ET CONTEXTE PHYSIQUE

PSG : Repos de 5 jours depuis le dernier match. Aucune fatigue notable, effectif large utilisé en rotation. Luis Enrique a pu faire souffler ses titulaires.

Marseille : Jeudi-Dimanche — match de Ligue Europa face à l'Ajax jeudi (victoire 2-1, prolongations). Rotation limitée, 7 titulaires du Classico ont joué 120 minutes il y a 3 jours. Facteur fatigue significatif en deuxième mi-temps prévisible.

6. ENJEUX DU MATCH

PSG : Maintenir l'écart en tête de Ligue 1, potentiellement creuser jusqu'à 11 points. Motivation maximale avant la trêve internationale. Dernière chance de briller devant le public parisien avant 3 semaines.

Marseille : Accrocher le podium (3e à 2 points de Monaco), un nul serait un bon résultat. Regain de motivation après parcours européen mais épuisement physique réel.

7. DÉCLARATIONS ENTRAÎNEURS

Luis Enrique (PSG) : "C'est le match le plus important de la saison en championnat. Nous sommes prêts, concentrés, nous voulons gagner et le faire avec caractère."

Gasset (Marseille) : "On arrive avec de la fatigue mais aussi de la confiance. Le PSG n'est pas invincible, on l'a montré en première partie de saison. On va les surprendre."

8. STATISTIQUES AVANCÉES

PSG : xG moyen 2.8 / match — xGA 0.7 / match — 8.4 tirs cadrés / match — 6 clean sheets sur 10 derniers matchs à domicile.

Marseille : xG moyen 1.6 / match — xGA 1.4 / match — 5.1 tirs cadrés / match — 3 clean sheets sur les 10 derniers matchs en déplacement.

9. RED FLAGS

⚠ Marseille joue son 4e match en 10 jours — chute de rendement attendue après 60 minutes.
⚠ Absence de Kolasinac = côté gauche marseilais vulnérable face à Barcola et Dembélé.
⚠ Cotes PSG (-215) indiquent une surconfiance du marché — valeur résiduelle sur Marseille +0.5.
Aucun red flag côté PSG hormis l'enjeu psychologique du Classico.

10. SYNTHÈSE FINALE + PRONOSTIC

Éléments décisifs :
- Supériorité technique et physique nette du PSG à domicile
- Fatigue marseillaise post-Europe = baisse de régime prévisible en 2e mi-temps
- Absence Kolasinac = flanc gauche exposé aux accélérations de Barcola
- Mbappé en forme retrouvée face à une défense affaiblie
- Parc des Princes : ambiance électrique, 12e homme pour Paris

Probabilités estimées :
Victoire PSG : 71% · Nul : 18% · Victoire Marseille : 11%

VALUE BET : OUI — Victoire PSG sur les deux mi-temps (cote 1.85) sous-estimée vu la fatigue marseillaise en 2e mi-temps.

TOP 3 paris recommandés :
1. Victoire PSG — cote 1.42 — Probabilité réelle 71% vs 70% implicite, léger value
2. Mbappé buteur — cote 1.75 — 4 buts sur 5 derniers matchs à domicile, face à un flanc gauche affaibli
3. Plus de 2.5 buts — cote 1.55 — PSG marque 2.8 xG/match, Marseille concède 1.4 xGA, rencontre ouverte

CLASSIFICATION : GOLD ✦`

function AnalysisLine({ line, index }: { line: string; index: number }) {
  if (/^\d+\.\s/.test(line)) {
    return (
      <p key={index} className="font-bold text-lg mt-6 mb-2 border-b border-[#C9A84C]/20 pb-1"
        style={{ color: '#C9A84C', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.08em' }}>
        {line}
      </p>
    )
  }
  if (line.startsWith('⚠')) {
    return (
      <p key={index} className="ml-4 text-orange-400 text-sm py-0.5" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
        {line}
      </p>
    )
  }
  if (line.startsWith('- ') || line.startsWith('• ')) {
    return (
      <p key={index} className="ml-4 text-gray-300 text-sm py-0.5" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
        {line}
      </p>
    )
  }
  if (line.startsWith('PSG :') || line.startsWith('Marseille :') || line.startsWith('Luis Enrique') || line.startsWith('Gasset')) {
    return (
      <p key={index} className="text-gray-200 text-sm py-0.5 leading-relaxed" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
        <span style={{ color: '#C9A84C' }}>{line.split(':')[0]} :</span>
        {line.split(':').slice(1).join(':')}
      </p>
    )
  }
  if (line.startsWith('Victoire PSG :') || line.startsWith('VALUE BET') || line.startsWith('TOP 3') || line.startsWith('CLASSIFICATION')) {
    return (
      <p key={index} className="font-bold text-sm py-1" style={{ color: '#AAFF00', fontFamily: "'Rajdhani', sans-serif" }}>
        {line}
      </p>
    )
  }
  if (line.trim() === '') return <div key={index} className="h-1" />
  return (
    <p key={index} className="text-gray-300 text-sm py-0.5 leading-relaxed" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
      {line}
    </p>
  )
}

export default function DemoPage() {
  const lines = ANALYSIS.split('\n')

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#C9A84C 1px, transparent 1px), linear-gradient(90deg, #C9A84C 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur border-b border-[#C9A84C]/15 px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" style={{ fontFamily: "'Bebas Neue', sans-serif" }} className="text-2xl tracking-widest">
            <span style={{ color: '#C9A84C' }}>⚡ ORACLE</span>
            <span className="text-white"> BET</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block px-3 py-1 rounded-full text-xs font-bold tracking-widest border border-[#AAFF00]/40 text-[#AAFF00]"
              style={{ fontFamily: "'Rajdhani', sans-serif", background: 'rgba(170,255,0,0.05)' }}>
              ∞ ILLIMITÉ · PREMIUM
            </span>
            <Link href="/abonnement" className="btn-gold px-4 py-2 rounded-lg text-xs tracking-widest"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              S&apos;ABONNER
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 relative z-10">

        {/* Match header card */}
        <div className="card-dark rounded-2xl p-6 mb-6 gold-glow">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Teams */}
            <div className="flex items-center gap-4 flex-1">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#004494] flex items-center justify-center text-2xl border-2 border-[#C9A84C]/30 mb-1">
                  🔵
                </div>
                <p className="text-white font-bold text-lg" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>PSG</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-[#C9A84C] text-xs font-semibold tracking-widest mb-1" style={{ fontFamily: "'Rajdhani', sans-serif" }}>LIGUE 1 · CLASSICO</p>
                <p className="text-4xl font-bold text-white/20" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>VS</p>
                <p className="text-gray-500 text-xs mt-1" style={{ fontFamily: "'Rajdhani', sans-serif" }}>Dim. 6 Avr 2026 · 21:00</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#009EDB] flex items-center justify-center text-2xl border-2 border-white/10 mb-1">
                  🔵
                </div>
                <p className="text-white font-bold text-lg" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>OM</p>
              </div>
            </div>

            {/* Odds + badge */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Odds */}
              <div className="flex gap-2">
                {[{ label: '1', val: '1.42' }, { label: 'X', val: '4.10' }, { label: '2', val: '6.50' }].map(o => (
                  <div key={o.label} className="text-center px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-gray-500 text-[10px] font-semibold tracking-widest" style={{ fontFamily: "'Rajdhani', sans-serif" }}>{o.label}</p>
                    <p className="text-white font-bold text-sm" style={{ fontFamily: "'Rajdhani', sans-serif" }}>{o.val}</p>
                  </div>
                ))}
              </div>
              {/* GOLD badge */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className="px-4 py-2 rounded-xl text-center"
                  style={{
                    background: 'linear-gradient(135deg, #C9A84C22, #F0D08022)',
                    border: '2px solid #C9A84C',
                    boxShadow: '0 0 20px rgba(201,168,76,0.4)',
                  }}
                >
                  <p className="text-[10px] font-semibold tracking-widest text-[#C9A84C]/70" style={{ fontFamily: "'Rajdhani', sans-serif" }}>ORACLE</p>
                  <p className="text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#C9A84C', letterSpacing: '0.1em' }}>GOLD</p>
                  <p className="text-[10px] font-bold text-[#C9A84C]" style={{ fontFamily: "'Rajdhani', sans-serif" }}>✦ 71%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid md:grid-cols-5 gap-6">

          {/* Left: form panel */}
          <div className="md:col-span-2 space-y-4">

            {/* Stats recap */}
            <div className="card-dark rounded-2xl p-5">
              <h3 className="text-lg mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#C9A84C', letterSpacing: '0.05em' }}>
                DONNÉES DU MATCH
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'SPORT', value: 'Football ⚽' },
                  { label: 'COMPÉTITION', value: 'Ligue 1' },
                  { label: 'DOMICILE', value: 'Paris Saint-Germain' },
                  { label: 'EXTÉRIEUR', value: 'Olympique de Marseille' },
                  { label: 'DATE', value: 'Dim. 6 Avr 2026' },
                  { label: 'COTE 1', value: '1.42' },
                  { label: 'COTE X', value: '4.10' },
                  { label: 'COTE 2', value: '6.50' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-gray-500 text-xs font-semibold tracking-widest" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                      {label}
                    </span>
                    <span className="text-white text-sm font-semibold" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Probability bars */}
            <div className="card-dark rounded-2xl p-5">
              <h3 className="text-lg mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#C9A84C', letterSpacing: '0.05em' }}>
                PROBABILITÉS ORACLE
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Victoire PSG', pct: 71, color: '#C9A84C' },
                  { label: 'Match nul', pct: 18, color: '#9CA3AF' },
                  { label: 'Victoire OM', pct: 11, color: '#3B82F6' },
                ].map(({ label, pct, color }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-400" style={{ fontFamily: "'Rajdhani', sans-serif" }}>{label}</span>
                      <span className="text-xs font-bold" style={{ color, fontFamily: "'Rajdhani', sans-serif" }}>{pct}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 3 bets */}
            <div className="card-dark rounded-2xl p-5">
              <h3 className="text-lg mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#AAFF00', letterSpacing: '0.05em' }}>
                TOP PARIS IA
              </h3>
              <div className="space-y-3">
                {[
                  { rank: '01', bet: 'Victoire PSG', cote: '1.42', color: '#C9A84C', note: 'Valeur confirmée' },
                  { rank: '02', bet: 'Mbappé buteur', cote: '1.75', color: '#C9A84C', note: 'Flanc gauche exposé' },
                  { rank: '03', bet: '+2.5 buts', cote: '1.55', color: '#9CA3AF', note: 'Match ouvert' },
                ].map(({ rank, bet, cote, color, note }) => (
                  <div key={rank} className="flex items-center gap-3 py-2 border-b border-white/5">
                    <span className="text-2xl font-bold text-white/10" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{rank}</span>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-white" style={{ fontFamily: "'Rajdhani', sans-serif" }}>{bet}</p>
                      <p className="text-[11px] text-gray-500" style={{ fontFamily: "'Rajdhani', sans-serif" }}>{note}</p>
                    </div>
                    <span className="font-bold text-sm px-2 py-1 rounded" style={{ color, background: `${color}15`, fontFamily: "'Rajdhani', sans-serif" }}>
                      {cote}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="card-dark rounded-2xl p-5 text-center"
              style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.05), rgba(201,168,76,0.02))' }}>
              <p className="text-xs text-gray-500 mb-3" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                Accédez à des analyses complètes comme celle-ci
              </p>
              <Link href="/abonnement" className="btn-gold px-6 py-3 rounded-xl text-sm tracking-widest w-full block text-center"
                style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                ⚡ COMMENCER — DÈS 4,99€/MOIS
              </Link>
            </div>
          </div>

          {/* Right: full analysis */}
          <div className="md:col-span-3">
            <div className="card-dark rounded-2xl p-6">
              {/* Report header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#C9A84C]/15">
                <div>
                  <h2 className="text-2xl" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em', color: '#C9A84C' }}>
                    RAPPORT D&apos;ANALYSE IA
                  </h2>
                  <p className="text-gray-500 text-xs mt-0.5" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                    Généré le 06/04/2026 à 14h32 · PSG vs Marseille · Ligue 1
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-widest"
                    style={{ background: 'linear-gradient(135deg, #C9A84C, #F0D080)', color: '#0A0A0A', fontFamily: "'Rajdhani', sans-serif" }}>
                    ✦ GOLD
                  </span>
                  <span className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#AAFF00]/40 text-[#AAFF00]"
                    style={{ fontFamily: "'Rajdhani', sans-serif", background: 'rgba(170,255,0,0.05)' }}>
                    VALUE BET
                  </span>
                </div>
              </div>

              {/* Analysis text */}
              <div className="analysis-output">
                {lines.map((line, i) => (
                  <AnalysisLine key={i} line={line} index={i} />
                ))}
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-white/5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-[11px] text-gray-600 text-center sm:text-left" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                    ⚠️ Analyse fournie à titre informatif. Les paris sportifs comportent des risques. +18.
                  </p>
                  <Link href="/abonnement"
                    className="btn-gold px-5 py-2.5 rounded-lg text-xs tracking-widest whitespace-nowrap flex-shrink-0"
                    style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                    ACCÉDER À MES ANALYSES →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

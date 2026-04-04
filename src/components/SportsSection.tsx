const sports = [
  {
    emoji: "⚽",
    name: "FOOTBALL",
    bullets: [
      "Ligue 1 — Championnat de France",
      "Premier League — Angleterre",
      "Champions League — Europe",
      "La Liga — Espagne",
      "Serie A — Italie",
      "Bundesliga — Allemagne",
    ],
  },
  {
    emoji: "🏀",
    name: "BASKETBALL",
    bullets: [
      "NBA — Ligue nord-américaine",
      "Euroleague — Europe",
      "Analyse des rotations",
      "Back-to-back & fatigue",
      "Statistiques avancées (PER, TS%)",
      "Domicile / Extérieur",
    ],
  },
  {
    emoji: "🎾",
    name: "TENNIS",
    bullets: [
      "Grand Chelem (Roland-Garros, Wimbledon…)",
      "ATP Masters 1000",
      "WTA Premier",
      "Forme sur surface",
      "H2H détaillé",
      "Condition physique & blessures",
    ],
  },
];

export function SportsSection() {
  return (
    <section id="sports" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-bebas text-[clamp(2.5rem,6vw,5rem)] gold-gradient tracking-wide mb-4">
            SPORTS COUVERTS
          </h2>
          <p className="text-white/50 text-base max-w-xl mx-auto">
            Des analyses expertes sur les disciplines et compétitions les plus populaires.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sports.map((sport) => (
            <div
              key={sport.name}
              className="card-dark rounded-xl p-8 flex flex-col gap-6 border border-[#C9A84C]/15 hover:border-[#C9A84C]/50 hover:gold-glow transition-all duration-300 group"
            >
              {/* Icon + title */}
              <div className="flex items-center gap-4">
                <span className="text-5xl leading-none">{sport.emoji}</span>
                <h3 className="font-bebas text-3xl tracking-wide text-white group-hover:gold-gradient transition-all duration-200">
                  {sport.name}
                </h3>
              </div>

              {/* Bullets */}
              <ul className="flex flex-col gap-2.5">
                {sport.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2.5 text-sm text-white/60">
                    <span className="text-[#C9A84C] text-xs shrink-0">▸</span>
                    {bullet}
                  </li>
                ))}
              </ul>

              {/* Badge */}
              <div className="mt-auto pt-4 border-t border-[#C9A84C]/10">
                <span className="inline-flex items-center gap-1.5 bg-[#AAFF00]/10 border border-[#AAFF00]/30 text-[#AAFF00] text-xs font-bold tracking-widest px-3 py-1 rounded-full uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#AAFF00] animate-pulse" />
                  DISPONIBLE
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default SportsSection;

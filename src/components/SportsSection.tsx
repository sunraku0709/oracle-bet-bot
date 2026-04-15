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
    <section id="sports" className="py-28 px-4 sm:px-6 lg:px-8 relative">
      <div className="glow-line mb-0 mx-8" />

      <div className="max-w-7xl mx-auto pt-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] gold-gradient tracking-wide mb-4"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            SPORTS COUVERTS
          </h2>
          <p className="text-white/45 text-base max-w-xl mx-auto">
            Des analyses expertes sur les disciplines et compétitions les plus populaires.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {sports.map((sport) => (
            <div
              key={sport.name}
              className="glass-card rounded-2xl p-7 flex flex-col gap-6 group hover:border-[#C9A84C]/40 hover:gold-glow transition-all duration-300"
            >
              {/* Icon + title */}
              <div className="flex items-center gap-4">
                <span className="text-4xl leading-none transition-transform duration-300 group-hover:scale-110">
                  {sport.emoji}
                </span>
                <h3
                  className="text-2xl tracking-wide text-white"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  {sport.name}
                </h3>
              </div>

              {/* Bullets */}
              <ul className="flex flex-col gap-2.5 flex-1">
                {sport.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2.5 text-sm text-white/55">
                    <span className="text-[#C9A84C] text-xs shrink-0">▸</span>
                    {bullet}
                  </li>
                ))}
              </ul>

              {/* Status badge */}
              <div className="pt-4 border-t border-white/[0.06]">
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/8 border border-emerald-500/25 text-emerald-400 text-xs font-semibold tracking-widest px-3 py-1 rounded-full uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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

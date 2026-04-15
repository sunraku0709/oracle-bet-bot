const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
        <path d="M12 8v4l3 3" />
      </svg>
    ),
    title: "DOUBLE IA EN PARALLÈLE",
    description:
      "Claude (Anthropic) et DeepSeek analysent chaque match simultanément. Deux intelligences indépendantes pour des conclusions plus robustes et fiables.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "DONNÉES EN TEMPS RÉEL",
    description:
      "Accès aux cotes en direct Bet365 & Unibet. Compositions, absences, forme récente et contexte actualisés pour chaque analyse.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    title: "FIABILITÉ 65–85 %",
    description:
      "Chaque rapport inclut une probabilité estimée et une classification GOLD (75 %+) / SILVER (65–74 %) / NO BET — structurée en 10 points obligatoires.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-28 px-4 sm:px-6 lg:px-8 relative">

      {/* Subtle top separator */}
      <div className="glow-line mb-0 mx-8" />

      <div className="max-w-7xl mx-auto pt-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] gold-gradient tracking-wide mb-4"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            POURQUOI ORACLE BET ?
          </h2>
          <p className="text-white/45 text-base max-w-xl mx-auto">
            Une technologie d&apos;analyse sportive de pointe, accessible à tous les parieurs sérieux.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="glass-card rounded-2xl p-8 flex flex-col gap-5 group hover:border-[#C9A84C]/35 transition-all duration-300"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Icon */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{
                  background: "rgba(201,168,76,0.08)",
                  border: "1px solid rgba(201,168,76,0.2)",
                  color: "#C9A84C",
                }}
              >
                {feature.icon}
              </div>

              <h3
                className="text-xl tracking-wide text-white group-hover:gold-gradient transition-all duration-200"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {feature.title}
              </h3>
              <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>

              {/* Bottom accent line on hover */}
              <div
                className="mt-auto h-px w-0 group-hover:w-full transition-all duration-500 rounded"
                style={{ background: "linear-gradient(90deg, #C9A84C, transparent)" }}
              />
            </div>
          ))}
        </div>

        {/* Badge */}
        <div className="flex justify-center mt-10">
          <div className="inline-flex items-center gap-2 border border-[#C9A84C]/20 bg-[#C9A84C]/5 rounded-full px-5 py-2">
            <span className="text-[#C9A84C] text-sm font-medium tracking-wider">
              ✓ Rapport structuré en 10 points · Forme, H2H, Absences, xG, Red Flags &amp; plus
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;

const features = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
        <path d="M8 9.5c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v.5c0 1.1-.9 2-2 2h-1v2" />
        <circle cx="12" cy="17.5" r=".75" fill="currentColor" />
        <path d="M9 9c.5-1 1.5-1.5 3-1.5s2.5.5 3 1.5" />
      </svg>
    ),
    title: "ANALYSES IA AVANCÉES",
    description:
      "Notre IA analyse des milliers de données en temps réel : statistiques, blessures, forme, H2H, météo et bien plus encore.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "DONNÉES EN TEMPS RÉEL",
    description:
      "Accès aux cotes en direct Bet365 & Unibet. Informations sur les compositions, absences et contexte actualisés.",
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    title: "FIABILITÉ 65-85%",
    description:
      "Chaque analyse inclut une probabilité estimée et une classification GOLD (75%+) / SILVER (65-74%) / NO BET.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-bebas text-[clamp(2.5rem,6vw,5rem)] gold-gradient tracking-wide mb-4">
            POURQUOI ORACLE BET ?
          </h2>
          <p className="text-white/50 text-base max-w-xl mx-auto">
            Une technologie d&apos;analyse sportive de pointe, accessible à tous les parieurs sérieux.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="card-dark rounded-xl p-8 flex flex-col gap-5 hover:gold-glow transition-all duration-300 group"
            >
              <div className="text-[#C9A84C] group-hover:text-[#F0D080] transition-colors duration-200">
                {feature.icon}
              </div>
              <h3 className="font-bebas text-2xl tracking-wide text-white">
                {feature.title}
              </h3>
              <p className="text-white/55 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 border border-[#C9A84C]/30 bg-[#C9A84C]/5 rounded-full px-5 py-2">
            <span className="text-[#C9A84C] text-sm font-semibold tracking-wider">
              ✓ Analyses structurées en 10 points obligatoires
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;

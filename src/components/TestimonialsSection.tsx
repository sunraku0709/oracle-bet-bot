const testimonials = [
  {
    name: "Thomas M.",
    plan: "PREMIUM",
    text: "Oracle Bet a complètement changé mon approche des paris. Les analyses sont détaillées, précises et vraiment utiles. +340€ sur les 2 derniers mois.",
    gain: "+340€",
  },
  {
    name: "Sophie L.",
    plan: "STANDARD",
    text: "Le niveau d'analyse est impressionnant. Chaque rapport couvre tous les aspects du match. Je ne parie plus sans consulter Oracle Bet.",
    gain: null,
  },
  {
    name: "Karim B.",
    plan: "PREMIUM",
    text: "Excellent service ! La classification GOLD/SILVER aide vraiment à sélectionner les meilleurs paris. ROI positif depuis 3 mois.",
    gain: null,
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-28 px-4 sm:px-6 lg:px-8 relative">
      <div className="glow-line mb-0 mx-8" />

      <div className="max-w-7xl mx-auto pt-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] gold-gradient tracking-wide mb-4"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            ILS NOUS FONT CONFIANCE
          </h2>
          <p className="text-white/45 text-base max-w-xl mx-auto">
            Des milliers de parieurs font confiance à Oracle Bet chaque jour.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="glass-card rounded-2xl p-7 flex flex-col gap-5 hover:border-[#C9A84C]/35 hover:gold-glow transition-all duration-300"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#C9A84C">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className="text-white/65 text-sm leading-relaxed flex-1">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Gain badge if present */}
              {t.gain && (
                <div className="inline-flex items-center gap-2 bg-emerald-500/8 border border-emerald-500/25 rounded-lg px-3 py-1.5 w-fit">
                  <span className="text-emerald-400 text-sm font-bold">{t.gain}</span>
                  <span className="text-emerald-400/60 text-xs">ce mois</span>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                <div>
                  <p className="font-semibold text-white text-sm">{t.name}</p>
                  <p className="text-[#C9A84C] text-[10px] font-bold tracking-widest">{t.plan}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/8 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  VÉRIFIÉ
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default TestimonialsSection;

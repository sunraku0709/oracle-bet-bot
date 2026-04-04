const testimonials = [
  {
    name: "Thomas M.",
    text: "Oracle Bet a complètement changé mon approche des paris. Les analyses sont détaillées, précises et vraiment utiles. +340€ sur les 2 derniers mois.",
  },
  {
    name: "Sophie L.",
    text: "Le niveau d'analyse est impressionnant. Chaque rapport couvre tous les aspects du match. Je ne parie plus sans consulter Oracle Bet.",
  },
  {
    name: "Karim B.",
    text: "Excellent service ! La classification GOLD/SILVER aide vraiment à sélectionner les meilleurs paris. ROI positif depuis 3 mois.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-bebas text-[clamp(2.5rem,6vw,5rem)] gold-gradient tracking-wide mb-4">
            ILS NOUS FONT CONFIANCE
          </h2>
          <p className="text-white/50 text-base max-w-xl mx-auto">
            Des milliers de parieurs font confiance à Oracle Bet chaque jour.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="card-dark rounded-xl p-8 flex flex-col gap-5 border border-[#C9A84C]/20 hover:border-[#C9A84C]/50 hover:gold-glow transition-all duration-300"
            >
              {/* Stars */}
              <div className="flex items-center gap-0.5 text-lg">
                {"⭐⭐⭐⭐⭐".split("").map((star, i) => (
                  <span key={i}>{star}</span>
                ))}
              </div>

              {/* Quote */}
              <p className="text-white/70 text-sm leading-relaxed flex-1">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-[#C9A84C]/10">
                <span className="font-bebas text-lg tracking-wider text-white">
                  {t.name}
                </span>
                <span className="inline-flex items-center gap-1.5 bg-[#AAFF00]/10 border border-[#AAFF00]/30 text-[#AAFF00] text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#AAFF00]" />
                  MEMBRE VÉRIFIÉ
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

import Link from "next/link";

const stats = [
  { value: "2 847", label: "MEMBRES ACTIFS" },
  { value: "73%", label: "TAUX DE RÉUSSITE MOYEN" },
  { value: "12 850", label: "ANALYSES RÉALISÉES" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background grid effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(201, 168, 76, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201, 168, 76, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Radial fade on grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 0%, #0A0A0A 80%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-24">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 border border-[#AAFF00]/30 bg-[#AAFF00]/5 rounded-full px-4 py-1.5 mb-8 animate-fade-in-up">
          <span className="text-[#AAFF00] text-xs font-bold tracking-[0.2em] uppercase">
            ⚡ INTELLIGENCE ARTIFICIELLE AVANCÉE
          </span>
        </div>

        {/* H1 */}
        <h1 className="font-bebas leading-none mb-6 animate-fade-in-up">
          <span className="block text-[clamp(4rem,12vw,9rem)] text-white tracking-wide">
            DOMINEZ LES PARIS
          </span>
          <span className="block text-[clamp(4rem,12vw,9rem)] gold-gradient tracking-wide">
            AVEC L&apos;IA
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-6 leading-relaxed animate-fade-in-up">
          Analyses sportives ultra-précises basées sur des données réelles.
          Fiabilité garantie entre{" "}
          <span className="text-[#C9A84C] font-semibold">65% et 85%</span>.
        </p>

        {/* Dual AI badge */}
        <div className="flex justify-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 border border-[#C9A84C]/30 bg-[#C9A84C]/5 rounded-full px-5 py-2">
            <span className="text-[#C9A84C] text-sm font-semibold tracking-wide">
              Propulsé par les 2 IA les plus puissantes du moment :
            </span>
            <span className="text-white font-bold text-sm">Claude (Anthropic) + DeepSeek</span>
            <span className="text-white/50 text-xs">— pour des analyses inégalées</span>
          </div>
        </div>

        {/* Single CTA */}
        <div className="flex items-center justify-center mb-16 animate-fade-in-up">
          <Link
            href="/abonnement"
            className="btn-gold px-10 py-4 text-base rounded w-full sm:w-auto text-center"
          >
            COMMENCER MAINTENANT
          </Link>
        </div>

        {/* Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-0 animate-fade-in-up">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`flex flex-col items-center px-8 ${
                i < stats.length - 1
                  ? "sm:border-r sm:border-[#C9A84C]/20"
                  : ""
              }`}
            >
              <span className="font-bebas text-3xl text-[#C9A84C] tracking-wider">
                {stat.value}
              </span>
              <span className="text-white/40 text-xs tracking-widest uppercase mt-0.5">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HeroSection;

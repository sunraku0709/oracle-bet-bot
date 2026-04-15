import Link from "next/link";

const stats = [
  { value: "2 847",  label: "MEMBRES ACTIFS" },
  { value: "73%",    label: "TAUX DE RÉUSSITE" },
  { value: "12 850", label: "ANALYSES RÉALISÉES" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* Deep background noise / grain layer */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(201,168,76,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
        }}
      />

      {/* Radial vignette over grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 85% 65% at 50% 50%, transparent 0%, #080808 75%)",
        }}
      />

      {/* Top gold glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)" }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-32 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at top, rgba(201,168,76,0.12) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-28">

        {/* AI badge */}
        <div className="inline-flex items-center gap-2.5 border border-[#C9A84C]/25 bg-[#C9A84C]/[0.06] rounded-full px-5 py-2 mb-10 animate-fade-in-up">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
          <span className="text-[#C9A84C] text-xs font-semibold tracking-[0.2em] uppercase">
            Intelligence Artificielle · Claude + DeepSeek
          </span>
        </div>

        {/* H1 */}
        <h1 className="leading-none mb-8 animate-fade-in-up delay-100"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          <span className="block text-[clamp(3.5rem,11vw,8.5rem)] text-white tracking-wide">
            DOMINEZ LES PARIS
          </span>
          <span className="block text-[clamp(3.5rem,11vw,8.5rem)] gold-gradient tracking-wide">
            AVEC L&apos;IA
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-white/55 text-lg sm:text-xl max-w-2xl mx-auto mb-4 leading-relaxed animate-fade-in-up delay-200"
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>
          Analyses sportives ultra-précises propulsées par les deux IA les plus puissantes du monde.
          Fiabilité garantie entre{" "}
          <span className="text-[#C9A84C] font-semibold">65 % et 85 %</span>.
        </p>

        {/* Dual AI pill */}
        <div className="flex justify-center mb-12 animate-fade-in-up delay-300">
          <div className="inline-flex items-center gap-3 border border-white/8 bg-white/[0.03] rounded-full px-6 py-2.5 text-sm">
            <span className="text-white/40 text-xs tracking-wider uppercase">Propulsé par</span>
            <span className="font-semibold text-white">Claude (Anthropic)</span>
            <span className="text-[#C9A84C] font-bold">+</span>
            <span className="font-semibold text-white">DeepSeek</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-fade-in-up delay-400">
          <Link
            href="/auth?mode=register"
            className="btn-gold px-10 py-4 text-sm rounded-xl w-full sm:w-auto text-center tracking-wider"
          >
            COMMENCER MAINTENANT
          </Link>
          <a
            href="#pricing"
            className="btn-outline-gold px-8 py-4 text-sm rounded-xl w-full sm:w-auto text-center tracking-wider"
          >
            VOIR LES TARIFS
          </a>
        </div>

        {/* Stats */}
        <div className="inline-flex flex-col sm:flex-row items-center divide-y sm:divide-y-0 sm:divide-x divide-[#C9A84C]/15 border border-[#C9A84C]/12 rounded-2xl bg-white/[0.02] backdrop-blur-sm overflow-hidden animate-fade-in-up delay-400">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center px-8 py-4">
              <span
                className="text-3xl text-[#C9A84C] tracking-wider"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {stat.value}
              </span>
              <span className="text-white/35 text-[11px] tracking-widest uppercase mt-0.5">
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

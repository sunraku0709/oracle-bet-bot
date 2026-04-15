import Link from "next/link";
import { PLANS, type PlanId } from "@/lib/plans";

const TIERS: PlanId[] = ["starter", "standard", "premium"];

export function PricingSection() {
  return (
    <section id="pricing" className="py-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden">

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(201,168,76,0.05) 0%, transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 border border-[#C9A84C]/20 bg-[#C9A84C]/5 rounded-full px-4 py-1.5 mb-6">
            <span className="text-[#C9A84C] text-xs font-semibold tracking-widest uppercase">Sans engagement · Résiliable à tout moment</span>
          </div>
          <h2 className="text-[clamp(2.5rem,6vw,5rem)] gold-gradient tracking-wide mb-4"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            CHOISISSEZ VOTRE PLAN
          </h2>
          <p className="text-white/45 text-base max-w-xl mx-auto">
            Créez votre compte gratuitement, puis activez votre abonnement via Stripe.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {TIERS.map((planId) => {
            const plan    = PLANS[planId];
            const isPopular = planId === "standard";
            const isBest    = planId === "premium";

            return (
              <div
                key={planId}
                className={`relative flex flex-col rounded-2xl transition-all duration-300 ${
                  isBest
                    ? "glass-card-premium"
                    : isPopular
                    ? "glass-card border-[#C9A84C]/30"
                    : "glass-card"
                }`}
                style={isBest ? { transform: "translateY(-6px)" } : {}}
              >
                {/* Top glow line */}
                <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
                  style={{
                    background: isBest
                      ? "linear-gradient(90deg, transparent, #F0D080, transparent)"
                      : isPopular
                      ? "linear-gradient(90deg, transparent, #C9A84C, transparent)"
                      : "linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent)",
                  }}
                />

                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className="px-4 py-1 rounded-full text-[11px] font-bold tracking-widest whitespace-nowrap"
                      style={{
                        background: isBest
                          ? "linear-gradient(135deg, #C9A84C, #F0D080)"
                          : "#C9A84C",
                        color: "#0A0A0A",
                      }}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="p-7 flex flex-col flex-1">
                  {/* Plan name */}
                  <p className="text-xs font-bold tracking-widest mb-4 uppercase"
                    style={{ color: plan.color }}>
                    {plan.name}
                  </p>

                  {/* Price */}
                  <div className="mb-2">
                    <div className="flex items-end gap-1">
                      <span
                        className="text-5xl font-bold leading-none"
                        style={{
                          fontFamily: "'Bebas Neue', sans-serif",
                          color: isBest ? "#F0D080" : plan.color,
                          letterSpacing: "0.03em",
                        }}
                      >
                        {plan.priceLabel}
                      </span>
                      <span className="text-white/35 mb-1.5 text-sm">/mois</span>
                    </div>
                    <p className="text-white/30 text-xs mt-1">
                      {plan.analysesPerDay === null
                        ? "Analyses illimitées"
                        : `${plan.analysesPerDay} analyse${plan.analysesPerDay > 1 ? "s" : ""} / jour`}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="my-5 h-px"
                    style={{ background: isBest ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.06)" }}
                  />

                  {/* Features */}
                  <ul className="flex flex-col gap-3 flex-1 mb-7">
                    {plan.features.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span
                          className="mt-0.5 shrink-0 text-sm font-bold"
                          style={{ color: isBest ? "#F0D080" : plan.color }}
                        >
                          ✓
                        </span>
                        <span className="text-white/65 text-sm leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link
                    href={`/auth?plan=${planId}&mode=register`}
                    className={`w-full py-3.5 rounded-xl text-xs font-bold tracking-widest text-center transition-all block ${
                      isBest || isPopular ? "btn-gold" : "btn-outline-gold"
                    }`}
                  >
                    {isBest ? "COMMENCER — PREMIUM" : isPopular ? "COMMENCER — STANDARD" : "COMMENCER — STARTER"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust line */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-white/30 text-xs">
          {["🔒 Paiement sécurisé Stripe", "↩️ Résiliable à tout moment", "✓ Sans engagement"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>

        {/* Legal note */}
        <p className="text-white/20 text-xs text-center mt-8 leading-relaxed max-w-xl mx-auto">
          Les performances passées ne garantissent pas les performances futures.
          Les paris sportifs comportent des risques. +18 uniquement.
        </p>
      </div>
    </section>
  );
}

export default PricingSection;

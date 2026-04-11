import Link from "next/link";
import { PLANS, type PlanId } from "@/lib/plans";

const PLAN_ORDER: PlanId[] = ['standard', 'premium'];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-bebas text-[clamp(2.5rem,6vw,5rem)] gold-gradient tracking-wide mb-4">
            NOS ABONNEMENTS
          </h2>
          <p className="text-white/50 text-base max-w-xl mx-auto">
            Sans engagement · Résiliable à tout moment · Paiement sécurisé Stripe
          </p>
        </div>

        {/* 2 plan cards — centred */}
        <div className="flex flex-col md:flex-row justify-center gap-8 max-w-3xl mx-auto">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const isPopular  = plan.badge === 'POPULAIRE';
            const isUnlimited = plan.badge === 'ILLIMITÉ';

            return (
              <div
                key={planId}
                className={`relative card-dark rounded-2xl p-10 flex flex-col flex-1 transition-all duration-300 ${
                  isPopular
                    ? 'border-[#C9A84C] gold-glow scale-[1.02]'
                    : 'border-[#AAFF00]/40'
                }`}
              >
                {/* Top accent line */}
                {isPopular && (
                  <div
                    className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
                    style={{ background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }}
                  />
                )}

                {/* Badge */}
                {plan.badge && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold tracking-widest"
                    style={{
                      backgroundColor: isPopular ? '#C9A84C' : '#AAFF00',
                      color: '#0A0A0A',
                      fontFamily: "'Rajdhani', sans-serif",
                    }}
                  >
                    {plan.badge}
                  </div>
                )}

                {/* Price */}
                <div className="text-center mb-8">
                  <p className="text-xs font-semibold tracking-widest mb-2"
                    style={{ color: plan.color, fontFamily: "'Rajdhani', sans-serif" }}>
                    {plan.name}
                  </p>
                  <div className="flex items-end justify-center gap-1">
                    <span className="text-6xl font-bold"
                      style={{ fontFamily: "'Bebas Neue', sans-serif", color: plan.color, letterSpacing: '0.05em' }}>
                      {plan.priceLabel}
                    </span>
                    <span className="text-white/40 mb-2 text-sm" style={{ fontFamily: "'Rajdhani', sans-serif" }}>/mois</span>
                  </div>
                  <p className="text-xs text-white/30 mt-1" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                    {plan.analysesPerDay === null
                      ? 'Analyses & pronostics illimités'
                      : `${plan.analysesPerDay} analyses/jour · pronostics inclus`}
                  </p>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-3 mb-10 flex-1">
                  {plan.features.map((item) => (
                    <li key={item} className="flex items-start gap-3" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                      <span className="font-bold mt-0.5 shrink-0" style={{ color: plan.color }}>✓</span>
                      <span className="text-white/75 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={`/auth?plan=${planId}&mode=register`}
                  className="w-full py-4 rounded-xl text-sm font-bold tracking-widest text-center transition-all block"
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    background: isPopular
                      ? 'linear-gradient(135deg, #C9A84C, #F0D080)'
                      : 'linear-gradient(135deg, #AAFF00, #88DD00)',
                    color: '#0A0A0A',
                  }}
                >
                  CHOISIR CE PLAN
                </Link>
              </div>
            );
          })}
        </div>

        {/* Legal */}
        <p className="text-white/30 text-xs text-center mt-10 leading-relaxed">
          Les performances passées ne garantissent pas les performances futures.
          Les paris sportifs comportent des risques. +18 uniquement.
        </p>
      </div>
    </section>
  );
}

export default PricingSection;

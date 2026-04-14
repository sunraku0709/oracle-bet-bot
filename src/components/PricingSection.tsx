import Link from "next/link";
import { PLANS } from "@/lib/plans";

export function PricingSection() {
  const plan = PLANS['gold'];

  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-bebas text-[clamp(2.5rem,6vw,5rem)] gold-gradient tracking-wide mb-4">
            ABONNEMENT
          </h2>
          <p className="text-white/50 text-base max-w-xl mx-auto">
            Sans engagement · Résiliable à tout moment · Paiement sécurisé Stripe
          </p>
        </div>

        {/* Single Gold plan card */}
        <div className="max-w-md mx-auto">
          <div className="relative card-dark rounded-2xl p-8 flex flex-col border-[#C9A84C] gold-glow transition-all duration-300">
            {/* Top glow line */}
            <div
              className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
              style={{ background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }}
            />

            {/* Badge */}
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold tracking-widest"
              style={{ backgroundColor: '#C9A84C', color: '#0A0A0A', fontFamily: "'Rajdhani', sans-serif" }}
            >
              {plan.badge}
            </div>

            {/* Plan name + price */}
            <div className="text-center mb-6">
              <p
                className="text-xs font-semibold tracking-widest mb-2"
                style={{ color: plan.color, fontFamily: "'Rajdhani', sans-serif" }}
              >
                {plan.name}
              </p>
              <div className="flex items-end justify-center gap-1">
                <span
                  className="text-5xl font-bold"
                  style={{ fontFamily: "'Bebas Neue', sans-serif", color: plan.color, letterSpacing: '0.05em' }}
                >
                  {plan.priceLabel}
                </span>
                <span className="text-white/40 mb-1.5 text-sm" style={{ fontFamily: "'Rajdhani', sans-serif" }}>/mois</span>
              </div>
              <p className="text-xs text-white/30 mt-1" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                Analyses & pronostics illimités
              </p>
            </div>

            {/* Features */}
            <ul className="flex flex-col gap-2.5 mb-8 flex-1">
              {plan.features.map((item) => (
                <li key={item} className="flex items-start gap-2.5" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                  <span className="font-bold mt-0.5 shrink-0" style={{ color: plan.color }}>✓</span>
                  <span className="text-white/75 text-sm">{item}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Link
              href="/auth?plan=gold&mode=register"
              className="w-full py-3.5 rounded-xl text-sm font-bold tracking-widest text-center transition-all block"
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                background: 'linear-gradient(135deg, #C9A84C, #F0D080)',
                color: '#0A0A0A',
              }}
            >
              COMMENCER MAINTENANT
            </Link>
          </div>
        </div>

        {/* Legal note */}
        <p className="text-white/30 text-xs text-center mt-10 leading-relaxed">
          Les performances passées ne garantissent pas les performances futures.
          Les paris sportifs comportent des risques. +18 uniquement.
        </p>
      </div>
    </section>
  );
}

export default PricingSection;

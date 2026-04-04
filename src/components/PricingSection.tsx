import Link from "next/link";

const advantages = [
  "Analyses illimitées Football, Basketball, Tennis",
  "Rapport structuré en 10 points",
  "Classification GOLD / SILVER / NO BET",
  "Probabilités estimées par résultat",
  "Données H2H et forme récente",
  "Absences et contexte physique",
  "Red flags et value bets",
  "Historique de toutes vos analyses",
  "Accès dashboard 24h/24",
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-bebas text-[clamp(2.5rem,6vw,5rem)] gold-gradient tracking-wide mb-4">
            ABONNEMENT
          </h2>
          <p className="text-white/50 text-base max-w-xl mx-auto">
            Un accès complet à toutes les fonctionnalités. Sans engagement.
          </p>
        </div>

        {/* Single pricing card */}
        <div className="max-w-lg mx-auto">
          <div className="card-dark rounded-2xl p-10 border border-[#C9A84C]/40 gold-glow flex flex-col gap-8 relative overflow-hidden">
            {/* Top glow accent */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #C9A84C, transparent)",
              }}
            />

            {/* Badge + price */}
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="inline-flex items-center gap-1.5 bg-[#C9A84C]/10 border border-[#C9A84C]/40 text-[#C9A84C] text-xs font-bold tracking-widest px-4 py-1.5 rounded-full uppercase">
                ACCÈS COMPLET
              </span>
              <div className="flex items-end gap-1 mt-2">
                <span className="font-bebas text-[5rem] leading-none gold-gradient tracking-wide">
                  20€
                </span>
                <span className="text-white/40 text-base mb-3">/mois</span>
              </div>
            </div>

            {/* Advantages list */}
            <ul className="flex flex-col gap-3">
              {advantages.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/75">
                  <span className="text-[#C9A84C] font-bold mt-0.5 shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="flex flex-col gap-3">
              <Link
                href="/auth"
                className="btn-gold px-8 py-4 text-base rounded-lg text-center w-full"
              >
                S&apos;ABONNER MAINTENANT
              </Link>
              <p className="text-white/35 text-xs text-center">
                Paiement sécurisé par Stripe • Résiliable à tout moment
              </p>
            </div>
          </div>

          {/* Legal note */}
          <p className="text-white/30 text-xs text-center mt-6 leading-relaxed">
            Les performances passées ne garantissent pas les performances futures.
          </p>
        </div>
      </div>
    </section>
  );
}

export default PricingSection;

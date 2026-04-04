"use client";

import { useState } from "react";

const faqs = [
  {
    question: "Comment fonctionne Oracle Bet ?",
    answer:
      "L'IA analyse de nombreuses données (forme récente, H2H, absences, contexte physique, statistiques avancées) pour produire un rapport structuré en 10 points avec des probabilités estimées.",
  },
  {
    question: "Quelle est la fiabilité des analyses ?",
    answer:
      "Notre taux de réussite moyen est de 73%. Les analyses GOLD (75%+) ont un taux de réussite plus élevé. Nous ne garantissons aucun gain, les paris comportent toujours un risque.",
  },
  {
    question: "Quels sports sont couverts ?",
    answer:
      "Football (Ligue 1, Premier League, Champions League, La Liga, Serie A, Bundesliga), Basketball (NBA, Euroleague) et Tennis (Grand Chelem, ATP, WTA).",
  },
  {
    question: "Comment accéder au dashboard ?",
    answer:
      "Après inscription et paiement de l'abonnement (20€/mois via Stripe), vous accédez immédiatement au dashboard d'analyse.",
  },
  {
    question: "Puis-je annuler mon abonnement ?",
    answer:
      "Oui, à tout moment depuis votre espace client. Vous conservez l'accès jusqu'à la fin de la période payée.",
  },
  {
    question: "Combien d'analyses puis-je faire ?",
    answer: "Analyses illimitées pour tous les sports disponibles.",
  },
  {
    question: "Les cotes sont-elles incluses dans l'analyse ?",
    answer:
      "Vous pouvez renseigner les cotes Bet365/Unibet pour que l'IA intègre la valeur dans son analyse.",
  },
  {
    question: "L'IA utilise-t-elle des données en temps réel ?",
    answer:
      "Oui, l'IA a accès aux données les plus récentes disponibles pour chaque analyse.",
  },
  {
    question: "Est-ce légal ?",
    answer:
      "Oui, Oracle Bet est un service d'analyse et de conseil. Les paris sont effectués sur des sites agréés par l'ANJ (Autorité Nationale des Jeux).",
  },
  {
    question: "Comment est calculée la probabilité ?",
    answer:
      "L'IA combine forme récente, H2H, statistiques avancées (xG, xGA), absences, contexte physique et enjeux pour estimer des probabilités pour chaque issue du match.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="font-bebas text-[clamp(2.5rem,6vw,5rem)] gold-gradient tracking-wide mb-4">
            FAQ
          </h2>
          <p className="text-white/50 text-base max-w-xl mx-auto">
            Toutes les réponses à vos questions sur Oracle Bet.
          </p>
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className={`card-dark rounded-xl border transition-all duration-300 ${
                  isOpen
                    ? "border-[#C9A84C]/50"
                    : "border-[#C9A84C]/15 hover:border-[#C9A84C]/35"
                }`}
              >
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left group"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-sm font-semibold tracking-wide transition-colors duration-200 ${
                      isOpen ? "text-[#C9A84C]" : "text-white/80 group-hover:text-white"
                    }`}
                  >
                    {faq.question}
                  </span>
                  <span
                    className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full border transition-all duration-300 ${
                      isOpen
                        ? "border-[#C9A84C] bg-[#C9A84C]/10 rotate-45"
                        : "border-white/20 group-hover:border-[#C9A84C]/50"
                    }`}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      className={`transition-colors duration-200 ${
                        isOpen ? "text-[#C9A84C]" : "text-white/50"
                      }`}
                    >
                      <path
                        d="M5 1v8M1 5h8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </button>

                {/* Answer */}
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="px-6 pb-5 text-sm text-white/55 leading-relaxed border-t border-[#C9A84C]/10 pt-4">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FAQSection;

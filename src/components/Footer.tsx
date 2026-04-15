import Link from "next/link";

const navLinks = [
  { label: "Accueil", href: "/" },
  { label: "Fonctionnalités", href: "#features" },
  { label: "Sports", href: "#sports" },
  { label: "Tarifs", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const sportsLinks = [
  { label: "Football", href: "#sports" },
  { label: "Basketball", href: "#sports" },
  { label: "Tennis", href: "#sports" },
];

const legalLinks = [
  { label: "Mentions légales", href: "/legal/mentions-legales" },
  { label: "CGU", href: "/legal/cgu" },
  { label: "Confidentialité", href: "/legal/confidentialite" },
  { label: "Remboursement", href: "/legal/remboursement" },
];

export function Footer() {
  return (
    <footer className="border-t border-[#C9A84C]/10 pt-12 pb-6"
      style={{ background: "rgba(6,6,6,0.98)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Responsible gambling */}
        <div className="mb-10 border border-orange-500/30 bg-orange-950/20 rounded-xl px-5 py-4">
          <p className="text-orange-300/80 text-sm leading-relaxed">
            <span className="font-semibold text-orange-300">⚠️ AVERTISSEMENT</span> — Les paris sportifs comportent des risques.
            Jouez de manière responsable. Interdit aux mineurs de moins de 18 ans.
            Si vous avez des problèmes avec le jeu, contactez{" "}
            <span className="font-bold text-orange-200">Joueurs Info Service</span> :{" "}
            <span className="font-bold text-orange-200">09 74 75 13 13</span>{" "}
            (appel non surtaxé, 7j/7, 24h/24).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl leading-none"
                style={{ filter: "drop-shadow(0 0 6px rgba(201,168,76,0.5))" }}>⚡</span>
              <span className="text-xl tracking-widest gold-gradient"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                ORACLE BET
              </span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed mb-5">
              L&apos;IA au service de vos paris sportifs.
            </p>

            {/* Social */}
            <div className="flex items-center gap-3">
              {[
                {
                  label: "Twitter/X",
                  href: "https://twitter.com",
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.743l7.73-8.835L1.254 2.25H8.08l4.254 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                    </svg>
                  ),
                },
                {
                  label: "Telegram",
                  href: "https://telegram.org",
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                  ),
                },
                {
                  label: "Instagram",
                  href: "https://instagram.com",
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  ),
                },
              ].map(({ label, href, icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                  aria-label={label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-[#C9A84C] border border-white/8 hover:border-[#C9A84C]/30 transition-all duration-200">
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-bold tracking-widest text-[#C9A84C] mb-4 uppercase">Navigation</h4>
            <ul className="flex flex-col gap-2.5">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-white/40 text-sm hover:text-[#C9A84C] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Sports */}
          <div>
            <h4 className="text-sm font-bold tracking-widest text-[#C9A84C] mb-4 uppercase">Sports</h4>
            <ul className="flex flex-col gap-2.5">
              {sportsLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-white/40 text-sm hover:text-[#C9A84C] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-bold tracking-widest text-[#C9A84C] mb-4 uppercase">Légal</h4>
            <ul className="flex flex-col gap-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-white/40 text-sm hover:text-[#C9A84C] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.05] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/25 text-xs">
            © 2025 Oracle Bet. Tous droits réservés.
          </p>
          <p className="text-white/20 text-xs">
            Service d&apos;analyse et de conseil sportif — Jeu responsable
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

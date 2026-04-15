"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const navLinks = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Sports", href: "#sports" },
  { label: "Tarifs", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? "rgba(8,8,8,0.95)"
          : "rgba(8,8,8,0.7)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: scrolled
          ? "1px solid rgba(201,168,76,0.18)"
          : "1px solid rgba(201,168,76,0.08)",
        boxShadow: scrolled ? "0 4px 32px rgba(0,0,0,0.5)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <span
              className="text-xl leading-none transition-transform duration-300 group-hover:scale-110"
              style={{ filter: "drop-shadow(0 0 8px rgba(201,168,76,0.6))" }}
            >
              ⚡
            </span>
            <span
              className="text-2xl tracking-widest gold-gradient"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              ORACLE BET
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative text-sm font-medium tracking-wider text-white/55 hover:text-white transition-colors duration-200 group"
              >
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-gradient-to-r from-[#C9A84C] to-[#F0D080] transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/auth"
              className="btn-outline-gold px-5 py-2 text-xs rounded-lg"
            >
              CONNEXION
            </Link>
            <Link
              href="/auth?mode=register"
              className="btn-gold px-5 py-2 text-xs rounded-lg"
            >
              COMMENCER
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span className={`block w-5 h-0.5 bg-[#C9A84C] transition-all duration-300 origin-center ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-[#C9A84C] transition-all duration-300 ${menuOpen ? "opacity-0 scale-x-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-[#C9A84C] transition-all duration-300 origin-center ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}`}
        style={{ borderTop: menuOpen ? "1px solid rgba(201,168,76,0.12)" : "none" }}
      >
        <div className="px-4 pb-6 pt-4 flex flex-col gap-1" style={{ background: "rgba(8,8,8,0.98)" }}>
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="px-3 py-2.5 text-sm font-medium tracking-wider text-white/60 hover:text-[#C9A84C] hover:bg-white/[0.03] rounded-lg transition-all"
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-white/5">
            <Link
              href="/auth"
              className="btn-outline-gold px-4 py-2.5 text-xs rounded-lg text-center"
              onClick={() => setMenuOpen(false)}
            >
              CONNEXION
            </Link>
            <Link
              href="/auth?mode=register"
              className="btn-gold px-4 py-2.5 text-xs rounded-lg text-center"
              onClick={() => setMenuOpen(false)}
            >
              COMMENCER GRATUITEMENT
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;

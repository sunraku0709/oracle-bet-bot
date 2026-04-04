"use client";

import { useState } from "react";
import Link from "next/link";

const navLinks = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Sports", href: "#sports" },
  { label: "Tarifs", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#C9A84C]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-[#AAFF00] text-2xl leading-none">⚡</span>
            <span className="font-bebas text-2xl tracking-widest gold-gradient">
              ORACLE BET
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-semibold tracking-wider text-white/70 hover:text-[#C9A84C] transition-colors duration-200 uppercase"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/auth"
              className="btn-outline-gold px-4 py-2 text-sm rounded"
            >
              SE CONNECTER
            </Link>
            <Link
              href="/auth"
              className="btn-gold px-4 py-2 text-sm rounded"
            >
              ESSAI GRATUIT
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2 text-white"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span
              className={`block w-6 h-0.5 bg-[#C9A84C] transition-transform duration-300 ${
                menuOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-[#C9A84C] transition-opacity duration-300 ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 bg-[#C9A84C] transition-transform duration-300 ${
                menuOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0A0A0A] border-t border-[#C9A84C]/20 px-4 pb-6 pt-4 flex flex-col gap-4 animate-fade-in-up">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-sm font-semibold tracking-wider text-white/70 hover:text-[#C9A84C] transition-colors uppercase py-1"
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/auth"
              className="btn-outline-gold px-4 py-2 text-sm rounded text-center"
              onClick={() => setMenuOpen(false)}
            >
              SE CONNECTER
            </Link>
            <Link
              href="/auth"
              className="btn-gold px-4 py-2 text-sm rounded text-center"
              onClick={() => setMenuOpen(false)}
            >
              ESSAI GRATUIT
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;

import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWAProvider from "@/components/PWAProvider";

// ── Viewport (separate export as required by Next.js 14+) ───────────────────
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)",  color: "#FFD700" },
    { media: "(prefers-color-scheme: light)", color: "#FFD700" },
  ],
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover", // needed for iPhone notch / safe-area
};

// ── Page metadata ────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  // Core
  title: {
    default: "Oracle Bet — Analyses IA pour Paris Sportifs",
    template: "%s | Oracle Bet",
  },
  description:
    "Analyses sportives ultra-précises propulsées par l'intelligence artificielle. Fiabilité 65-85%. Football, Basketball, Tennis.",
  keywords: "paris sportifs, analyse IA, pronostics football, basketball, tennis",
  authors: [{ name: "Oracle Bet" }],
  creator: "Oracle Bet",

  // PWA manifest
  manifest: "/manifest.json",

  // Apple / iOS PWA
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Oracle Bet",
    startupImage: [
      // iPhone 12 Pro Max
      {
        url: "/icons/icon-512.png",
        media:
          "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)",
      },
    ],
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://www.oracle-bet.fr",
    siteName: "Oracle Bet",
    title: "Oracle Bet — Analyses IA pour Paris Sportifs",
    description:
      "Analyses sportives ultra-précises propulsées par l'IA. GOLD, SILVER, NO BET.",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Oracle Bet",
      },
    ],
  },

  // Twitter / X
  twitter: {
    card: "summary",
    title: "Oracle Bet",
    description: "Analyses sportives IA — Football, Basketball, Tennis",
    images: ["/icons/icon-512.png"],
  },

  // Icons
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icons/icon-192.png",
  },

  // Canonical — tells Google the preferred URL to index
  alternates: {
    canonical: "https://www.oracle-bet.fr",
  },

  // Misc
  applicationName: "Oracle Bet",
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <head>
        {/* Explicit apple-mobile-web-app tags (belt-and-suspenders over Next metadata) */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Oracle Bet" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-white">
        {children}
        {/* PWA: service worker registration + iOS/Android install banners */}
        <PWAProvider />
      </body>
    </html>
  );
}

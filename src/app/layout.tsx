import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oracle Bet - Analyses IA pour Paris Sportifs",
  description: "Analyses sportives ultra-précises propulsées par l'intelligence artificielle. Fiabilité 65-85%. Football, Basketball, Tennis.",
  keywords: "paris sportifs, analyse IA, pronostics football, basketball, tennis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-white">
        {children}
      </body>
    </html>
  );
}

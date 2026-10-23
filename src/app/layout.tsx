import type { Metadata } from "next";
import {
  Chakra_Petch,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "MadaBracket — Organisation de Tournois, Inscriptions & Résultats",
  description:
    "Plateforme complète dédiée à l'organisation de tournois compétitifs, à la gestion des inscriptions, aux tableaux à élimination directe et aux résultats en direct.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${chakraPetch.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="min-h-screen bg-[#0A0D14] text-[#F8FAFC] font-sans antialiased selection:bg-[#FF3B30]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { EntryDisclaimer } from "@/components/preconia/EntryDisclaimer";
import "./globals.css";

const sans = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const TITLE =
  "PRECONIA — Aide à la prescription des fauteuils roulants (VPH) · Nomenclature LPPR 2025";
const DESCRIPTION =
  "Aide gratuite à la prescription et à la préconisation des fauteuils roulants et VPH (nomenclature VPH 2025) : catégorie LPPR, classe, prescripteur, codes LPP et tarifs, adjonctions, positionnement PAP, forfaits MAD et livraison, location LLD/LCD, cumul. Aide à la décision non opposable (MPR).";

export const metadata: Metadata = {
  metadataBase: new URL("https://preconia.fr"),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "prescription fauteuil roulant",
    "aide prescription fauteuil",
    "prescription VPH",
    "aide prescription VPH",
    "préconisation VPH",
    "nomenclature VPH",
    "nomenclature VPH 2025",
    "nomenclature fauteuil roulant",
    "réforme fauteuil roulant 2025",
    "LPPR fauteuil roulant",
    "codes LPP VPH",
    "fiche de préconisation VPH",
    "cumul VPH",
    "forfait MAD fauteuil roulant",
  ],
  // Vérification Google Search Console (méthode « Balise HTML »).
  verification: { google: "lU1B5PnT8isi3CwpZQdZkaYILExzsT02RaYBTaertlo" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://preconia.fr",
    siteName: "PRECONIA",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: "PRECONIA",
    statusBarStyle: "default",
  },
  // compat iOS plus anciens (mode standalone) en plus du standard mobile-web-app-capable
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#0C6B66",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <EntryDisclaimer>{children}</EntryDisclaimer>
        {/* Statistiques de visite agrégées & anonymes (sans cookies, RGPD).
            À activer une fois dans le dashboard Vercel → onglet Analytics. */}
        <Analytics />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { PasswordGate } from "@/components/preconia/PasswordGate";
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

const DESCRIPTION =
  "Du profil fonctionnel à la catégorie LPPR, ses adjonctions facturables et son positionnement. Aide à la décision non opposable (MPR).";

export const metadata: Metadata = {
  metadataBase: new URL("https://preconia.vercel.app"),
  title: "PRECONIA — Aide à la préconisation des VPH",
  description: DESCRIPTION,
  openGraph: {
    title: "PRECONIA — Aide à la préconisation des VPH",
    description: DESCRIPTION,
    url: "https://preconia.vercel.app",
    siteName: "PRECONIA",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PRECONIA — Aide à la préconisation des VPH",
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
        <PasswordGate>{children}</PasswordGate>
        {/* Statistiques de visite agrégées & anonymes (sans cookies, RGPD).
            À activer une fois dans le dashboard Vercel → onglet Analytics. */}
        <Analytics />
      </body>
    </html>
  );
}

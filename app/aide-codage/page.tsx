import type { Metadata, Viewport } from "next";
import { CodageEngineCard } from "@/components/preconia/CodageEngineCard";
import { CodageHeader } from "@/components/preconia/CodageSeoChrome";
import { CodageSeoContent } from "@/components/preconia/CodageSeoContent";

const URL = "https://preconia.fr/aide-codage";
const TITLE = "PRECONIA Aide au codage — CIM-10, CCAM, NGAP et LPP";
const DESCRIPTION =
  "Aide au codage médical : recherchez un diagnostic (CIM-10-FR 2026), un acte technique (CCAM) ou clinique (NGAP), ou un dispositif remboursé (LPP) par code, libellé ou mot-clé. Outil search-first pour les professionnels de santé, adossé aux référentiels officiels.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/aide-codage" },
  keywords: [
    "aide au codage",
    "codage CIM-10",
    "CIM-10 FR 2026",
    "codage CCAM",
    "recherche acte CCAM",
    "NGAP",
    "nomenclature générale des actes professionnels",
    "codage LPP",
    "liste des produits et prestations",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: "PRECONIA", type: "website", locale: "fr_FR" },
};

/* thème navigateur bleu marine pour cette section (le reste du site reste pétrole) */
export const viewport: Viewport = { themeColor: "#16324f" };

export default function AideCodagePage() {
  return (
    <div className="cc-page">
      {/* barre unique de la partie Aide au codage (identique sur les pages guides) */}
      <CodageHeader />

      {/* hero centré avec la barre de recherche */}
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-58px)] max-w-[1080px] flex-col items-center px-5 pb-24 pt-16 sm:pt-24">
        <div className="cc-rise font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0ea5e9]">
          ▸ PRECONIA · Aide au codage
        </div>
        <h1
          className="cc-rise mt-4 text-center text-[34px] font-bold leading-[1.08] tracking-tight text-[#0c2740] sm:text-[46px]"
          style={{ "--cc-rise-i": 1 } as React.CSSProperties}
        >
          Aide au codage
        </h1>
        <p
          className="cc-rise mt-4 max-w-[62ch] text-center text-[15px] leading-relaxed text-ink-soft"
          style={{ "--cc-rise-i": 2 } as React.CSSProperties}
        >
          Recherchez un <b className="font-semibold text-[#0c2740]">diagnostic</b> (CIM-10), un{" "}
          <b className="font-semibold text-[#0c2740]">acte</b> technique (CCAM) ou clinique (NGAP),
          ou un <b className="font-semibold text-[#0c2740]">dispositif</b> remboursé (LPP) : code,
          libellé ou mot-clé.
        </p>

        {/* encart « métallisé » du moteur (panneau verre + bandeau marine → bleu ciel) */}
        <CodageEngineCard
          className="cc-rise mt-8"
          style={{ "--cc-rise-i": 3 } as React.CSSProperties}
        />

        {/* contenu éditorial indexable : guides par nomenclature, FAQ, JSON-LD */}
        <div className="cc-rise w-full" style={{ "--cc-rise-i": 4 } as React.CSSProperties}>
          <CodageSeoContent />
        </div>

        <p
          className="cc-rise mt-10 max-w-[60ch] text-center text-[11px] leading-relaxed text-ink-soft/70"
          style={{ "--cc-rise-i": 4 } as React.CSSProperties}
          lang="fr"
        >
          Aide au codage à destination des professionnels de santé — indicative et non opposable ;
          seuls les référentiels officiels de l&apos;Assurance maladie font foi.
        </p>
      </main>
    </div>
  );
}

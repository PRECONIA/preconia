import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Logo } from "@/components/preconia/Logo";
import { CodageEngineCard } from "@/components/preconia/CodageEngineCard";
import { CodageFavoris } from "@/components/preconia/CodageFavoris";
import { CodageNav } from "@/components/preconia/CodageSeoChrome";
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
      {/* en-tête bleu marine — même hauteur que la barre d'ancrage du site principal */}
      <header className="cc-header">
        {/* même gabarit (1240px) que la barre du site VPH : les logos restent
            exactement au même endroit quand on bascule d'une partie à l'autre */}
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-5 px-5 py-4">
          {/* marque + volet roulant « Préconisation VPH » au survol du logo (symétrique) */}
          <div className="group relative shrink-0">
            <Link href="/aide-codage" className="flex items-center gap-2.5">
              <Logo variant="navy" className="h-11 w-11 drop-shadow-sm" />
              <span className="leading-none">
                <span className="block text-[17px] font-bold tracking-tight text-[#0c2740]">
                  PRECONIA <span className="text-[#0ea5e9]">Aide au codage</span>
                </span>
                <span className="mt-0.5 hidden text-[8.5px] font-semibold uppercase tracking-[0.18em] text-[#1d4e7c] sm:block">
                  Diagnostics CIM-10 · Actes CCAM
                </span>
              </span>
            </Link>
            <div className="invisible absolute left-0 top-full z-50 -translate-y-2 pt-[22px] opacity-0 transition-all duration-200 ease-out group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <Link
                href="/preconia"
                className="flex w-72 items-center gap-3 rounded-2xl border border-petrol/30 bg-white/85 px-4 py-3 shadow-[0_18px_44px_-18px_rgba(7,63,60,0.5)] backdrop-blur-xl transition-transform hover:-translate-y-0.5"
              >
                <Logo className="h-10 w-10 shrink-0" />
                <span className="leading-tight">
                  <span className="block text-[14.5px] font-bold tracking-tight text-ink">
                    PRECON<span className="text-petrol">IA</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-soft">
                    Aide à la préconisation VPH — ouvrir ↗
                  </span>
                </span>
              </Link>
            </div>
          </div>
          {/* ancres des quatre pages guides — desktop */}
          <CodageNav className="hidden flex-1 items-center justify-center gap-1 lg:flex" />
          {/* favoris (codes épinglés) + contact — l'accès à la préconisation VPH
              passe par le volet roulant du logo */}
          <div className="flex shrink-0 items-center gap-2.5">
            <CodageFavoris />
            <Link
              href="/contact"
              className="cc-btn inline-flex items-center rounded-xl px-5 py-3 text-[13.5px] font-semibold text-white"
            >
              Contact
            </Link>
          </div>
        </div>
        {/* ancres — mobile : rangée défilante */}
        <CodageNav className="flex gap-1 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden" />
      </header>

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

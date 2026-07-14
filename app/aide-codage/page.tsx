import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Logo } from "@/components/preconia/Logo";
import { CodageCcam } from "@/components/preconia/CodageCcam";

const URL = "https://preconia.vercel.app/aide-codage";
const TITLE = "PRECONIA Aide au codage CCAM — recherche d'actes et de codes";
const DESCRIPTION =
  "Aide au codage CCAM : recherchez un acte médical, son code et son tarif. Outil search-first pour les professionnels de santé, adossé à la Classification Commune des Actes Médicaux.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/aide-codage" },
  keywords: [
    "codage CCAM",
    "aide au codage CCAM",
    "recherche acte CCAM",
    "code CCAM",
    "classification commune des actes médicaux",
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
        <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-5 px-5 py-4">
          {/* marque + volet roulant « Préconisation VPH » au survol du logo (symétrique) */}
          <div className="group relative shrink-0">
            <Link href="/aide-codage" className="flex items-center gap-2.5">
              <Logo variant="navy" className="h-11 w-11 drop-shadow-sm" />
              <span className="leading-none">
                <span className="block text-[17px] font-bold tracking-tight text-[#0c2740]">
                  PRECONIA <span className="text-[#0ea5e9]">Aide au codage</span>
                </span>
                <span className="mt-0.5 hidden text-[8.5px] font-semibold uppercase tracking-[0.18em] text-[#1d4e7c] sm:block">
                  Classification commune des actes médicaux
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
          <Link
            href="/preconia"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-petrol/30 bg-white/70 px-3.5 py-2.5 text-[12.5px] font-semibold text-petrol-deep backdrop-blur transition-colors hover:border-petrol"
          >
            <Logo className="h-5 w-5" />
            Préconisation VPH ↗
          </Link>
        </div>
      </header>

      {/* hero centré avec la barre de recherche */}
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-58px)] max-w-[1080px] flex-col items-center px-5 pb-24 pt-16 sm:pt-24">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0ea5e9]">
          ▸ PRECONIA · Aide au codage
        </div>
        <h1 className="mt-4 text-center text-[34px] font-bold leading-[1.08] tracking-tight text-[#0c2740] sm:text-[46px]">
          Aide au codage CCAM
        </h1>
        <p className="mt-4 max-w-[56ch] text-center text-[15px] leading-relaxed text-ink-soft">
          Recherchez un acte de la Classification Commune des Actes Médicaux : saisissez un code, un
          libellé ou une région anatomique pour retrouver l&apos;acte correspondant.
        </p>

        <div className="mt-8 w-full">
          <CodageCcam />
        </div>

        <p className="mt-10 max-w-[60ch] text-center text-[11px] leading-relaxed text-ink-soft/70" lang="fr">
          Aide au codage à destination des professionnels de santé — indicative et non opposable ;
          seuls les référentiels officiels de l&apos;Assurance maladie font foi.
        </p>
      </main>
    </div>
  );
}

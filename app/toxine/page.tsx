import type { Metadata, Viewport } from "next";
import { ToxineHeader } from "@/components/preconia/ToxineHeader";
import { ToxineStudio } from "@/components/preconia/toxine/ToxineStudio";

const URL = "https://preconia.fr/toxine";
const TITLE = "PRECONIA Toxine — repérage 3D des sites d'injection (prototype)";
const DESCRIPTION =
  "Prototype : repérage visuel en 3D des muscles cibles de la toxine botulique (membres supérieur et inférieur), avec coupe axiale, échographie et simulation des points d'injection. Outil de démonstration, sans valeur clinique.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/toxine" },
  // prototype : on n'indexe pas encore ce pan
  robots: { index: false, follow: false },
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, siteName: "PRECONIA", type: "website", locale: "fr_FR" },
};

/* thème navigateur Bordeaux pour ce pan (les autres pans gardent leur couleur) */
export const viewport: Viewport = { themeColor: "#4A1024" };

export default function ToxinePage() {
  return (
    <div className="tx-page">
      <ToxineHeader />
      <main className="pg-cascade relative z-10 mx-auto max-w-[1080px] px-5 pb-24 pt-10">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C0546E]">
          ▸ PRECONIA · Toxine
        </div>
        <h1 className="mt-3 text-[30px] font-bold leading-[1.1] tracking-tight text-[#4A1024] sm:text-[42px]">
          Repérage des sites d&apos;injection
        </h1>
        <p className="mt-3 max-w-[64ch] text-[15px] leading-relaxed text-ink-soft">
          Cherchez un muscle du <b className="text-[#4A1024]">membre supérieur</b> : le modèle 3D
          met en évidence le muscle cible dans son contexte, avec une coupe axiale temps réel et
          les repères pour l&apos;injection de toxine botulique.
        </p>

        <div className="mt-8">
          <ToxineStudio />
        </div>

        <p className="mt-10 max-w-[62ch] text-[11px] leading-relaxed text-ink-soft/70" lang="fr">
          Prototype de démonstration destiné aux professionnels de santé. Anatomie 3D réelle
          (modèle Open3D, CC BY-SA 4.0) ; sites d&apos;injection, profondeurs et doses non
          renseignés — aucune valeur clinique, à ne pas utiliser pour un geste. Les données
          définitives seront transcrites d&apos;ouvrages publiés et validées.
        </p>
      </main>
    </div>
  );
}

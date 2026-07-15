/* Encart « métallisé » du moteur de codage : panneau verre + liseré signature +
   bandeau dégradé bleu marine → bleu ciel (.cc-band-hero). Utilisé par le hub
   /aide-codage et par chaque page guide (avec l'onglet de sa nomenclature ouvert).
   Rendu serveur ; seul le moteur (CodageTabs) est un îlot client. */

import { CodageTabs, type CodageTab } from "@/components/preconia/CodageTabs";

export function CodageEngineCard({
  initial = "cim10",
  title = "Rechercher dans les nomenclatures officielles",
  sub = "CIM-10-FR 2026 · CCAM · NGAP · LPP — recherche instantanée, y compris en termes courants (« infiltration genou », « crise cardiaque »).",
  className = "",
  style,
}: {
  initial?: CodageTab;
  title?: string;
  sub?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section
      aria-label="Moteur de recherche des nomenclatures"
      className={`cc-panel w-full overflow-hidden ${className}`}
      style={style}
    >
      <div className="h-[3px] bg-gradient-to-r from-[#0c2740] via-[#1d4e7c] to-[#38bdf8]" />
      <div className="cc-band-hero px-5 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-white/90">{sub}</p>
      </div>
      <div className="px-4 py-6 sm:px-6">
        <CodageTabs initial={initial} />
      </div>
    </section>
  );
}

"use client";

/* Sélecteur entre les quatre nomenclatures de l'aide au codage (CIM-10, CCAM,
   NGAP, LPP). Contrôle segmenté bleu marine ; chaque moteur de recherche n'est
   monté que lorsque son onglet est actif (la base correspondante n'est chargée
   qu'à ce moment-là). `initial` permet aux pages guides d'ouvrir directement
   leur nomenclature. */

import { useState } from "react";
import { CodageCim10 } from "@/components/preconia/CodageCim10";
import { CodageCcam } from "@/components/preconia/CodageCcam";
import { CodageNgap } from "@/components/preconia/CodageNgap";
import { CodageLpp } from "@/components/preconia/CodageLpp";

export type CodageTab = "cim10" | "ccam" | "ngap" | "lpp";
type Tab = CodageTab;

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: "cim10", label: "Diagnostics", sub: "CIM-10" },
  { id: "ccam", label: "Actes techniques", sub: "CCAM" },
  { id: "ngap", label: "Actes cliniques", sub: "NGAP" },
  { id: "lpp", label: "Dispositifs", sub: "LPP" },
];

export function CodageTabs({ initial = "cim10" }: { initial?: Tab }) {
  const [tab, setTab] = useState<Tab>(initial);

  return (
    <div className="w-full">
      <div
        role="tablist"
        aria-label="Nomenclature"
        className="mx-auto mb-6 grid w-full max-w-[680px] grid-cols-2 gap-1 rounded-2xl border border-[#1d4e7c]/15 bg-white/60 p-1 backdrop-blur sm:grid-cols-4"
      >
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[13px] font-semibold leading-tight transition-all ${
                on
                  ? "bg-gradient-to-b from-[#1d4e7c] to-[#0c2740] text-white shadow-[0_6px_16px_-8px_rgba(12,42,68,0.7)]"
                  : "text-[#1d4e7c] hover:bg-[#e0f2fe]/60"
              }`}
            >
              {t.label}
              <span className={`font-mono text-[10px] ${on ? "text-[#8fd0f7]" : "text-[#0ea5e9]"}`}>
                {t.sub}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "cim10" && <CodageCim10 />}
      {tab === "ccam" && <CodageCcam />}
      {tab === "ngap" && <CodageNgap />}
      {tab === "lpp" && <CodageLpp />}
    </div>
  );
}

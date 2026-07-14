"use client";

/* Sélecteur entre les deux nomenclatures de l'aide au codage : diagnostics
   (CIM-10) et actes (CCAM). Contrôle segmenté bleu marine ; chaque moteur de
   recherche n'est monté que lorsque son onglet est actif (la base correspondante
   n'est chargée qu'à ce moment-là). */

import { useState } from "react";
import { CodageCim10 } from "@/components/preconia/CodageCim10";
import { CodageCcam } from "@/components/preconia/CodageCcam";

type Tab = "cim10" | "ccam";

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: "cim10", label: "Diagnostics", sub: "CIM-10" },
  { id: "ccam", label: "Actes", sub: "CCAM" },
];

export function CodageTabs() {
  const [tab, setTab] = useState<Tab>("cim10");

  return (
    <div className="w-full">
      <div
        role="tablist"
        aria-label="Nomenclature"
        className="mx-auto mb-6 flex w-full max-w-[420px] gap-1 rounded-2xl border border-[#1d4e7c]/15 bg-white/60 p-1 backdrop-blur"
      >
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-baseline justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                on
                  ? "bg-gradient-to-b from-[#1d4e7c] to-[#0c2740] text-white shadow-[0_6px_16px_-8px_rgba(12,42,68,0.7)]"
                  : "text-[#1d4e7c] hover:bg-[#e0f2fe]/60"
              }`}
            >
              {t.label}
              <span className={`font-mono text-[11px] ${on ? "text-[#8fd0f7]" : "text-[#0ea5e9]"}`}>
                {t.sub}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "cim10" ? <CodageCim10 /> : <CodageCcam />}
    </div>
  );
}

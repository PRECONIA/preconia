"use client";

/* Recherche dans la base nomenclature LPPR (produits VPH scrappés + adjonctions + forfaits PAP).
   Barre placée sous l'encart de préconisation. À terme : tout produit par dénomination ou code LPP. */

import { useMemo, useState } from "react";
import { lpprMeta } from "@/lib/data";
import { KIND_LABEL, searchCatalog, type CatalogKind } from "@/lib/search";

const KIND_STYLE: Record<CatalogKind, string> = {
  vph: "bg-petrol-tint text-petrol-deep",
  adjonction: "bg-paper text-ink-soft",
  pap: "bg-amber-tint text-amber",
};

function frDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function RechercheLpp() {
  const [q, setQ] = useState("");
  const results = useMemo(() => searchCatalog(q, 25), [q]);

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className="px-6 pb-5 pt-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Recherche nomenclature LPPR</h2>
          <span className="text-[11px] font-semibold text-red-600">
            Base mise à jour le {frDate(lpprMeta.lastUpdated)}
          </span>
        </div>
        <p className="mb-3 mt-1 text-xs text-ink-soft">
          Par dénomination, type, marque ou code LPP (fauteuils, adjonctions, positionnement).
        </p>

        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ex. « FRE classe C », « Vermeiren » ou « 4551435 »…"
          className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-petrol"
          aria-label="Recherche nomenclature LPPR"
        />

        {q.trim().length >= 2 && (
          <div className="mt-3">
            {results.length === 0 ? (
              <p className="px-1 py-2 text-sm text-ink-soft">Aucun résultat.</p>
            ) : (
              <ul className="divide-y divide-line-soft rounded-lg border border-line-soft">
                {results.map((r) => (
                  <li key={`${r.kind}-${r.code}`} className="flex items-start gap-3 px-3 py-2">
                    <span className="mt-0.5 shrink-0 font-mono text-[11px] text-ink-soft">{r.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug">{r.label}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-soft">{r.category}</span>
                    </span>
                    <span className="mt-0.5 flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[r.kind]}`}
                      >
                        {KIND_LABEL[r.kind]}
                      </span>
                      {r.brand && (
                        <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700">
                          {r.brand}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

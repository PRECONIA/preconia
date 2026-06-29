"use client";

/* Recherche dans la base nomenclature LPPR (produits VPH scrappés + adjonctions + forfaits PAP).
   Barre placée sous l'encart de préconisation, avec :
   - un placeholder animé « machine à écrire » (FRE, FRE-B, FMC, Marque, Code LPP),
   - des raccourcis donnant accès au catalogue complet par catégorie de véhicule. */

import { useEffect, useMemo, useState } from "react";
import { lpprMeta } from "@/lib/data";
import {
  catalogByCategory,
  KIND_LABEL,
  searchCatalog,
  vphCategories,
  type CatalogEntry,
  type CatalogKind,
} from "@/lib/search";

const KIND_STYLE: Record<CatalogKind, string> = {
  vph: "bg-petrol-tint text-petrol-deep",
  adjonction: "bg-paper text-ink-soft",
  pap: "bg-amber-tint text-amber",
};

/* Libellés courts + ordre des catégories de véhicules (raccourcis catalogue). */
const CAT_META: Record<string, { short: string; order: number }> = {
  "VPH non modulaires à propulsion manuelle ou à pousser": { short: "Manuel non modulaire", order: 1 },
  "VPH modulaires à propulsion manuelle ou à pousser": { short: "Manuel modulaire", order: 2 },
  "VPH modulaires à propulsion électrique": { short: "Électrique", order: 3 },
  Poussettes: { short: "Poussettes", order: 4 },
  "Bases roulantes modulaires": { short: "Bases", order: 5 },
  "Cycles modulaires à roues multiples": { short: "Cycles", order: 6 },
  "Scooters modulaires": { short: "Scooters", order: 7 },
};

const SHORTCUTS = [...vphCategories].sort(
  (a, b) => (CAT_META[a]?.order ?? 99) - (CAT_META[b]?.order ?? 99),
);

const TYPE_WORDS = ["FRE", "FRE-B", "FMC", "Marque", "Code LPP"];

function frDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Placeholder « machine à écrire » qui propose tour à tour les exemples de recherche. */
function useTypewriter(words: string[]): string {
  const [reduce] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false),
  );
  const [text, setText] = useState("");
  const [i, setI] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const word = words[i % words.length];
    const delay = !deleting ? (text.length < word.length ? 95 : 1500) : text.length > 0 ? 45 : 250;
    const t = window.setTimeout(() => {
      if (!deleting && text.length < word.length) setText(word.slice(0, text.length + 1));
      else if (!deleting) setDeleting(true);
      else if (text.length > 0) setText(word.slice(0, text.length - 1));
      else {
        setDeleting(false);
        setI((p) => p + 1);
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [text, deleting, i, words, reduce]);

  return reduce ? words[0] : text;
}

export function RechercheLpp() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const typed = useTypewriter(TYPE_WORDS);

  const results: CatalogEntry[] = useMemo(
    () => (category ? catalogByCategory(category) : searchCatalog(q, 25)),
    [q, category],
  );
  const showResults = category !== null || q.trim().length >= 2;

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
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value) setCategory(null);
          }}
          placeholder={`Rechercher… ${typed}▌`}
          className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-petrol"
          aria-label="Recherche nomenclature LPPR"
        />

        {/* Raccourcis : catalogue complet par catégorie de véhicule */}
        <div className="mt-3 flex flex-wrap gap-2">
          {SHORTCUTS.map((c) => {
            const on = category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategory(on ? null : c);
                  setQ("");
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  on
                    ? "border-petrol bg-petrol text-white"
                    : "border-line bg-card text-ink-soft hover:border-petrol hover:text-petrol-deep"
                }`}
              >
                {CAT_META[c]?.short ?? c}
              </button>
            );
          })}
        </div>

        {showResults && (
          <div className="mt-3">
            {category && (
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-petrol-deep">
                  Catalogue complet — {CAT_META[category]?.short ?? category}
                </span>
                <span className="text-[11px] text-ink-soft">{results.length} références</span>
              </div>
            )}
            {results.length === 0 ? (
              <p className="px-1 py-2 text-sm text-ink-soft">Aucun résultat.</p>
            ) : (
              <ul className="max-h-[360px] divide-y divide-line-soft overflow-y-auto rounded-lg border border-line-soft">
                {results.map((r) => (
                  <li key={`${r.kind}-${r.code}`} className="flex items-start gap-3 px-3 py-2">
                    <span className="mt-0.5 shrink-0 rounded bg-petrol-tint px-1.5 py-0.5 font-mono text-[11px] font-semibold text-petrol-deep">
                      {r.code}
                    </span>
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

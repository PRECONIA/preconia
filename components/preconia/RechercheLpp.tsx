"use client";

/* Recherche dans la base nomenclature LPPR (VPH + adjonctions + forfaits PAP), à jour de notre base.
   - recherche multi-termes : type + marque + nature + dénomination (ex. « FREP B otto », « PAP otto »),
   - boutons d'accès rapide : catégories VPH, Adjonctions, PAP-A, PAP-B,
   - sélecteur de marque pour filtrer sans taper,
   - placeholder « machine à écrire ». */

import { useEffect, useMemo, useState } from "react";
import { lpprMeta } from "@/lib/data";
import {
  allBrands,
  KIND_LABEL,
  searchCatalog,
  vphCategories,
  type CatalogEntry,
  type CatalogKind,
  type SearchFilters,
} from "@/lib/search";

const KIND_STYLE: Record<CatalogKind, string> = {
  vph: "bg-petrol-tint text-petrol-deep",
  adjonction: "bg-paper text-ink-soft",
  pap: "bg-amber-tint text-amber",
};

/* Libellés courts + ordre des catégories de véhicules. */
const CAT_META: Record<string, { short: string; order: number }> = {
  "VPH non modulaires à propulsion manuelle ou à pousser": { short: "Manuel non modulaire", order: 1 },
  "VPH modulaires à propulsion manuelle ou à pousser": { short: "Manuel modulaire", order: 2 },
  "VPH modulaires à propulsion électrique": { short: "Électrique", order: 3 },
  Poussettes: { short: "Poussettes", order: 4 },
  "Bases roulantes modulaires": { short: "Bases", order: 5 },
  "Cycles modulaires à roues multiples": { short: "Cycles", order: 6 },
  "Scooters modulaires": { short: "Scooters", order: 7 },
};
const VPH_SHORTCUTS = [...vphCategories].sort(
  (a, b) => (CAT_META[a]?.order ?? 99) - (CAT_META[b]?.order ?? 99),
);
const NATURE_SHORTCUTS: { key: string; label: string }[] = [
  { key: "adjonction", label: "Adjonctions" },
  { key: "pap-a", label: "PAP-A" },
  { key: "pap-b", label: "PAP-B" },
];

const TYPE_WORDS = ["FREP-B", "OTTO", "PAP OTTO", "adjonction OTTO", "repose jambe", "Code LPP"];

function frDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function quickToFilters(quick: string | null): SearchFilters {
  if (!quick) return {};
  if (quick === "adjonction") return { kind: "adjonction" };
  if (quick === "pap-a") return { kind: "pap", papForfait: "A" };
  if (quick === "pap-b") return { kind: "pap", papForfait: "B" };
  return { category: quick }; // catégorie VPH
}
function quickLabel(quick: string): string {
  return (
    NATURE_SHORTCUTS.find((n) => n.key === quick)?.label ?? CAT_META[quick]?.short ?? quick
  );
}

/** Placeholder « machine à écrire ». */
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

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
    on
      ? "border-petrol bg-petrol text-white"
      : "border-line bg-card text-ink-soft hover:border-petrol hover:text-petrol-deep"
  }`;

export function RechercheLpp() {
  const [q, setQ] = useState("");
  const [quick, setQuick] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | null>(null);
  const typed = useTypewriter(TYPE_WORDS);

  const results: CatalogEntry[] = useMemo(
    () => searchCatalog(q, { ...quickToFilters(quick), brand }, 40),
    [q, quick, brand],
  );
  const hasFilter = quick !== null || brand !== null;
  const showResults = q.trim().length >= 2 || hasFilter;

  const toggleQuick = (key: string) => setQuick((cur) => (cur === key ? null : key));
  const reset = () => {
    setQ("");
    setQuick(null);
    setBrand(null);
  };

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
          Par type, marque, nature ou code LPP — ex. « FREP B otto », « PAP otto », « repose jambe otto ».
        </p>

        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Rechercher… ${typed}▌`}
          className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-petrol"
          aria-label="Recherche nomenclature LPPR"
        />

        {/* Nature + marque */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {NATURE_SHORTCUTS.map((n) => (
            <button key={n.key} type="button" onClick={() => toggleQuick(n.key)} className={chip(quick === n.key)}>
              {n.label}
            </button>
          ))}
          <select
            value={brand ?? ""}
            onChange={(e) => setBrand(e.target.value || null)}
            aria-label="Filtrer par marque"
            className={`rounded-full border px-3 py-1.5 text-xs font-medium outline-none ${
              brand ? "border-orange-400 bg-orange-50 text-orange-800" : "border-line bg-card text-ink-soft"
            }`}
          >
            <option value="">Toutes les marques</option>
            {allBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          {(hasFilter || q) && (
            <button
              type="button"
              onClick={reset}
              className="text-xs font-medium text-ink-soft underline-offset-2 hover:text-petrol-deep hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>

        {/* Catégories VPH */}
        <div className="mt-2 flex flex-wrap gap-2">
          {VPH_SHORTCUTS.map((c) => (
            <button key={c} type="button" onClick={() => toggleQuick(c)} className={chip(quick === c)}>
              {CAT_META[c]?.short ?? c}
            </button>
          ))}
        </div>

        {showResults && (
          <div className="mt-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-petrol-deep">
                {quick ? quickLabel(quick) : "Résultats"}
                {brand ? ` · ${brand}` : ""}
              </span>
              <span className="text-[11px] text-ink-soft">{results.length} références</span>
            </div>
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
                      <span className="block text-sm leading-snug">
                        {r.token && (
                          <span className="mr-1.5 rounded bg-petrol px-1 py-0.5 font-mono text-[10px] font-semibold text-white">
                            {r.token}
                          </span>
                        )}
                        {r.label}
                      </span>
                      {r.models.length > 0 && (
                        <span className="mt-0.5 block truncate text-[11px] text-ink-soft">
                          {r.models.slice(0, 4).join(", ")}
                          {r.models.length > 4 ? "…" : ""}
                        </span>
                      )}
                      <span className="mt-0.5 block text-[11px] text-ink-soft">{r.category}</span>
                    </span>
                    <span className="mt-0.5 flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[r.kind]}`}>
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

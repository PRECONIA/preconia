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
  catalogSize,
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
  prestation: "bg-petrol text-white",
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
  { key: "lld", label: "Location LLD" },
  { key: "lcd", label: "Location LCD" },
  { key: "sav", label: "Réparations SAV" },
  { key: "mad", label: "MAD & livraison" },
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
  if (quick === "lld") return { kind: "prestation", category: "Location longue durée (LLD)" };
  if (quick === "lcd") return { kind: "prestation", category: "Location courte durée (LCD)" };
  if (quick === "sav") return { kind: "prestation", category: "Réparations & batteries (SAV)" };
  if (quick === "mad")
    return { kind: "prestation", category: "Mise à disposition & livraison (MAD)" };
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

/* Raccourcis en orange à texte blanc (façon bouton « Contact » de la barre d'ancrage).
   L'état sélectionné se distingue par un anneau clair et un léger assombrissement. */
const chip = (on: boolean) =>
  `w-full rounded-full bg-gradient-to-b from-[#f4732c] to-[#d94f08] px-3 py-1.5 text-center text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_12px_-6px_rgba(234,88,12,0.55)] transition-all hover:brightness-105 ${
    on ? "ring-2 ring-orange-300 ring-offset-1 brightness-90" : ""
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
    <section className="mt-5 overflow-hidden pc-panel">
      {/* bandeau de titre vert : distingue les modules outils du walker (encart blanc) */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 pc-band px-6 py-3">
        <h2 className="text-base font-semibold text-white"><span className="mr-2 font-mono text-[13px] font-semibold text-white/55">02</span>Recherche nomenclature LPPR</h2>
        <span className="flex items-center gap-2 text-[11px] font-semibold text-petrol-tint">
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-white">
            {catalogSize.toLocaleString("fr-FR")} codes LPP indexés
          </span>
          Base mise à jour le {frDate(lpprMeta.lastUpdated)}
        </span>
      </div>
      <div className="px-6 pb-5 pt-4">
        <p className="mb-3 mt-1 text-xs text-ink-soft">
          Par type, marque, nature ou code LPP — ex. « FREP B otto », « PAP otto », « repose jambe otto ».
        </p>

        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Rechercher… ${typed}▌`}
          className="w-full rounded-xl border border-orange-300/90 bg-white/75 px-3.5 py-2.5 text-sm shadow-[inset_0_1px_2px_rgba(7,63,60,0.05)] outline-none backdrop-blur transition-all focus:border-orange-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(234,88,12,0.15)]"
          aria-label="Recherche nomenclature LPPR"
        />

        {/* Filtres rapides (nature + catégories VPH) — boutons de largeur uniforme */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {NATURE_SHORTCUTS.map((n) => (
            <button key={n.key} type="button" onClick={() => toggleQuick(n.key)} className={chip(quick === n.key)}>
              {n.label}
            </button>
          ))}
          {VPH_SHORTCUTS.map((c) => (
            <button key={c} type="button" onClick={() => toggleQuick(c)} className={chip(quick === c)}>
              {CAT_META[c]?.short ?? c}
            </button>
          ))}
        </div>

        {/* Sélecteur de marque — pleine largeur (alignée sur la barre de recherche),
            encadré orange pour le mettre en évidence. */}
        <select
          value={brand ?? ""}
          onChange={(e) => setBrand(e.target.value || null)}
          aria-label="Filtrer par marque"
          className={`mt-3 w-full rounded-lg border-2 px-3 py-2.5 text-sm font-medium outline-none transition-colors ${
            brand
              ? "border-orange-500 bg-orange-50 text-orange-800"
              : "border-orange-300 bg-card text-ink-soft focus:border-orange-500"
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
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={reset}
              className="text-xs font-medium text-ink-soft underline-offset-2 hover:text-petrol-deep hover:underline"
            >
              Réinitialiser
            </button>
          </div>
        )}

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

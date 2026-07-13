"use client";

/* Moteur de recherche de VPH (accueil, sous le module cumul) : filtre par fabricant et/ou
   catégorie, résultats en grosses vignettes — nom du modèle en gras centré, marque, code LPPR.
   Chaque type de VPH porte une couleur (charte affichée au-dessus des résultats). La vignette
   est cliquable quand un bon de commande / fiche tarif constructeur est indexé dans la base
   (device-option-sheets) ; sinon mention « pas de fiche ». Données : device-models (CERAH). */

import { useMemo, useState } from "react";
import {
  deviceByCode,
  deviceModelsByType,
  deviceModelsMeta,
  deviceOptionSheetByToken,
} from "@/lib/data";

/* Couleur par type de VPH (classes Tailwind statiques — ne pas interpoler). */
const TYPE_COLOR: Record<string, { badge: string; border: string; code: string }> = {
  FMP: { badge: "bg-stone-600 text-white", border: "border-stone-400", code: "text-stone-700" },
  FMPR: { badge: "bg-slate-600 text-white", border: "border-slate-400", code: "text-slate-700" },
  FRM: { badge: "bg-teal-600 text-white", border: "border-teal-400", code: "text-teal-700" },
  FRMC: { badge: "bg-cyan-600 text-white", border: "border-cyan-400", code: "text-cyan-700" },
  FRMA: {
    badge: "bg-emerald-600 text-white",
    border: "border-emerald-400",
    code: "text-emerald-700",
  },
  FRMS: { badge: "bg-green-600 text-white", border: "border-green-400", code: "text-green-700" },
  FRMP: { badge: "bg-lime-600 text-white", border: "border-lime-400", code: "text-lime-700" },
  FRMV: { badge: "bg-sky-600 text-white", border: "border-sky-400", code: "text-sky-700" },
  FRE: { badge: "bg-blue-600 text-white", border: "border-blue-400", code: "text-blue-700" },
  FREP: {
    badge: "bg-indigo-600 text-white",
    border: "border-indigo-400",
    code: "text-indigo-700",
  },
  FREV: {
    badge: "bg-violet-600 text-white",
    border: "border-violet-400",
    code: "text-violet-700",
  },
  POU_S: { badge: "bg-pink-600 text-white", border: "border-pink-400", code: "text-pink-700" },
  POU_MRE: { badge: "bg-rose-600 text-white", border: "border-rose-400", code: "text-rose-700" },
  SCO: {
    badge: "bg-orange-600 text-white",
    border: "border-orange-400",
    code: "text-orange-700",
  },
  BASE: { badge: "bg-amber-600 text-white", border: "border-amber-400", code: "text-amber-700" },
  CYC: {
    badge: "bg-yellow-500 text-ink",
    border: "border-yellow-400",
    code: "text-yellow-700",
  },
};
const FALLBACK_COLOR = { badge: "bg-ink text-white", border: "border-line", code: "text-ink" };
const colorOf = (base: string) => TYPE_COLOR[base] ?? FALLBACK_COLOR;

interface Card {
  token: string; // FREP-B, FRM…
  base: string; // type sans classe : FREP, FRM…
  model: string;
  brand: string;
  lppr: string;
  sheetUrl: string | null;
}

/* Catalogue plat construit une fois : une vignette par (modèle, marque, type/classe). */
const ALL_CARDS: Card[] = Object.entries(deviceModelsByType)
  .flatMap(([token, byBrand]) =>
    Object.entries(byBrand).flatMap(([brand, entry]) =>
      entry.models.map((m) => ({
        token,
        base: token.split("-")[0],
        model: m.name,
        brand,
        lppr: m.code ?? entry.code,
        sheetUrl: deviceOptionSheetByToken[token]?.[brand]?.[m.name]?.url ?? null,
      })),
    ),
  )
  .sort(
    (a, b) =>
      a.token.localeCompare(b.token) ||
      a.brand.localeCompare(b.brand) ||
      a.model.localeCompare(b.model),
  );

const ALL_BRANDS = Array.from(new Set(ALL_CARDS.map((c) => c.brand))).sort((a, b) =>
  a.localeCompare(b),
);
const ALL_BASES = Array.from(new Set(ALL_CARDS.map((c) => c.base))).sort((a, b) =>
  a.localeCompare(b),
);
const baseLabel = (base: string) => deviceByCode[base]?.name ?? base;

function frDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function RechercheVph() {
  const [brand, setBrand] = useState<string | null>(null);
  const [base, setBase] = useState<string | null>(null);

  const cards = useMemo(() => {
    if (!brand && !base) return [];
    return ALL_CARDS.filter((c) => (!brand || c.brand === brand) && (!base || c.base === base));
  }, [brand, base]);

  // charte des couleurs : les types présents dans les résultats courants.
  const visibleBases = useMemo(() => Array.from(new Set(cards.map((c) => c.base))), [cards]);

  return (
    <section className="mt-5 overflow-hidden pc-panel">
      {/* bandeau de titre vert : distingue les modules outils du walker (encart blanc) */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 pc-band px-6 py-3">
        <h2 className="text-base font-semibold text-white"><span className="mr-2 font-mono text-[13px] font-semibold text-white/55">04</span>
          Recherche de VPH par fabricant et catégorie
        </h2>
        <span className="flex items-center gap-2 text-[11px] font-semibold text-petrol-tint">
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-white">
            {ALL_CARDS.length.toLocaleString("fr-FR")} modèles VPH indexés
          </span>
          Catalogue CERAH à jour le {frDate(deviceModelsMeta.lastUpdated)}
        </span>
      </div>
      <div className="px-6 pb-5 pt-4">
        <p className="mb-3 mt-1 text-xs text-ink-soft">
          Tous les modèles inscrits à la nomenclature. La vignette renvoie vers le bon de commande
          / la fiche tarif du constructeur lorsqu&apos;elle est disponible.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="vph-brand" className="mb-1.5 block text-sm font-semibold text-petrol-deep">
              Fabricant
            </label>
            <select
              id="vph-brand"
              value={brand ?? ""}
              onChange={(e) => setBrand(e.target.value || null)}
              className="w-full rounded-xl border border-orange-300/90 bg-white/75 px-3.5 py-2.5 text-sm shadow-[inset_0_1px_2px_rgba(7,63,60,0.05)] outline-none backdrop-blur transition-all focus:border-orange-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(234,88,12,0.15)]"
            >
              <option value="">— Tous les fabricants —</option>
              {ALL_BRANDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="vph-base" className="mb-1.5 block text-sm font-semibold text-petrol-deep">
              Catégorie de VPH
            </label>
            <select
              id="vph-base"
              value={base ?? ""}
              onChange={(e) => setBase(e.target.value || null)}
              className="w-full rounded-xl border border-orange-300/90 bg-white/75 px-3.5 py-2.5 text-sm shadow-[inset_0_1px_2px_rgba(7,63,60,0.05)] outline-none backdrop-blur transition-all focus:border-orange-500 focus:bg-white focus:shadow-[0_0_0_3px_rgba(234,88,12,0.15)]"
            >
              <option value="">— Toutes les catégories —</option>
              {ALL_BASES.map((b) => (
                <option key={b} value={b}>
                  {b} — {baseLabel(b)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!brand && !base ? (
          <p className="mt-4 rounded-xl border border-dashed border-line px-3 py-3 text-center text-sm text-ink-soft">
            Choisissez un fabricant et/ou une catégorie pour afficher les modèles.
          </p>
        ) : (
          <>
            {/* charte des couleurs (types présents dans les résultats) */}
            {visibleBases.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                  Charte
                </span>
                {visibleBases.map((b) => (
                  <span
                    key={b}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${colorOf(b).badge}`}
                  >
                    {b}
                    <span className="font-normal opacity-90">· {baseLabel(b)}</span>
                  </span>
                ))}
              </div>
            )}

            <div className="mb-2 mt-3 text-[11px] text-ink-soft">
              {cards.length} modèle{cards.length > 1 ? "s" : ""}
              {brand ? ` · ${brand}` : ""}
              {base ? ` · ${baseLabel(base)}` : ""}
            </div>

            {cards.length === 0 ? (
              <p className="rounded-lg bg-petrol-tint/40 px-3 py-2 text-sm text-ink-soft">
                Aucun modèle pour cette combinaison fabricant / catégorie.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((c) => {
                  const col = colorOf(c.base);
                  const inner = (
                    <>
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold ${col.badge}`}
                      >
                        {c.token}
                      </span>
                      <div className="mt-2.5 text-base font-bold leading-snug text-ink">
                        {c.model}
                      </div>
                      <div className="mt-1 text-sm text-ink-soft">{c.brand}</div>
                      <div className={`mt-1.5 font-mono text-sm font-semibold ${col.code}`}>
                        {c.lppr}
                      </div>
                      {c.sheetUrl ? (
                        <div className="mt-2.5 text-xs font-semibold text-petrol-deep">
                          Bon de commande / fiche tarif ↗
                        </div>
                      ) : (
                        <div className="mt-2.5 text-xs text-ink-soft/60">
                          Pas de fiche constructeur indexée
                        </div>
                      )}
                    </>
                  );
                  const cls = `block rounded-2xl border-2 ${col.border} bg-card p-5 text-center shadow-sm`;
                  return c.sheetUrl ? (
                    <a
                      key={`${c.token}-${c.brand}-${c.model}`}
                      href={c.sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${cls} transition hover:-translate-y-0.5 hover:shadow-md`}
                    >
                      {inner}
                    </a>
                  ) : (
                    <div key={`${c.token}-${c.brand}-${c.model}`} className={`${cls} opacity-90`}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

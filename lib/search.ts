import { adjGroups, adjonctions, lpprProducts, papForfaits } from "./data";

/* Moteur de recherche du catalogue LPPR — recherche par dénomination ou code LPP.
   Indexe pour l'instant : les produits VPH scrappés, les adjonctions et les forfaits PAP.
   Conçu pour s'étendre (tout produit porteur d'un code LPP ou d'un libellé). */

export type CatalogKind = "vph" | "adjonction" | "pap";

export interface CatalogEntry {
  code: string;
  label: string;
  kind: CatalogKind;
  category: string;
}

export const KIND_LABEL: Record<CatalogKind, string> = {
  vph: "Fauteuil / VPH",
  adjonction: "Adjonction",
  pap: "Forfait PAP",
};

/** Catalogue unifié, construit une fois au chargement du module. */
export const catalog: CatalogEntry[] = [
  ...lpprProducts.map((p) => ({
    code: p.code,
    label: p.label,
    kind: "vph" as const,
    category: p.category,
  })),
  ...adjonctions.map((a) => ({
    code: a.code,
    label: a.name,
    kind: "adjonction" as const,
    category: adjGroups[a.group] ?? "Adjonction",
  })),
  ...(Object.values(papForfaits).map((f) => ({
    code: f.code,
    label: f.label,
    kind: "pap" as const,
    category: "Positionnement (PAP)",
  })) as CatalogEntry[]),
];

/** Normalisation FR : minuscules + suppression des diacritiques. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

interface Indexed extends CatalogEntry {
  nLabel: string;
}

const index: Indexed[] = catalog.map((e) => ({ ...e, nLabel: normalize(e.label) }));

/** Recherche par code LPP (chiffres) ou par libellé. Résultats classés par pertinence. */
export function searchCatalog(query: string, limit = 20): CatalogEntry[] {
  const q = query.trim();
  if (q.length < 2) return [];
  const nq = normalize(q);
  const isCode = /^\d+$/.test(q);

  const scored: { e: Indexed; score: number }[] = [];
  for (const e of index) {
    let score = -1;
    if (isCode) {
      if (e.code === q) score = 0;
      else if (e.code.startsWith(q)) score = 1;
      else if (e.code.includes(q)) score = 2;
    } else {
      if (e.nLabel.startsWith(nq)) score = 1;
      else if (e.nLabel.includes(nq)) score = 2;
      else if (e.code.includes(q)) score = 3;
    }
    if (score >= 0) scored.push({ e, score });
  }
  scored.sort((a, b) => a.score - b.score || a.e.label.localeCompare(b.e.label));
  return scored.slice(0, limit).map(({ e }) => ({
    code: e.code,
    label: e.label,
    kind: e.kind,
    category: e.category,
  }));
}

import { lpprAdjProducts, lpprProducts } from "./data";

/* Moteur de recherche du catalogue LPPR — recherche par dénomination, code LPP, type ou marque.
   Indexe les produits scrappés de la base CNAM : VPH (achat neuf) + adjonctions + PAP.
   Conçu pour s'étendre (tout produit porteur d'un code LPP ou d'un libellé). */

export type CatalogKind = "vph" | "adjonction" | "pap";

export interface CatalogEntry {
  code: string;
  label: string;
  brand: string | null;
  kind: CatalogKind;
  category: string;
}

export const KIND_LABEL: Record<CatalogKind, string> = {
  vph: "Fauteuil / VPH",
  adjonction: "Adjonction",
  pap: "Forfait PAP",
};

/** Normalisation FR : minuscules + suppression des diacritiques. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* --- détection de marque ---
   Les libellés CNAM séparent les segments descriptifs par « , » (virgule + espace) et
   collent la marque par « ,MARQUE » (sans espace). On extrait donc en priorité ce dernier
   segment collé (haute précision), puis on rattrape les marques séparées par « , » à l'aide
   d'un dictionnaire construit sur l'ensemble des marques collées des deux bases. */

function colleeBrand(label: string): string | null {
  const m = label.match(/,([^\s,][^,]*)$/);
  return m ? m[1].trim() : null;
}

const BRAND_SET = new Set<string>();
for (const p of [...lpprProducts, ...lpprAdjProducts]) {
  const b = colleeBrand(p.label);
  if (b) BRAND_SET.add(normalize(b));
}

/** Sépare la marque du reste du libellé LPPR. */
export function parseLpprBrand(label: string): { name: string; brand: string | null } {
  const collee = colleeBrand(label);
  if (collee) {
    const idx = label.lastIndexOf(",");
    return { name: label.slice(0, idx).trim(), brand: collee };
  }
  // rattrapage : dernier segment séparé par « , » mais reconnu comme marque connue.
  const segs = label.split(",").map((s) => s.trim());
  const last = segs[segs.length - 1] ?? "";
  if (segs.length > 1 && BRAND_SET.has(normalize(last))) {
    return { name: segs.slice(0, -1).join(", "), brand: last };
  }
  return { name: label, brand: null };
}

function kindOfAdj(label: string): CatalogKind {
  return /PAP\s+FORFAIT/i.test(label) ? "pap" : "adjonction";
}

/** Catalogue unifié, construit une fois au chargement du module. */
export const catalog: CatalogEntry[] = [
  ...lpprProducts.map((p) => {
    const { name, brand } = parseLpprBrand(p.label);
    return { code: p.code, label: name, brand, kind: "vph" as const, category: p.category };
  }),
  ...lpprAdjProducts.map((p) => {
    const { name, brand } = parseLpprBrand(p.label);
    return { code: p.code, label: name, brand, kind: kindOfAdj(p.label), category: p.category };
  }),
];

interface Indexed extends CatalogEntry {
  nText: string; // libellé + marque normalisés (recherche par dénomination, type ou marque)
}

const index: Indexed[] = catalog.map((e) => ({
  ...e,
  nText: normalize(`${e.label} ${e.brand ?? ""}`),
}));

/** Recherche par code LPP (chiffres), dénomination, type ou marque. Classée par pertinence. */
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
      const brandHit = e.brand ? normalize(e.brand).startsWith(nq) : false;
      if (brandHit) score = 0;
      else if (e.nText.startsWith(nq)) score = 1;
      else if (e.nText.includes(nq)) score = 2;
      else if (e.code.includes(q)) score = 3;
    }
    if (score >= 0) scored.push({ e, score });
  }
  scored.sort((a, b) => a.score - b.score || a.e.label.localeCompare(b.e.label));
  return scored.slice(0, limit).map(({ e }) => ({
    code: e.code,
    label: e.label,
    brand: e.brand,
    kind: e.kind,
    category: e.category,
  }));
}

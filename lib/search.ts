import { adjGroups, adjonctions, lpprProducts, papForfaits } from "./data";

/* Moteur de recherche du catalogue LPPR — recherche par dénomination, code LPP, type ou marque.
   Indexe pour l'instant : les produits VPH scrappés, les adjonctions et les forfaits PAP.
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

function deburrUpper(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

/* Termes descriptifs : si le dernier segment du libellé en contient un, ce n'est pas une marque
   (c'est un « code mère » générique). Sinon, le dernier segment est la marque commerciale. */
const DESCRIPTIVE_TERMS = [
  "MODULAIR", "PROPULS", "MANUEL", "ELEC", "MOTEUR", "POUSSER", "CLASSE", "MULTI", "POSITION",
  "VERTICALISAT", "RIGIDE", "SPORT", "ACTIF", "STANDARD", "ROULANTE", "POUSSETTE", "SCOOTER",
  "CYCLE", "CONFIGURABL", "EVOLUTIV", "REGLABL", "ROUES", "NON-MODUL", "BASE",
];

/** Sépare la marque (dernier segment, sans terme descriptif) du reste du libellé LPPR. */
export function parseLpprBrand(label: string): { name: string; brand: string | null } {
  const segs = label.split(",").map((s) => s.trim());
  const cand = segs[segs.length - 1] ?? "";
  const norm = deburrUpper(cand);
  const isDescriptive = DESCRIPTIVE_TERMS.some((k) => norm.includes(k));
  if (cand && segs.length > 1 && !isDescriptive) {
    return { name: segs.slice(0, -1).join(", "), brand: cand };
  }
  return { name: label, brand: null };
}

/** Catalogue unifié, construit une fois au chargement du module. */
export const catalog: CatalogEntry[] = [
  ...lpprProducts.map((p) => {
    const { name, brand } = parseLpprBrand(p.label);
    return { code: p.code, label: name, brand, kind: "vph" as const, category: p.category };
  }),
  ...adjonctions.map((a) => ({
    code: a.code,
    label: a.name,
    brand: null,
    kind: "adjonction" as const,
    category: adjGroups[a.group] ?? "Adjonction",
  })),
  ...Object.values(papForfaits).map((f) => ({
    code: f.code,
    label: f.label,
    brand: null,
    kind: "pap" as const,
    category: "Positionnement (PAP)",
  })),
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

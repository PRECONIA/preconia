import {
  adjBrandGroups,
  deviceLppByType,
  deviceModelsByType,
  lpprAdjProducts,
  lpprProducts,
  papForfaits,
} from "./data";

/* Moteur de recherche du catalogue LPPR — à jour de notre base.
   Indexe : VPH (achat neuf) + adjonctions + forfaits PAP. Pour chaque VPH on attache le
   token de type (FREP-B…), la marque et les modèles commerciaux (CERAH) issus de device-models.
   Recherche multi-termes (ET) : type + marque + nature + dénomination + code, ex.
   « FREP B otto », « FREPB otto », « PAP otto », « adjonction otto », « repose jambe otto ».
   Filtres pour les boutons rapides (adjonctions, PAP-A, PAP-B, catégorie VPH) et le sélecteur marque. */

export type CatalogKind = "vph" | "adjonction" | "pap";

export interface CatalogEntry {
  code: string;
  label: string;
  brand: string | null;
  kind: CatalogKind;
  category: string;
  token: string | null; // VPH : « FREP-B », « FMP »…
  papForfait: "A" | "B" | null; // PAP : forfait A/B
  models: string[]; // VPH : modèles commerciaux (CERAH)
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
    .replace(/[̀-ͯ]/g, "");
}

/* --- détection de marque (segment collé « ,MARQUE », rattrapage « , MARQUE » via dictionnaire) --- */
function colleeBrand(label: string): string | null {
  const m = label.match(/,([^\s,][^,]*)$/);
  return m ? m[1].trim() : null;
}
const BRAND_SET = new Set<string>();
for (const p of [...lpprProducts, ...lpprAdjProducts]) {
  const b = colleeBrand(p.label);
  if (b) BRAND_SET.add(normalize(b));
}
for (const g of adjBrandGroups) for (const b of Object.keys(g.byBrand)) BRAND_SET.add(normalize(b));

export function parseLpprBrand(label: string): { name: string; brand: string | null } {
  const collee = colleeBrand(label);
  if (collee) {
    const idx = label.lastIndexOf(",");
    return { name: label.slice(0, idx).trim(), brand: collee };
  }
  const segs = label.split(",").map((s) => s.trim());
  const last = segs[segs.length - 1] ?? "";
  if (segs.length > 1 && BRAND_SET.has(normalize(last))) {
    return { name: segs.slice(0, -1).join(", "), brand: last };
  }
  return { name: label, brand: null };
}

/* --- token VPH (réconcilié aux clés device-lpp) + infos par code (device-models) --- */
const DL_KEYS = Object.keys(deviceLppByType).sort((a, b) => b.length - a.length);
function vphToken(label: string): string | null {
  const raw = (label.split(",")[2] ?? "").trim();
  for (const k of DL_KEYS) if (raw === k || raw.startsWith(k)) return k;
  return null;
}
const codeInfo = new Map<string, { token: string; brand: string; models: string[] }>();
for (const [token, brands] of Object.entries(deviceModelsByType)) {
  for (const [brand, entry] of Object.entries(brands)) {
    codeInfo.set(entry.code, { token, brand, models: entry.models.map((m) => m.name) });
  }
}

function kindOfAdj(label: string): CatalogKind {
  return /PAP\s+FORFAIT/i.test(label) ? "pap" : "adjonction";
}
function papForfaitOf(label: string): "A" | "B" | null {
  const m = label.match(/FORFAIT\s+([AB])\b/i);
  return m ? (m[1].toUpperCase() as "A" | "B") : null;
}

/** Catalogue unifié, construit une fois au chargement. */
export const catalog: CatalogEntry[] = [
  ...lpprProducts.map((p): CatalogEntry => {
    const { name, brand } = parseLpprBrand(p.label);
    const info = codeInfo.get(p.code);
    return {
      code: p.code,
      label: name,
      brand: info?.brand ?? brand,
      kind: "vph",
      category: p.category,
      token: info?.token ?? vphToken(p.label),
      papForfait: null,
      models: info?.models ?? [],
    };
  }),
  ...lpprAdjProducts.map((p): CatalogEntry => {
    const { name, brand } = parseLpprBrand(p.label);
    const kind = kindOfAdj(p.label);
    return {
      code: p.code,
      label: name,
      brand,
      kind,
      category: p.category,
      token: null,
      papForfait: kind === "pap" ? papForfaitOf(p.label) : null,
      models: [],
    };
  }),
  // forfaits PAP de base (notre pap.json) — pour que les boutons PAP-A / PAP-B aient un résultat.
  ...(["A", "B"] as const).map((f): CatalogEntry => ({
    code: papForfaits[f].code,
    label: papForfaits[f].label,
    brand: null,
    kind: "pap",
    category: "Forfaits de positionnement (PAP)",
    token: null,
    papForfait: f,
    models: [],
  })),
];

/** Marques disponibles (triées) — alimente le sélecteur de marque. */
export const allBrands: string[] = Array.from(
  new Set(catalog.map((e) => e.brand).filter((b): b is string => !!b)),
).sort((a, b) => a.localeCompare(b));

interface Indexed extends CatalogEntry {
  nName: string;
  nBrand: string;
  nBlob: string;
  tokenBase: string | null;
}
const index: Indexed[] = catalog.map((e) => {
  const tokenForms = e.token
    ? `${e.token} ${e.token.replace("-", "")} ${e.token.replace("-", " ")}`
    : "";
  return {
    ...e,
    nName: normalize(e.label),
    nBrand: e.brand ? normalize(e.brand) : "",
    nBlob: normalize(`${e.label} ${e.models.join(" ")} ${tokenForms} ${e.category}`),
    tokenBase: e.token ? e.token.split("-")[0].toLowerCase() : null,
  };
});

/* --- analyse de la requête en termes (ET) --- */
const TYPE_BASES = Array.from(
  new Set(Object.keys(deviceLppByType).map((k) => k.split("-")[0].toLowerCase())),
);
const CLASSED = new Set(["fre", "frep", "sco"]); // types dont la classe précise le token
const isType = (s: string) => TYPE_BASES.includes(s);

const KIND_SYN: Record<string, CatalogKind> = {
  adjonction: "adjonction",
  adjonctions: "adjonction",
  adj: "adjonction",
  pap: "pap",
  positionnement: "pap",
  vph: "vph",
  fauteuil: "vph",
  fauteuils: "vph",
};

interface QTerm {
  raw: string;
  token?: string; // « frep-b »
  tokenBase?: string; // type seul « frep »
  pap?: "A" | "B";
  kind?: CatalogKind;
}

function tokenize(query: string): QTerm[] {
  const raw = normalize(query).split(/\s+/).filter(Boolean);
  const terms: QTerm[] = [];
  for (let i = 0; i < raw.length; i++) {
    const t = raw[i];
    const next = raw[i + 1] ?? "";
    // PAP-A / PAPA / PAP A
    let m = t.match(/^pap-?([ab])$/);
    if (m) {
      terms.push({ raw: t, kind: "pap", pap: m[1].toUpperCase() as "A" | "B" });
      continue;
    }
    if (t === "pap" && /^[ab]$/.test(next)) {
      terms.push({ raw: t, kind: "pap", pap: raw[++i].toUpperCase() as "A" | "B" });
      continue;
    }
    // type hyphené : « frep-b »
    m = t.match(/^([a-z_]+)-([abc])$/);
    if (m && isType(m[1])) {
      terms.push({ raw: t, token: `${m[1]}-${m[2]}`, tokenBase: m[1] });
      continue;
    }
    // type seul (ou type + classe sur le mot suivant) : « frma », « frep b »
    if (isType(t)) {
      if (CLASSED.has(t) && /^[abc]$/.test(next)) {
        terms.push({ raw: t, token: `${t}-${raw[++i]}`, tokenBase: t });
      } else {
        terms.push({ raw: t, tokenBase: t });
      }
      continue;
    }
    // type+classe collés : « frepb », « scob »
    const last = t.slice(-1);
    const base = t.slice(0, -1);
    if (/[abc]/.test(last) && CLASSED.has(base)) {
      terms.push({ raw: t, token: `${base}-${last}`, tokenBase: base });
      continue;
    }
    // mot-clé de nature
    if (KIND_SYN[t]) {
      terms.push({ raw: t, kind: KIND_SYN[t] });
      continue;
    }
    terms.push({ raw: t });
  }
  return terms;
}

function scoreTerm(e: Indexed, term: QTerm): number {
  if (term.token) return e.token?.toLowerCase() === term.token ? 0 : -1;
  if (term.pap) return e.kind === "pap" && e.papForfait === term.pap ? 0 : -1;
  if (term.tokenBase) return e.tokenBase === term.tokenBase ? 0 : -1;
  if (term.kind) return e.kind === term.kind ? 0 : -1;
  const t = term.raw;
  if (/^\d+$/.test(t)) {
    if (e.code === t) return 0;
    if (e.code.startsWith(t)) return 1;
    return e.code.includes(t) ? 2 : -1;
  }
  if (e.nBrand.startsWith(t)) return 0;
  if (e.nBrand.includes(t)) return 1;
  if (e.nName.startsWith(t)) return 1;
  if (e.nName.includes(t)) return 2;
  return e.nBlob.includes(t) ? 3 : -1;
}

export interface SearchFilters {
  kind?: CatalogKind | null;
  papForfait?: "A" | "B" | null;
  brand?: string | null;
  category?: string | null;
}

function strip(e: Indexed): CatalogEntry {
  const { code, label, brand, kind, category, token, papForfait, models } = e;
  return { code, label, brand, kind, category, token, papForfait, models };
}

/** Recherche multi-termes (ET) + filtres. Sans requête mais avec filtre actif → renvoie le pool filtré. */
export function searchCatalog(query: string, filters: SearchFilters = {}, limit = 30): CatalogEntry[] {
  const hasFilter = !!(filters.kind || filters.papForfait || filters.brand || filters.category);
  const qTrim = query.trim();
  if (qTrim.length < 2 && !hasFilter) return [];

  let pool = index;
  if (filters.kind) pool = pool.filter((e) => e.kind === filters.kind);
  if (filters.papForfait) pool = pool.filter((e) => e.kind === "pap" && e.papForfait === filters.papForfait);
  if (filters.brand) pool = pool.filter((e) => e.brand === filters.brand);
  if (filters.category) pool = pool.filter((e) => e.kind === "vph" && e.category === filters.category);

  const terms = qTrim.length >= 2 ? tokenize(query) : [];
  if (terms.length === 0) {
    return [...pool].sort((a, b) => a.label.localeCompare(b.label)).slice(0, limit).map(strip);
  }
  const scored: { e: Indexed; s: number }[] = [];
  for (const e of pool) {
    let ok = true;
    let s = 0;
    for (const term of terms) {
      const ts = scoreTerm(e, term);
      if (ts < 0) {
        ok = false;
        break;
      }
      s += ts;
    }
    if (ok) scored.push({ e, s });
  }
  scored.sort((a, b) => a.s - b.s || a.e.label.localeCompare(b.e.label));
  return scored.slice(0, limit).map(({ e }) => strip(e));
}

/** Catégories de véhicules (VPH uniquement). */
export const vphCategories: string[] = Array.from(
  new Set(catalog.filter((e) => e.kind === "vph").map((e) => e.category)),
);

/** Catalogue complet d'une catégorie de véhicule (raccourci). */
export function catalogByCategory(category: string): CatalogEntry[] {
  return catalog
    .filter((e) => e.kind === "vph" && e.category === category)
    .sort((a, b) => a.label.localeCompare(b.label));
}

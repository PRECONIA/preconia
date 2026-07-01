import type {
  Adjonction,
  Classe,
  ClasseValue,
  Device,
  DeviceLppEntry,
  DeviceModelEntry,
  Forfait,
  Mode,
  OptionSheet,
  PapForfait,
  PapRegion,
} from "./types";

/* Fonctions pures des INVARIANTS du CLAUDE.md — isolées, sans état, testables.
   Le cœur de décision vit ici, découplé de l'UI (longévité : réutilisable en PWA / extension). */

export type Selection = Record<string, boolean>;

/** INV. 3 — une adjonction ne s'affiche que si le code du dispositif ∈ son `compat`. */
export function filterAdjonctions(device: Device, adjonctions: Adjonction[]): Adjonction[] {
  return adjonctions.filter((a) => a.compat.includes(device.code));
}

/** INV. 1 — bascule une adjonction ; au sein d'un `exclusiveGroup` (ex. les 2 AAP),
 *  la sélection est mutuellement exclusive. `compatAdj` borne la recherche aux
 *  adjonctions compatibles avec le dispositif courant. Retourne une nouvelle sélection. */
export function toggleAdjonction(
  selected: Selection,
  item: Adjonction,
  compatAdj: Adjonction[],
): Selection {
  const next: Selection = { ...selected };
  if (next[item.code]) {
    delete next[item.code];
    return next;
  }
  if (item.exclusiveGroup) {
    for (const x of compatAdj) {
      if (x.exclusiveGroup === item.exclusiveGroup) delete next[x.code];
    }
  }
  next[item.code] = true;
  return next;
}

/** Liste des adjonctions effectivement cochées. */
export function selectedAdjonctions(selected: Selection, adjonctions: Adjonction[]): Adjonction[] {
  return adjonctions.filter((a) => selected[a.code]);
}

/** Carte nom d'item PAP → forfait (A/B), dérivée des régions. */
export function itemForfaitMap(regions: PapRegion[]): Map<string, Forfait> {
  const m = new Map<string, Forfait>();
  for (const region of regions) {
    for (const item of region.items) m.set(item.name, region.forfait);
  }
  return m;
}

/** INV. 2 — les forfaits A/B se déduisent automatiquement des PAP cochés.
 *  Jamais de forfait sans PAP correspondant. Retour trié et déterministe. */
export function deriveForfaits(papSelection: Selection, regions: PapRegion[]): Forfait[] {
  const map = itemForfaitMap(regions);
  const set = new Set<Forfait>();
  for (const [name, checked] of Object.entries(papSelection)) {
    if (!checked) continue;
    const f = map.get(name);
    if (f) set.add(f);
  }
  return [...set].sort();
}

/** Un élément « ouvert » (sur devis ou tarif à préciser) est exclu du sous-total. */
export function hasOpenItems(selectedAdj: Adjonction[]): boolean {
  return selectedAdj.some((x) => x.devis || x.tbd);
}

/** INV. 7 — sous-total = adjonctions chiffrées + forfaits PAP ; devis/tbd exclus. */
export function computeSubtotal(
  selectedAdj: Adjonction[],
  forfaits: Forfait[],
  forfaitData: Record<Forfait, PapForfait>,
): number {
  const adjCost = selectedAdj
    .filter((x) => !x.devis && !x.tbd)
    .reduce((s, x) => s + (x.price ?? 0), 0);
  const papCost = forfaits.reduce((s, f) => s + forfaitData[f].price, 0);
  return adjCost + papCost;
}

/* --- temporalité du besoin → modes de prise en charge possibles (réf. fichier VPH/CERAH) ---
   Temporaire (≤ 3 mois) ⇒ location courte durée (LCD) uniquement.
   Durable (≥ 6 mois) ⇒ achat ou location longue durée (ACHAT / LLD). */
export type DureeValue = "temp" | "durable";

export function modesForDuree(duree: DureeValue | null): Mode[] {
  if (duree === "temp") return ["LCD"];
  if (duree === "durable") return ["ACHAT", "LLD"];
  return ["ACHAT", "LCD", "LLD"];
}

/** Un dispositif est proposable pour la temporalité s'il offre au moins un mode compatible. */
export function deviceAllowedForDuree(device: Device, duree: DureeValue | null): boolean {
  const allowed = modesForDuree(duree);
  return device.modes.some((m) => allowed.includes(m));
}

/** Gating de l'étape besoins : seulement pour les dispositifs électriques
 *  (classe A/B/C + aptitude à la conduite). Les manuels vont directement aux adjonctions. */
export function needsBesoins(device: Device): boolean {
  return device.electric === true;
}

/** INV. 4 — une classe B/C est soumise au code de la route (équipements inclus). */
export function classeRoute(classeValue: ClasseValue | null, classes: Classe[]): boolean {
  if (!classeValue) return false;
  return classes.find((c) => c.value === classeValue)?.route ?? false;
}

/* --- adaptation du code LPP à la marque du fauteuil (mapping CNAM code mère → variantes) --- */
export type BrandMap = Map<string, Record<string, string>>;

/** Code LPP adapté à la marque : la variante de marque si elle existe, sinon le code mère. */
export function adaptedCode(baseCode: string, brand: string | null, map: BrandMap): string {
  if (!brand) return baseCode;
  return map.get(baseCode)?.[brand] ?? baseCode;
}

/** Vrai si un code mère possède une variante pour la marque donnée. */
export function hasBrandVariant(baseCode: string, brand: string | null, map: BrandMap): boolean {
  return !!brand && !!map.get(baseCode)?.[brand];
}

/** Jeton de type LPP du fauteuil (FRM, FRE-C, FREP-A…). Pour l'électrique (FRE/FREP) et le
 *  scooter, il dépend de la classe. Retourne null si la classe manque alors qu'elle est requise. */
export function deviceLppToken(device: Device, classe: ClasseValue | null): string | null {
  if (device.code === "FRE" || device.code === "FREP" || device.code === "SCO") {
    if (!classe) return null;
    return `${device.code}-${classe}`;
  }
  return device.code;
}

/** Code LPP + tarif du fauteuil sélectionné. Si une `brand` est fournie et qu'elle figure au
 *  catalogue CERAH pour le jeton, on privilégie **son code propre** (le tarif reste celui de la
 *  ligne / code mère — il n'y a pas de tarif par modèle). Sinon → code mère. Jamais inventé. */
export function deviceLpp(
  device: Device,
  classe: ClasseValue | null,
  byType: Record<string, DeviceLppEntry>,
  byBrand?: Record<string, Record<string, DeviceModelEntry>>,
  brand?: string | null,
  model?: string | null,
): DeviceLppEntry | null {
  const token = deviceLppToken(device, classe);
  if (!token) return null;
  const mere = byType[token] ?? null;
  if (brand && byBrand) {
    const entry = byBrand[token]?.[brand];
    if (entry) {
      if (model) {
        // code propre du modèle ; à défaut (modèle sans code), repli sur le code générique (mère).
        const m = entry.models.find((x) => x.name === model);
        const code = m?.code ?? mere?.code ?? null;
        if (code) return { code, tarif: mere?.tarif ?? null };
      } else {
        return { code: entry.code, tarif: mere?.tarif ?? null };
      }
    }
  }
  return mere;
}

/** Vrai si le modèle sélectionné n'a pas de code propre → on affiche le code générique (mère). */
export function deviceModelGeneric(
  device: Device,
  classe: ClasseValue | null,
  brand: string | null,
  model: string | null,
  byBrand: Record<string, Record<string, DeviceModelEntry>>,
): boolean {
  if (!brand || !model) return false;
  const token = deviceLppToken(device, classe);
  if (!token) return false;
  const m = byBrand[token]?.[brand]?.models.find((x) => x.name === model);
  return !!m && !m.code;
}

/** Marques de fauteuil disponibles (triées) pour le type/classe courant — alimente le sélecteur. */
export function deviceBrandsForToken(
  device: Device,
  classe: ClasseValue | null,
  byBrand: Record<string, Record<string, DeviceModelEntry>>,
): string[] {
  const token = deviceLppToken(device, classe);
  if (!token) return [];
  return Object.keys(byBrand[token] ?? {}).sort((a, b) => a.localeCompare(b));
}

/** Noms de modèles commerciaux (triés) pour le type/classe + marque — alimente le volet « modèle ». */
export function deviceModelsForBrand(
  device: Device,
  classe: ClasseValue | null,
  brand: string | null,
  byBrand: Record<string, Record<string, DeviceModelEntry>>,
): string[] {
  if (!brand) return [];
  const token = deviceLppToken(device, classe);
  return token ? (byBrand[token]?.[brand]?.models.map((m) => m.name) ?? []) : [];
}

/** Vrai si le fauteuil possède une variante de marque (code propre) pour le type/classe courant. */
export function hasDeviceBrandVariant(
  device: Device,
  classe: ClasseValue | null,
  brand: string | null,
  byBrand: Record<string, Record<string, DeviceModelEntry>>,
): boolean {
  if (!brand) return false;
  const token = deviceLppToken(device, classe);
  return !!token && !!byBrand[token]?.[brand];
}

/** Fiche tarif/options constructeur pour le (type/classe, marque, modèle) courant — null si aucune
    fiche répertoriée. Clé par token car un même modèle peut avoir une fiche par classe (codes LPPR
    distincts, ex. FREP-A vs FREP-B). */
export function optionSheetFor(
  device: Device,
  classe: ClasseValue | null,
  brand: string | null,
  model: string | null,
  byToken: Record<string, Record<string, Record<string, OptionSheet>>>,
): OptionSheet | null {
  if (!brand || !model) return null;
  const token = deviceLppToken(device, classe);
  return token ? (byToken[token]?.[brand]?.[model] ?? null) : null;
}

/** Cumul de deux VPH autorisé ? Faux si l'un figure dans l'incompatibilité de l'autre (relation
    symétrique). `a`/`b` : acronymes LPPR (FMP, FREP, SIEGE_COQUILLE…). null tant qu'un choix manque. */
export function isCumulAllowed(
  a: string | null,
  b: string | null,
  incompatible: Record<string, string[]>,
): boolean | null {
  if (!a || !b) return null;
  const incompatibleAB = incompatible[a]?.includes(b) ?? false;
  const incompatibleBA = incompatible[b]?.includes(a) ?? false;
  return !(incompatibleAB || incompatibleBA);
}

/** Marques disponibles (triées) parmi un ensemble de codes mères — pour peupler le sélecteur. */
export function brandsForBases(baseCodes: string[], map: BrandMap): string[] {
  const set = new Set<string>();
  for (const code of baseCodes) {
    const m = map.get(code);
    if (m) Object.keys(m).forEach((b) => set.add(b));
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

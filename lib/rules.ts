import type {
  Adjonction,
  Classe,
  ClasseValue,
  Device,
  DeviceLppEntry,
  Forfait,
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

/** Code LPP « mère » + tarif du fauteuil sélectionné. Pour l'électrique (FRE/FREP) et le
 *  scooter, le code dépend de la classe (FRE-C, FREP-A…). Retourne null si non résolu. */
export function deviceLpp(
  device: Device,
  classe: ClasseValue | null,
  byType: Record<string, DeviceLppEntry>,
): DeviceLppEntry | null {
  let token: string = device.code;
  if (device.code === "FRE" || device.code === "FREP" || device.code === "SCO") {
    if (!classe) return null;
    token = `${device.code}-${classe}`;
  }
  return byType[token] ?? null;
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

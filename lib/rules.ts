import type {
  Adjonction,
  Classe,
  ClasseValue,
  Device,
  Eval,
  DeviceLppEntry,
  DeviceModelEntry,
  Forfait,
  LcdForfaitEntry,
  MadNiveau,
  Mode,
  OptionSheet,
  PapForfait,
  PapRegion,
  Prestation,
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
   Durable (≥ 6 mois) ⇒ achat ou location longue durée (ACHAT / LLD) — le choix
   d'acquisition, une fois fait, restreint au mode retenu (la LLD ne propose que les
   catégories éligibles : FRMP, FRMV, FREP, FREV, POU_MRE). */
export type DureeValue = "temp" | "durable";
export type AcquisitionValue = "achat" | "lld";

export function modesForDuree(
  duree: DureeValue | null,
  acquisition: AcquisitionValue | null = null,
): Mode[] {
  if (duree === "temp") return ["LCD"];
  if (duree === "durable") {
    if (acquisition === "achat") return ["ACHAT"];
    if (acquisition === "lld") return ["LLD"];
    return ["ACHAT", "LLD"];
  }
  return ["ACHAT", "LCD", "LLD"];
}

/** Un dispositif est proposable s'il offre au moins un mode compatible avec la
 *  temporalité et, le cas échéant, le mode d'acquisition choisi (achat / LLD). */
export function deviceAllowedForDuree(
  device: Device,
  duree: DureeValue | null,
  acquisition: AcquisitionValue | null = null,
): boolean {
  const allowed = modesForDuree(duree, acquisition);
  return device.modes.some((m) => allowed.includes(m));
}

/* --- forfaits de location (codes LPPR propres à la LCD / LLD, jamais le code achat) --- */
/** Durée de la LCD : jusqu'à 13 semaines, ou de 14 à 26 semaines (borne réglementaire). */
export type LcdDureeValue = "s13" | "s26";

export interface LocationForfait {
  code: string;
  label: string;
  price: number;
  /** périodicité du forfait ("semaine" LCD, "trimestre" LLD) ; absent = forfait unique. */
  unit?: "semaine" | "trimestre";
}

function prestationForfait(
  code: string | undefined,
  prestaByCode: Record<string, Prestation>,
): LocationForfait | null {
  const p = code ? prestaByCode[code] : undefined;
  return p ? { code: p.code, label: p.label, price: p.tarif, unit: p.unit } : null;
}

/** Forfait hebdomadaire LCD du dispositif, selon la durée (≤ 13 sem / 14–26 sem).
 *  null si la durée n'est pas renseignée ou si la catégorie n'est pas louable en LCD. */
export function lcdForfaitFor(
  deviceCode: string,
  lcdDuree: LcdDureeValue | null,
  lcdMap: Record<string, LcdForfaitEntry>,
  prestaByCode: Record<string, Prestation>,
): LocationForfait | null {
  if (!lcdDuree) return null;
  return prestationForfait(lcdMap[deviceCode]?.[lcdDuree], prestaByCode);
}

/** Option d'achat LCD de la catégorie (facturable au terme de la location courte durée). */
export function lcdOptionAchatFor(
  deviceCode: string,
  lcdMap: Record<string, LcdForfaitEntry>,
  prestaByCode: Record<string, Prestation>,
): LocationForfait | null {
  return prestationForfait(lcdMap[deviceCode]?.optionAchat, prestaByCode);
}

/** Forfait trimestriel LLD du dispositif (jeton par classe pour le FREP : FREP-A/B/C).
 *  null si la catégorie n'est pas éligible à la LLD ou si la classe requise manque. */
export function lldForfaitFor(
  device: Device,
  classe: ClasseValue | null,
  lldMap: Record<string, string>,
  prestaByCode: Record<string, Prestation>,
): LocationForfait | null {
  const token = deviceLppToken(device, classe);
  if (!token) return null;
  return prestationForfait(lldMap[token], prestaByCode);
}

/** Forfait de mise à disposition propre à la LCD (Titre I) : réservé aux FRM et FRE,
 *  au plus une fois par épisode de location. En LCD, MAD1/MAD2 ne s'appliquent pas. */
export function madLcdFor(
  deviceCode: string,
  madLcd: { code: string; devices: string[] },
  prestaByCode: Record<string, Prestation>,
): LocationForfait | null {
  if (!madLcd.devices.includes(deviceCode)) return null;
  return prestationForfait(madLcd.code, prestaByCode);
}

/** Gating de l'étape besoins : dispositifs électriques ET scooters (classe d'usage
 *  A/B/C ou A+/B/C + aptitude à la conduite). Les manuels vont directement aux adjonctions. */
export function needsBesoins(device: Device): boolean {
  return device.electric === true || device.code === "SCO";
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

/** Forfait MAD applicable au dispositif : niveau selon la catégorie de VPH ; MAD1 pour une
    première mise à disposition OU un renouvellement avec changement de catégorie, MAD2 pour un
    renouvellement à l'identique. null si le dispositif n'ouvre pas droit au forfait (FMP, FMPR)
    ou si le contexte n'est pas renseigné. */
export interface MadForfait {
  code: string;
  label: string;
  price: number;
  niveau: number;
}
export function madForfaitFor(
  deviceCode: string,
  context: "premiere" | "renouv_cat" | "renouv_id" | null,
  niveaux: MadNiveau[],
  prestaByCode: Record<string, Prestation>,
): MadForfait | null {
  if (!context) return null;
  const n = niveaux.find((x) => x.devices.includes(deviceCode));
  if (!n) return null;
  // MAD2 est réservé au renouvellement À L'IDENTIQUE ; un renouvellement avec changement
  // de catégorie relève du forfait de première mise à disposition (MAD1).
  const code = context === "renouv_id" ? n.renouvellement : n.premiere;
  const p = prestaByCode[code];
  return p ? { code, label: p.label, price: p.tarif, niveau: n.niveau } : null;
}

/** Palier de prescripteur affiché, selon le mode de prise en charge et le contexte de MAD
 *  (arrêté du 06/02/2025) :
 *  - LCD manuelle (FMP/FMPR/FRM) : médecin, ergothérapeute ou kinésithérapeute (9.5.a) ;
 *  - LCD FRE : palier restreint MPR / DU / ergo en équipe pluridisciplinaire + certificat (9.5.b) ;
 *  - renouvellement à l'identique (achat/LLD) : médecin généraliste ou ergothérapeute (3.1.6),
 *    quel que soit le palier de la primo-prescription ;
 *  - sinon : palier de la catégorie (`device.presc`). */
export function prescriberFor(
  device: Device,
  pec: "achat" | "lcd" | "lld",
  mad: "premiere" | "renouv_cat" | "renouv_id" | null,
  prescribers: Record<string, string>,
): string {
  if (pec === "lcd") {
    const key = device.code === "FRE" ? "lcdFre" : "lcdManuel";
    return prescribers[key] ?? prescribers[device.presc];
  }
  if (mad === "renouv_id") return prescribers.renouvId ?? prescribers[device.presc];
  return prescribers[device.presc];
}

/** Spécificités de prescription d'un VPH selon la modalité de prise en charge (arrêté du
 *  06/02/2025). Le PRESCRIPTEUR se calcule à part via `prescriberFor` (dépend aussi du
 *  contexte de renouvellement) ; cette fonction couvre les autres axes :
 *  - `evaluateur` : qui réalise l'évaluation des besoins + fiche de préconisation (§3.1.4.2.1) ;
 *     null en LCD (parcours allégé, §9.7 : essai comparatif sans fiche) ;
 *  - `fichePreconisation` : requise à l'achat et en LLD pour les catégories du parcours
 *     (§3.1.4.2 / 3.3.6), jamais en LCD ;
 *  - `dap` : achat → liste §3.1.4 (via device.dap) ; LLD → FRMP/FRMV/FREP/FREV (§3.3.6) ;
 *     LCD → FRE uniquement (§9.5.b) ;
 *  - `envLevel` : évaluation environnementale — « non » (LCD manuelle, ou catégories sans
 *     parcours), « besoins » (volet facteurs environnementaux de l'évaluation), « renforcee »
 *     (électriques et scooters : compatibilité, stockage/recharge, certificat — §3.1.5 / 9.5.b). */
export type Modality = "ACHAT" | "LCD" | "LLD";
const DAP_LLD = ["FRMP", "FRMV", "FREP", "FREV"];
export interface PrescriptionExtras {
  evaluateur: Eval | null;
  fichePreconisation: boolean;
  dap: boolean;
  envLevel: "non" | "besoins" | "renforcee";
}
export function prescriptionExtras(device: Device, modality: Modality): PrescriptionExtras {
  const electriqueOuScooter = device.electric || device.code === "SCO";
  if (modality === "LCD") {
    const fre = device.code === "FRE";
    return {
      evaluateur: null,
      fichePreconisation: false,
      dap: fre,
      envLevel: fre ? "renforcee" : "non",
    };
  }
  const dap = modality === "LLD" ? DAP_LLD.includes(device.code) : device.dap;
  return {
    evaluateur: device.eval === "aucune" ? null : device.eval,
    fichePreconisation: device.fiche,
    dap,
    envLevel: !device.fiche ? "non" : electriqueOuScooter ? "renforcee" : "besoins",
  };
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

export type CumulMode = "ACHAT" | "LLD" | "LCD";
export type CumulVerdict = "autorise" | "interdit" | "derogation";

/** Catégories manuelles dont la possession (sans option d'assistance électrique à la propulsion)
 *  ouvre la dérogation de LCD d'un FRE (arrêté du 06/02/2025, Titre IV 4.1). */
const DEROG_LCD_FRE = ["FMP", "FMPR", "FRM", "FRMV", "FRMC", "FRMP"];

/** Verdict de cumul tenant compte du mode (Titre IV 4.1–4.2) :
 *  - toute prise en charge en LCD est exclusive : pas de cumul avec un VPH acheté ou loué,
 *    ni deux forfaits LCD concomitants ;
 *  - dérogation (verdict « derogation ») : LCD d'un FRE souhaitée alors qu'un manuel
 *    FMP/FMPR/FRM/FRMV/FRMC/FRMP est possédé sans AAP — épisode de soin avec impossibilité
 *    physique transitoire de propulser, objectivé par une nouvelle prescription ;
 *  - hors LCD : matrice d'incompatibilités par catégorie (isCumulAllowed). */
export function cumulVerdict(
  owned: string | null,
  ownedMode: CumulMode,
  want: string | null,
  wantMode: CumulMode,
  incompatible: Record<string, string[]>,
): CumulVerdict | null {
  if (!owned || !want) return null;
  if (ownedMode === "LCD" || wantMode === "LCD") {
    if (
      wantMode === "LCD" &&
      want === "FRE" &&
      ownedMode !== "LCD" &&
      DEROG_LCD_FRE.includes(owned)
    )
      return "derogation";
    return "interdit";
  }
  return isCumulAllowed(owned, want, incompatible) ? "autorise" : "interdit";
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

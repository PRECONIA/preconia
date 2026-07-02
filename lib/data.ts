import devicesRaw from "@/data/devices.json";
import adjonctionsRaw from "@/data/adjonctions.json";
import papRaw from "@/data/pap.json";
import classesRaw from "@/data/classes.json";
import besoinsRaw from "@/data/besoins.json";
import lpprRaw from "@/data/lppr.json";
import lpprAdjRaw from "@/data/lppr-adjonctions.json";
import adjBrandsRaw from "@/data/adjonction-brands.json";
import deviceLppRaw from "@/data/device-lpp.json";
import deviceModelsRaw from "@/data/device-models.json";
import deviceOptionSheetsRaw from "@/data/device-option-sheets.json";
import deviceIndicationsRaw from "@/data/device-indications.json";
import cumulRaw from "@/data/cumul.json";
import prestationsRaw from "@/data/lppr-prestations.json";
import metaRaw from "@/data/meta.json";

import {
  DevicesFileSchema,
  AdjonctionsFileSchema,
  PapFileSchema,
  ClassesFileSchema,
  BesoinsFileSchema,
  LpprFileSchema,
  AdjonctionBrandsFileSchema,
  DeviceLppFileSchema,
  DeviceModelsFileSchema,
  DeviceOptionSheetsFileSchema,
  DeviceIndicationsFileSchema,
  CumulFileSchema,
  PrestationsFileSchema,
  MetaSchema,
} from "./schemas";
import type {
  DeviceLppEntry,
  DeviceModelEntry,
  OptionSheet,
  CumulCategory,
  Prestation,
} from "./types";
import type { Device, Presc } from "./types";

/* Chargement + validation de la donnée au niveau module.
   Si un JSON est invalide → `parse` lève → échec de `next build` et des tests.
   (couvre l'item HANDOFF « schéma de validation des JSON au build ».) */

const devicesFile = DevicesFileSchema.parse(devicesRaw);
const adjonctionsFile = AdjonctionsFileSchema.parse(adjonctionsRaw);
const papFile = PapFileSchema.parse(papRaw);

export const devices = devicesFile.devices;
export const prescribers = devicesFile.prescribers as Record<Presc, string>;
export const modes = devicesFile.modes;

export const adjonctions = adjonctionsFile.items;
export const adjGroups = adjonctionsFile.groups;

export const papRegions = papFile.regions;
export const papForfaits = papFile.forfaits;

export const classes = ClassesFileSchema.parse(classesRaw);
export const besoins = BesoinsFileSchema.parse(besoinsRaw);
export const meta = MetaSchema.parse(metaRaw);

const lpprFile = LpprFileSchema.parse(lpprRaw);
export const lpprProducts = lpprFile.products;
export const lpprMeta = { source: lpprFile.source, lastUpdated: lpprFile.lastUpdated };

const lpprAdjFile = LpprFileSchema.parse(lpprAdjRaw);
export const lpprAdjProducts = lpprAdjFile.products;

const adjBrandsFile = AdjonctionBrandsFileSchema.parse(adjBrandsRaw);
export const adjBrandGroups = adjBrandsFile.groups;
/** code mère LPP → { marque → code LPP de la variante }. */
export const adjBrandMap: Map<string, Record<string, string>> = new Map(
  adjBrandGroups.map((g) => [g.base, g.byBrand]),
);

const deviceLppFile = DeviceLppFileSchema.parse(deviceLppRaw);
/** code LPP « mère » + tarif par type de fauteuil (token : FRM, FRE-C, FREP-A, FREV…). */
export const deviceLppByType: Record<string, DeviceLppEntry> = deviceLppFile.byType;

const deviceModelsFile = DeviceModelsFileSchema.parse(deviceModelsRaw);
/** catalogue CERAH par type : token → { marque → {code LPP propre, modèles commerciaux} }. */
export const deviceModelsByType: Record<string, Record<string, DeviceModelEntry>> =
  deviceModelsFile.byToken;
export const deviceModelsMeta = {
  source: deviceModelsFile.source,
  lastUpdated: deviceModelsFile.lastUpdated,
};

const deviceOptionSheetsFile = DeviceOptionSheetsFileSchema.parse(deviceOptionSheetsRaw);
/** fiche tarif/options constructeur : token/classe → marque → { nom de modèle → {url, kind} }. */
export const deviceOptionSheetByToken: Record<
  string,
  Record<string, Record<string, OptionSheet>>
> = deviceOptionSheetsFile.byToken;
export const deviceOptionSheetsMeta = {
  source: deviceOptionSheetsFile.source,
  lastUpdated: deviceOptionSheetsFile.lastUpdated,
};

const deviceIndicationsFile = DeviceIndicationsFileSchema.parse(deviceIndicationsRaw);
/** indications officielles de prise en charge : code → { mode → texte } (survol écran VPH). */
export const deviceIndicationsByCode: Record<string, Record<string, string>> =
  deviceIndicationsFile.byCode;

const prestationsFile = PrestationsFileSchema.parse(prestationsRaw);
/** prestations & forfaits LPPR : LLD (trimestriel), LCD (hebdo + options d'achat), SAV, MAD. */
export const prestationProducts: Prestation[] = prestationsFile.products;
export const prestationsMeta = {
  source: prestationsFile.source,
  lastUpdated: prestationsFile.lastUpdated,
};

const cumulFile = CumulFileSchema.parse(cumulRaw);
/** catégories VPH cumulables (acronyme LPPR + libellé), dans l'ordre du document. */
export const cumulCategories: CumulCategory[] = cumulFile.categories;
/** incompatibilités de cumul : acronyme → acronymes non cumulables (relation symétrique). */
export const cumulIncompatible: Record<string, string[]> = cumulFile.incompatible;
export const cumulMeta = { source: cumulFile.source, lastUpdated: cumulFile.lastUpdated };

/* Index pratique code → device. */
export const deviceByCode: Record<string, Device> = Object.fromEntries(
  devices.map((d) => [d.code, d]),
);

/* --- cohérence inter-fichiers (non exprimable dans un seul schéma) --- */
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`[PRECONIA data] ${msg}`);
}

for (const a of adjonctions) {
  assert(a.group in adjGroups, `adjonction ${a.code} : groupe inconnu « ${a.group} »`);
  for (const code of a.compat) {
    assert(code in deviceByCode, `adjonction ${a.code} : compat « ${code} » absent de devices.json`);
  }
}
for (const region of papRegions) {
  assert(region.forfait in papForfaits, `région PAP « ${region.name} » : forfait ${region.forfait} sans définition`);
}
// meta.livraison est un raccourci d'affichage : il doit rester aligné sur la prestation LPPR.
const livraisonPresta = prestationProducts.find((p) => p.code === meta.livraison.code);
assert(!!livraisonPresta, `meta.livraison : code ${meta.livraison.code} absent des prestations`);
assert(
  livraisonPresta!.tarif === meta.livraison.price,
  `meta.livraison : tarif ${meta.livraison.price} ≠ prestation ${livraisonPresta!.tarif}`,
);

const cumulCodes = new Set(cumulCategories.map((c) => c.code));
for (const [from, list] of Object.entries(cumulIncompatible)) {
  assert(cumulCodes.has(from), `cumul : acronyme « ${from} » absent des catégories`);
  for (const to of list) {
    assert(cumulCodes.has(to), `cumul : « ${from} » incompatible avec « ${to} » inconnu`);
  }
}

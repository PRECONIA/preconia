import devicesRaw from "@/data/devices.json";
import adjonctionsRaw from "@/data/adjonctions.json";
import papRaw from "@/data/pap.json";
import classesRaw from "@/data/classes.json";
import besoinsRaw from "@/data/besoins.json";
import lpprRaw from "@/data/lppr.json";
import lpprAdjRaw from "@/data/lppr-adjonctions.json";
import adjBrandsRaw from "@/data/adjonction-brands.json";
import deviceLppRaw from "@/data/device-lpp.json";
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
  MetaSchema,
} from "./schemas";
import type { DeviceLppEntry } from "./types";
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

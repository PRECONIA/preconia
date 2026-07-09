import devicesRaw from "@/data/devices.json";
import adjonctionsRaw from "@/data/adjonctions.json";
import papRaw from "@/data/pap.json";
import classesRaw from "@/data/classes.json";
import classesScoRaw from "@/data/classes-sco.json";
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
import madForfaitsRaw from "@/data/mad-forfaits.json";
import locationForfaitsRaw from "@/data/location-forfaits.json";
import metaRaw from "@/data/meta.json";
import fichesTechRaw from "@/data/fiches-techniques.json";

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
  FichesTechniquesFileSchema,
  CumulFileSchema,
  PrestationsFileSchema,
  MadForfaitsFileSchema,
  LocationForfaitsFileSchema,
  MetaSchema,
} from "./schemas";
import type {
  DeviceLppEntry,
  DeviceModelEntry,
  OptionSheet,
  CumulCategory,
  Prestation,
  MadNiveau,
  LcdForfaitEntry,
} from "./types";
import type { Device, Eval, Presc } from "./types";

/* Chargement + validation de la donnée au niveau module.
   Si un JSON est invalide → `parse` lève → échec de `next build` et des tests.
   (couvre l'item HANDOFF « schéma de validation des JSON au build ».) */

const devicesFile = DevicesFileSchema.parse(devicesRaw);
const adjonctionsFile = AdjonctionsFileSchema.parse(adjonctionsRaw);
const papFile = PapFileSchema.parse(papRaw);

export const devices = devicesFile.devices;
export const prescribers = devicesFile.prescribers as Record<Presc, string>;
/** Libellés d'évaluation/préconisation (§3.1.4.2.1) — qui remplit les fiches, distinct
    du prescripteur (§3.1.4.2.4). */
export const evaluators = devicesFile.evaluators as Record<Eval, string>;
export const modes = devicesFile.modes;
// cohérence : un dispositif sans fiche d'évaluation/préconisation a forcément eval = "aucune",
// et réciproquement (les deux dérivent du parcours §3.1.4.2 vs §3.1.4.1).
for (const d of devices)
  if ((d.eval === "aucune") !== (d.fiche === false))
    throw new Error(`devices.json : eval/fiche incohérents pour ${d.code}`);

export const adjonctions = adjonctionsFile.items;
export const adjGroups = adjonctionsFile.groups;

export const papRegions = papFile.regions;
export const papForfaits = papFile.forfaits;

export const classes = ClassesFileSchema.parse(classesRaw);
/* Classes d'usage des scooters (A+ / B / C — Titre IV, 2.4.2.4) : mêmes valeurs internes
   A/B/C (jetons SCO-A/B/C de la base LPP), libellés et descriptions propres au scooter. */
export const classesSco = ClassesFileSchema.parse(classesScoRaw);
if (classesSco.map((c) => c.value).join() !== classes.map((c) => c.value).join())
  throw new Error("classes-sco.json : les valeurs doivent refléter celles de classes.json (A/B/C)");
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

const fichesTechFile = FichesTechniquesFileSchema.parse(fichesTechRaw);
/** spécifications techniques minimales (arrêté 06/02/2025) : code dispositif → lignes {k, v}
    du tableau officiel — affichées sur la fiche récapitulative PDF. */
export const ficheTechniqueByCode: Record<string, { rows: { k: string; v: string }[] }> =
  fichesTechFile.byCode;
// cohérence : chaque dispositif du walker doit avoir sa fiche technique (et réciproquement).
for (const d of devices)
  if (!fichesTechFile.byCode[d.code])
    throw new Error(`fiches-techniques.json : fiche manquante pour ${d.code}`);

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

/** index code → prestation (tarifs officiels, source unique pour MAD/livraison/LLD…). */
export const prestationByCode: Record<string, Prestation> = Object.fromEntries(
  prestationProducts.map((p) => [p.code, p]),
);

const madForfaitsFile = MadForfaitsFileSchema.parse(madForfaitsRaw);
/** correspondance dispositif → niveau MAD (codes MAD1/MAD2 dans les prestations). */
export const madNiveaux: MadNiveau[] = madForfaitsFile.niveaux;

const locationForfaitsFile = LocationForfaitsFileSchema.parse(locationForfaitsRaw);
/** LCD : catégorie (FMP, FMPR, FRM, FRE) → codes des forfaits hebdo ≤13 sem / 14–26 sem + option d'achat. */
export const lcdForfaits: Record<string, LcdForfaitEntry> = locationForfaitsFile.lcd;
/** forfait de mise à disposition propre à la LCD (Titre I) : code + catégories éligibles (FRM, FRE). */
export const madLcd = locationForfaitsFile.madLcd;
/** LLD : jeton de type (FRMP, FREP-A/B/C, FREV…) → code du forfait trimestriel. */
export const lldForfaits: Record<string, string> = locationForfaitsFile.lld;

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

// mad-forfaits : tout code référencé doit exister dans les prestations, tout device dans devices.
for (const n of madNiveaux) {
  for (const c of [n.premiere, n.renouvellement]) {
    assert(c in prestationByCode, `mad-forfaits niveau ${n.niveau} : code ${c} absent des prestations`);
  }
  for (const dc of n.devices) {
    assert(dc in deviceByCode, `mad-forfaits niveau ${n.niveau} : dispositif « ${dc} » inconnu`);
  }
}

// location-forfaits : tout code référencé doit exister dans les prestations, et la couverture
// doit être exactement celle des modes déclarés dans devices.json (LCD/LLD).
for (const [cat, entry] of Object.entries(lcdForfaits)) {
  for (const c of [entry.s13, entry.s26, entry.optionAchat]) {
    assert(c in prestationByCode, `location-forfaits LCD ${cat} : code ${c} absent des prestations`);
  }
  assert(
    deviceByCode[cat]?.modes.includes("LCD") ?? false,
    `location-forfaits LCD : « ${cat} » n'est pas un dispositif à mode LCD`,
  );
}
for (const d of devices.filter((x) => x.modes.includes("LCD"))) {
  assert(d.code in lcdForfaits, `location-forfaits : forfait LCD manquant pour ${d.code}`);
}
assert(madLcd.code in prestationByCode, `location-forfaits madLcd : code ${madLcd.code} absent des prestations`);
for (const dc of madLcd.devices) {
  assert(
    deviceByCode[dc]?.modes.includes("LCD") ?? false,
    `location-forfaits madLcd : « ${dc} » n'est pas un dispositif à mode LCD`,
  );
}
for (const [token, code] of Object.entries(lldForfaits)) {
  assert(code in prestationByCode, `location-forfaits LLD ${token} : code ${code} absent des prestations`);
  const base = token.split("-")[0];
  assert(
    deviceByCode[base]?.modes.includes("LLD") ?? false,
    `location-forfaits LLD : « ${token} » n'est pas un dispositif à mode LLD`,
  );
}
for (const d of devices.filter((x) => x.modes.includes("LLD"))) {
  const covered =
    d.code in lldForfaits ||
    ["A", "B", "C"].every((cl) => `${d.code}-${cl}` in lldForfaits);
  assert(covered, `location-forfaits : forfait LLD manquant pour ${d.code}`);
}

const cumulCodes = new Set(cumulCategories.map((c) => c.code));
for (const [from, list] of Object.entries(cumulIncompatible)) {
  assert(cumulCodes.has(from), `cumul : acronyme « ${from} » absent des catégories`);
  for (const to of list) {
    assert(cumulCodes.has(to), `cumul : « ${from} » incompatible avec « ${to} » inconnu`);
  }
}

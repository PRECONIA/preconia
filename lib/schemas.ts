import { z } from "zod";

/* Schémas zod — un par fichier de `data/`. Source unique : les types TS en sont inférés
   (voir lib/types.ts) et la donnée est validée au chargement (voir lib/data.ts). */

/* --- énumérations structurelles (le code en dépend : routage, forfaits, classes) --- */
export const PrescEnum = z.enum(["large", "spe", "pluri"]);
export const ModeEnum = z.enum(["ACHAT", "LCD", "LLD"]);
export const ForfaitEnum = z.enum(["A", "B"]);
export const ClasseValueEnum = z.enum(["A", "B", "C"]);

/* --- devices.json --- */
export const DeviceSchema = z.object({
  code: z.string(),
  family: z.string(),
  name: z.string(),
  electric: z.boolean(),
  modular: z.boolean(),
  fiche: z.boolean(),
  dap: z.boolean(),
  presc: PrescEnum,
  modes: z.array(ModeEnum).nonempty(),
  tarif: z.number().optional(),
  child: z.boolean().optional(),
  indications: z.array(z.string()),
  ft: z.array(z.string()),
});

export const DevicesFileSchema = z.object({
  prescribers: z.record(z.string(), z.string()),
  modes: z.record(z.string(), z.object({ label: z.string(), condition: z.string() })),
  devices: z.array(DeviceSchema).nonempty(),
});

/* --- adjonctions.json ---
   `group` reste une string (et non un enum) pour ne pas coupler la donnée au code :
   ajouter un groupe = éditer seulement le JSON. La cohérence group ∈ groups est
   vérifiée au chargement (lib/data.ts). */
export const AdjonctionSchema = z.object({
  code: z.string(),
  group: z.string(),
  name: z.string(),
  price: z.number().nullable().optional(),
  devis: z.literal(true).optional(),
  tbd: z.literal(true).optional(),
  compat: z.array(z.string()).nonempty(),
  exclusiveGroup: z.string().optional(),
});

export const AdjonctionsFileSchema = z.object({
  groups: z.record(z.string(), z.string()),
  items: z.array(AdjonctionSchema),
});

/* --- pap.json --- */
export const PapForfaitSchema = z.object({
  code: z.string(),
  price: z.number(),
  label: z.string(),
  /** paragraphes officiels (INI-CERAH) : définition + spécificités techniques minimales. */
  definition: z.array(z.string()),
  technique: z.array(z.string()),
});
export const PapItemSchema = z.object({
  name: z.string(),
  desc: z.string(),
  /** description officielle complète du PAP (encart d'information). */
  info: z.string(),
});
export const PapRegionSchema = z.object({
  name: z.string(),
  forfait: ForfaitEnum,
  items: z.array(PapItemSchema).nonempty(),
});
export const PapFileSchema = z.object({
  forfaits: z.object({ A: PapForfaitSchema, B: PapForfaitSchema }),
  regions: z.array(PapRegionSchema),
});

/* --- classes.json --- */
export const ClasseSchema = z.object({
  value: ClasseValueEnum,
  label: z.string(),
  route: z.boolean(),
  desc: z.string(),
});
export const ClassesFileSchema = z.array(ClasseSchema);

/* --- besoins.json (catalogue de champs ; when/effect sont descriptifs, non exécutés) --- */
export const BesoinOptionSchema = z.object({ v: z.string(), t: z.string() });
export const BesoinFieldSchema = z.object({
  id: z.string(),
  label: z.string(),
  hint: z.string().optional(),
  when: z.string().optional(),
  source: z.string().optional(),
  options: z.array(BesoinOptionSchema).optional(),
  effect: z.string().optional(),
});
export const BesoinsFileSchema = z.object({ appliesWhen: z.string(), fields: z.array(BesoinFieldSchema) });

/* --- lppr.json (base nomenclature scrappée — catalogue produits VPH par code LPP) --- */
export const LpprProductSchema = z.object({
  code: z.string(),
  label: z.string(),
  category: z.string(),
});
export const LpprFileSchema = z.object({
  source: z.string(),
  lastUpdated: z.string(),
  products: z.array(LpprProductSchema),
});

/* --- adjonction-brands.json (correspondance code mère → variantes de marque, dérivée du
   regroupement par ordre de page de la base CNAM ; sert à adapter le code LPP à la marque) --- */
export const AdjonctionBrandGroupSchema = z.object({
  base: z.string(),
  function: z.string(),
  byBrand: z.record(z.string(), z.string()),
});
export const AdjonctionBrandsFileSchema = z.object({
  source: z.string(),
  lastUpdated: z.string(),
  groups: z.array(AdjonctionBrandGroupSchema),
});

/* --- device-lpp.json (code LPP « mère » + tarif par type de fauteuil, scrappé des fiches CNAM) --- */
export const DeviceLppEntrySchema = z.object({
  code: z.string(),
  tarif: z.number().nullable(),
});
export const DeviceLppFileSchema = z.object({
  source: z.string(),
  lastUpdated: z.string(),
  byType: z.record(z.string(), DeviceLppEntrySchema),
});

/* --- device-models.json (catalogue CERAH : type → marque → {code LPP propre, modèles commerciaux}).
   token/marque/code viennent de la nomenclature CNAM (lppr.json, token explicite par code) ; les
   noms de modèles viennent du PDF CERAH, rattachés par code. Le code LPP est propre à (type, marque) ;
   les modèles d'une même marque le partagent (vérifié). */
export const DeviceModelSchema = z.object({
  name: z.string(),
  /** code LPP propre au modèle ; null = pas de code produit → repli sur le code générique (mère). */
  code: z.string().nullable(),
});
export const DeviceModelEntrySchema = z.object({
  /** code LPP de la marque (partagé par ses modèles codés, pour le type/classe). */
  code: z.string(),
  models: z.array(DeviceModelSchema),
});
export const DeviceModelsFileSchema = z.object({
  source: z.string(),
  lastUpdated: z.string(),
  byToken: z.record(z.string(), z.record(z.string(), DeviceModelEntrySchema)),
});

/* --- device-option-sheets.json (fiche tarif/options du constructeur par modèle commercial).
   Clé par token/classe → marque → modèle : un même modèle peut avoir une fiche différente selon
   la classe (ex. Q300 M Mini Sedeo Pro : fiche FREP-A ≠ fiche FREP-B, codes LPPR distincts).
   `kind` : "pdf" = fiche tarif/options PDF officielle ; "page" = repli page produit constructeur.
   Aucune entrée = « pas de fiche d'option constructeur disponible ». Liens vérifiés uniquement
   (règle #1 : jamais de source inventée). --- */
export const OptionSheetSchema = z.object({
  url: z.string().url(),
  kind: z.enum(["pdf", "page"]),
});
export const DeviceOptionSheetsFileSchema = z.object({
  source: z.string(),
  lastUpdated: z.string(),
  byToken: z.record(z.string(), z.record(z.string(), z.record(z.string(), OptionSheetSchema))),
});

/* --- device-indications.json (indications officielles de prise en charge par dispositif et par
   mode, INI-CERAH ; affichées en survol sur l'écran de choix du VPH). --- */
export const DeviceIndicationsFileSchema = z.object({
  source: z.string(),
  lastUpdated: z.string(),
  byCode: z.record(z.string(), z.record(z.string(), z.string())),
});

/* --- cumul.json (règles de cumul VPH : incompatibilités par acronyme LPPR).
   `incompatible[X]` = acronymes non cumulables avec X (relation symétrique appliquée au calcul).
   Deux VPH sont cumulables si aucun des deux ne figure dans l'incompatibilité de l'autre. --- */
export const CumulCategorySchema = z.object({ code: z.string(), label: z.string() });
export const CumulFileSchema = z.object({
  source: z.string(),
  lastUpdated: z.string(),
  categories: z.array(CumulCategorySchema).nonempty(),
  incompatible: z.record(z.string(), z.array(z.string())),
});

/* --- meta.json --- */
export const MetaSchema = z.object({
  source: z.string(),
  lastUpdated: z.string(),
  disclaimer: z.string(),
  livraison: z.object({ code: z.string(), price: z.number(), label: z.string() }),
});

import type { z } from "zod";
import type {
  PrescEnum,
  ModeEnum,
  ForfaitEnum,
  ClasseValueEnum,
  DeviceSchema,
  AdjonctionSchema,
  PapForfaitSchema,
  PapItemSchema,
  PapRegionSchema,
  ClasseSchema,
  BesoinFieldSchema,
  MetaSchema,
} from "./schemas";

/* Types inférés des schémas zod — source unique de vérité, pas de duplication. */

export type Presc = z.infer<typeof PrescEnum>;
export type Mode = z.infer<typeof ModeEnum>;
export type Forfait = z.infer<typeof ForfaitEnum>;
export type ClasseValue = z.infer<typeof ClasseValueEnum>;

export type Device = z.infer<typeof DeviceSchema>;
export type Adjonction = z.infer<typeof AdjonctionSchema>;
export type PapForfait = z.infer<typeof PapForfaitSchema>;
export type PapItem = z.infer<typeof PapItemSchema>;
export type PapRegion = z.infer<typeof PapRegionSchema>;
export type Classe = z.infer<typeof ClasseSchema>;
export type BesoinField = z.infer<typeof BesoinFieldSchema>;
export type Meta = z.infer<typeof MetaSchema>;

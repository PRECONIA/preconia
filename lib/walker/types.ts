import type { Adjonction, ClasseValue } from "../types";

/* Étapes du walker. Le scooter, la base et la poussette sont, pour l'instant,
   retirés du flux de préconisation (les dispositifs restent dans la donnée). */
export type Stage =
  | "home"
  | "cumul"
  | "age"
  | "duree"
  | "lcd_duree"
  | "acq"
  | "mad"
  | "mob"
  | "cfg_man"
  | "cfg_elec"
  | "besoins"
  | "adj"
  | "result";

export type Age = "adulte" | "enfant";
export type Duree = "temp" | "durable";
/** Durée de la location courte durée : ≤ 13 semaines / 14 à 26 semaines (forfait hebdo distinct). */
export type LcdDuree = "s13" | "s26";
/** Besoin durable : achat ou location longue durée (codes LPPR distincts). */
export type Acquisition = "achat" | "lld";
export type Mob = "manuel" | "elec";
export type OuiNon = "oui" | "non";
/** Contexte de mise à disposition : première MAD ou renouvellement avec changement de
    catégorie → forfait MAD1 ; renouvellement à l'identique → forfait MAD2. */
export type Mad = "premiere" | "renouv_cat" | "renouv_id";

/** Réponses accumulées au fil du parcours (aucune donnée patient). */
export interface Answers {
  /** Le patient possède-t-il déjà un VPH pris en charge (question cumul) ? */
  cumul: OuiNon | null;
  age: Age | null;
  duree: Duree | null;
  /** Si temporaire : durée de la LCD (détermine le forfait hebdomadaire). */
  lcdDuree: LcdDuree | null;
  /** Si durable : achat ou LLD (détermine le code LPPR du fauteuil et les VPH proposés). */
  acquisition: Acquisition | null;
  /** Première mise à disposition (MAD1) ou renouvellement à l'identique (MAD2). */
  mad: Mad | null;
  mob: Mob | null;
  device: string | null; // code dispositif
  classe: ClasseValue | null;
  /** Aptitude à conduire le fauteuil (électrique) : "non" → conduite par tierce personne. */
  aptitude: OuiNon | null;
  /** Marque du fauteuil (étape adjonctions) : adapte les codes LPP des adjonctions / PAP. */
  vehicleBrand: string | null;
  /** Modèle commercial du fauteuil (optionnel) : documente la fiche ; code LPP propre à la marque. */
  vehicleModel: string | null;
}

export interface WalkerState {
  stage: Stage;
  history: Stage[];
  answers: Answers;
  /** PAP cochés, par nom d'item. */
  pap: Record<string, boolean>;
  /** Adjonctions cochées, par code LPPR. */
  adj: Record<string, boolean>;
}

export type Action =
  | { type: "GO"; stage: Stage }
  | { type: "BACK" }
  | { type: "RESET" }
  | { type: "SET_ANSWER"; field: keyof Answers; value: Answers[keyof Answers] }
  | { type: "CHOOSE_DEVICE"; code: string; mob?: Mob }
  | { type: "TOGGLE_ADJ"; item: Adjonction }
  | { type: "TOGGLE_PAP"; name: string };

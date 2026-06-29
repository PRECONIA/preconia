import type { Adjonction, ClasseValue } from "../types";

/* Étapes du walker. Le scooter, la base et la poussette sont, pour l'instant,
   retirés du flux de préconisation (les dispositifs restent dans la donnée). */
export type Stage =
  | "home"
  | "age"
  | "duree"
  | "mob"
  | "cfg_man"
  | "cfg_elec"
  | "besoins"
  | "adj"
  | "result";

export type Age = "adulte" | "enfant";
export type Duree = "temp" | "durable";
export type Mob = "manuel" | "elec";
export type OuiNon = "oui" | "non";

/** Réponses accumulées au fil du parcours (aucune donnée patient). */
export interface Answers {
  age: Age | null;
  duree: Duree | null;
  mob: Mob | null;
  device: string | null; // code dispositif
  classe: ClasseValue | null;
  /** Aptitude à conduire le fauteuil (électrique) : "non" → conduite par tierce personne. */
  aptitude: OuiNon | null;
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

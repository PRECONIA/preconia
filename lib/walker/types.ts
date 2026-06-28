import type { Adjonction, ClasseValue } from "../types";

/* Étapes du walker (cf. CLAUDE.md « Flux du walker »). */
export type Stage =
  | "home"
  | "age"
  | "duree"
  | "mob"
  | "cfg_man"
  | "cfg_elec"
  | "cfg_pou"
  | "besoins"
  | "adj"
  | "result";

export type Age = "adulte" | "enfant";
export type Duree = "temp" | "durable";
export type Mob = "manuel" | "elec" | "scooter" | "poussette" | "base" | "cycle";
export type OuiNon = "oui" | "non";
export type Depl = "int" | "mixte" | "ext";
export type Projet = "premiere" | "renouv";

/** Réponses accumulées au fil du parcours (aucune donnée patient). */
export interface Answers {
  age: Age | null;
  duree: Duree | null;
  mob: Mob | null;
  device: string | null; // code dispositif
  conduite: boolean; // dérivé de conduiteAuto
  classe: ClasseValue | null;
  depl: Depl | null;
  cotes: OuiNon | null;
  cognition: OuiNon | null;
  conduiteAuto: OuiNon | null;
  projet: Projet | null;
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

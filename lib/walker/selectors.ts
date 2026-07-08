import { adjonctions, classes, deviceByCode, papForfaits, papRegions } from "../data";
import {
  classeRoute,
  deviceHasClasses,
  computeSubtotal,
  deriveForfaits,
  filterAdjonctions,
  hasOpenItems,
  selectedAdjonctions,
} from "../rules";
import type { Adjonction, Device, Forfait } from "../types";
import type { Answers, WalkerState } from "./types";

/* Dérivés purs de l'état — utilisés par l'UI et testables. */

export function selectDevice(state: WalkerState): Device | null {
  return state.answers.device ? deviceByCode[state.answers.device] ?? null : null;
}

export function selectCompatAdj(state: WalkerState): Adjonction[] {
  const device = selectDevice(state);
  return device ? filterAdjonctions(device, adjonctions) : [];
}

export function selectSelectedAdj(state: WalkerState): Adjonction[] {
  return selectedAdjonctions(state.adj, adjonctions);
}

export function selectForfaits(state: WalkerState): Forfait[] {
  return deriveForfaits(state.pap, papRegions);
}

export interface Costs {
  adjCost: number;
  papCost: number;
  subtotal: number;
  hasOpen: boolean;
}

export function selectCosts(state: WalkerState): Costs {
  const selectedAdj = selectSelectedAdj(state);
  const forfaits = selectForfaits(state);
  const subtotal = computeSubtotal(selectedAdj, forfaits, papForfaits);
  const papCost = forfaits.reduce((s, f) => s + papForfaits[f].price, 0);
  return { adjCost: subtotal - papCost, papCost, subtotal, hasOpen: hasOpenItems(selectedAdj) };
}

export function selectRoute(state: WalkerState): boolean {
  const device = selectDevice(state);
  // seuls les dispositifs à classes (FRE/FREP/SCO) portent la notion de code de la route ;
  // le FREV (électrique sans classe) n'est pas concerné.
  if (!device || !deviceHasClasses(device)) return false;
  return classeRoute(state.answers.classe, classes);
}

/** Fil de prescription (facets affichées en haut du walker). */
export interface Facet {
  k: string;
  v: string | null;
}

const MOB_LABEL: Record<string, string> = {
  manuel: "Manuel / podal",
  elec: "Électrique",
};

/** Types dont le code LPP dépend de la classe (la classe est alors affichée : FRE-B, FREP-C…). */
const CLASSED = new Set(["FRE", "FREP", "SCO"]);

export function facets(answers: Answers): Facet[] {
  const code = answers.device ? deviceByCode[answers.device]?.code ?? null : null;
  const deviceLabel =
    code && CLASSED.has(code) && answers.classe ? `${code}-${answers.classe}` : code;
  return [
    { k: "Âge", v: answers.age ? (answers.age === "enfant" ? "Enfant" : "Adulte") : null },
    { k: "Durée", v: answers.duree ? (answers.duree === "temp" ? "Temporaire" : "Durable") : null },
    {
      k: "Prise en charge",
      v:
        answers.duree === "temp"
          ? answers.lcdDuree
            ? answers.lcdDuree === "s13"
              ? "LCD ≤ 13 sem"
              : "LCD 14–26 sem"
            : "LCD"
          : answers.acquisition
            ? answers.acquisition === "achat"
              ? "Achat"
              : "LLD"
            : null,
    },
    {
      k: "Mise à dispo",
      v: answers.mad
        ? answers.mad === "premiere"
          ? "Première"
          : answers.mad === "renouv_cat"
            ? "Renouv. changement de catégorie"
            : "Renouv. à l'identique"
        : null,
    },
    { k: "Mobilité", v: answers.mob ? MOB_LABEL[answers.mob] ?? null : null },
    { k: "Dispositif", v: deviceLabel },
  ];
}

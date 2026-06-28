import { adjonctions, classes, deviceByCode, papForfaits, papRegions } from "../data";
import {
  classeRoute,
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
  if (!device || !device.electric) return false;
  return classeRoute(state.answers.classe, classes);
}

/** Fil de prescription (facets affichées en haut du walker). */
export interface Facet {
  k: string;
  v: string | null;
}

const MOB_LABEL: Record<string, string> = {
  manuel: "Manuel",
  elec: "Électrique",
  scooter: "Scooter",
  poussette: "Poussette",
  base: "Base",
  cycle: "Cycle",
};

export function facets(answers: Answers): Facet[] {
  return [
    { k: "Âge", v: answers.age ? (answers.age === "enfant" ? "Enfant" : "Adulte") : null },
    { k: "Durée", v: answers.duree ? (answers.duree === "temp" ? "Temporaire" : "Durable") : null },
    { k: "Mobilité", v: answers.mob ? MOB_LABEL[answers.mob] ?? null : null },
    { k: "Dispositif", v: answers.device ? deviceByCode[answers.device]?.code ?? null : null },
  ];
}

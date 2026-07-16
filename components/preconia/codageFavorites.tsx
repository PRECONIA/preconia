"use client";

/* Favoris de l'aide au codage : l'utilisateur épingle ses codes les plus usités
   (étoile sur chaque résultat CIM-10, CCAM, LPP) et les retrouve dans le volet
   « Favoris » de la barre. Persistance locale (localStorage, aucune donnée
   patient) ; synchronisation entre composants par évènement, et entre onglets
   par l'évènement storage. */

import { useEffect, useState } from "react";

export interface FavCode {
  base: "cim10" | "ccam" | "lpp";
  code: string;
  label: string;
}

export const FAV_BASE_LABEL: Record<FavCode["base"], string> = {
  cim10: "CIM-10",
  ccam: "CCAM",
  lpp: "LPP",
};

const KEY = "preconia-codage-favoris";
const EVT = "preconia-codage-favoris-change";

export function loadFavs(): FavCode[] {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? (JSON.parse(raw) as FavCode[]) : [];
    return Array.isArray(data) ? data.filter((f) => f && f.code && f.base && f.label) : [];
  } catch {
    return [];
  }
}

function saveFavs(favs: FavCode[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(favs));
  } catch {
    /* stockage local indisponible */
  }
  window.dispatchEvent(new Event(EVT));
}

export function isFaved(favs: FavCode[], base: FavCode["base"], code: string): boolean {
  return favs.some((f) => f.base === base && f.code === code);
}

export function toggleFav(entry: FavCode) {
  const favs = loadFavs();
  const next = isFaved(favs, entry.base, entry.code)
    ? favs.filter((f) => !(f.base === entry.base && f.code === entry.code))
    : [...favs, entry];
  saveFavs(next);
}

export function removeFav(base: FavCode["base"], code: string) {
  saveFavs(loadFavs().filter((f) => !(f.base === base && f.code === code)));
}

/** État réactif des favoris (chargés au montage, suivis via évènements). */
export function useFavs(): FavCode[] {
  const [favs, setFavs] = useState<FavCode[]>([]);
  useEffect(() => {
    const sync = () => setFavs(loadFavs());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return favs;
}

/** Étoile d'épinglage d'une ligne de résultat (frère du bouton copie — jamais imbriqué). */
export function FavStar({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      title={on ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={`shrink-0 self-stretch border-l border-line-soft px-2.5 text-[15px] transition-colors hover:bg-[#e0f2fe]/60 ${
        on ? "text-[#0ea5e9]" : "text-ink-soft/40 hover:text-[#0ea5e9]"
      }`}
    >
      {on ? "★" : "☆"}
    </button>
  );
}

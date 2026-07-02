"use client";

/* Encart d'entrée « à accepter » (avertissement outil en développement / non opposable).
   Choix SEO-safe : rendu serveur SANS encart (getServerSnapshot = « accepté »), donc les moteurs
   voient la page complète, sans interstitiel bloquant. Côté client, l'encart n'apparaît que pour
   les visiteurs qui n'ont pas encore accepté. Acceptation mémorisée (localStorage) : une fois par
   navigateur. useSyncExternalStore : pas de setState en effet, pas de désynchro d'hydratation. */

import { useSyncExternalStore } from "react";
import { Logo } from "@/components/preconia/Logo";

const STORAGE_KEY = "preconia-disclaimer-accepted";
const EVENT = "preconia-disclaimer-change";

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
function getSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false; // stockage indisponible → on affiche l'encart (comportement sûr)
  }
}
const getServerSnapshot = (): boolean => true; // pas d'encart au SSR (indexable)

export function EntryDisclaimer({ children }: { children: React.ReactNode }) {
  const accepted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <>
      {/* le site reste dans le DOM ; simplement non interactif tant que l'encart est affiché */}
      <div inert={!accepted}>{children}</div>

      {!accepted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/40 p-4 backdrop-blur-md">
          <div className="pc-fade w-full max-w-md overflow-hidden rounded-2xl border border-line bg-card shadow-xl">
            <div className="h-[3px] bg-gradient-to-r from-petrol to-petrol-deep" />
            <div className="px-7 py-8 text-center">
              <Logo className="mx-auto h-16 w-16 drop-shadow-sm" />
              <div className="mt-3 text-2xl font-bold tracking-tight">
                PRECON<span className="text-petrol">IA</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-ink">Outil en cours de développement</p>

              <p className="mt-4 text-left text-sm leading-relaxed text-ink-soft">
                PRECONIA est une aide à la préconisation des VPH{" "}
                <span className="font-semibold text-ink">en cours de développement</span>. Les
                informations fournies sont{" "}
                <span className="font-semibold text-ink">non opposables</span> et{" "}
                <span className="font-semibold text-ink">
                  adossées aux bases de données officielles
                </span>{" "}
                (nomenclature LPPR, fiches constructeurs). Elles{" "}
                <span className="font-semibold text-ink">
                  doivent être vérifiées par l&apos;utilisateur
                </span>{" "}
                avant toute décision — PRECONIA ne remplace ni l&apos;évaluation clinique ni
                l&apos;essai réel.
              </p>

              <button
                type="button"
                onClick={accept}
                autoFocus
                className="mt-6 w-full rounded-lg bg-petrol px-5 py-3 font-semibold text-white transition-colors hover:bg-petrol-deep"
              >
                Je comprends et j&apos;accepte
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

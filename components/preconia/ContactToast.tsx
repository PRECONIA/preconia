"use client";

/* Petit encart « pop-up » de contact, en bas à gauche. Apparaît 10 s après l'arrivée sur
   le site et disparaît automatiquement 30 s plus tard (ou au clic sur ×). Invite à écrire
   via la page /contact. Orange cohérent avec le bouton Contact de la barre d'ancrage. */

import { useEffect, useState } from "react";
import Link from "next/link";

const DELAI_APPARITION = 10_000; // 10 s après le chargement
const DUREE_AFFICHAGE = 30_000; // visible 30 s

export function ContactToast() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setShow(true), DELAI_APPARITION);
    const t2 = window.setTimeout(() => setShow(false), DELAI_APPARITION + DUREE_AFFICHAGE);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (!show || dismissed) return null;

  return (
    <div
      role="complementary"
      aria-label="Nous contacter"
      className="pc-fade fixed bottom-4 left-4 z-40 w-[min(19rem,calc(100vw-2rem))] rounded-xl border border-line bg-card p-4 shadow-xl"
    >
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Fermer"
        className="absolute right-2.5 top-2.5 text-sm text-ink-soft transition-colors hover:text-ink"
      >
        ✕
      </button>
      <p className="pr-5 text-sm font-semibold leading-snug text-ink">
        Une question&nbsp;? Une suggestion ou une remarque&nbsp;?
      </p>
      <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
        Écrivez-nous, nous vous répondrons.
      </p>
      <Link
        href="/contact"
        className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
      >
        Écrivez-nous
      </Link>
    </div>
  );
}

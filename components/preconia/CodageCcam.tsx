"use client";

/* Aide au codage CCAM — barre de recherche centrale (search-first), thème bleu
   marine / bleu ciel. Le moteur est prêt à recevoir la base CCAM (data à venir) :
   `CCAM_ACTES` sera alimenté et `search()` branché sur les vrais actes. En
   attendant, l'interface affiche un état « base en cours d'intégration ». */

import { useMemo, useState } from "react";

/** Forme cible d'un acte CCAM (à confirmer/adapter selon le fichier fourni). */
interface ActeCcam {
  code: string; // ex. « HBQK389 »
  label: string; // libellé de l'acte
  tarif?: number | null; // tarif de base, si présent dans le fichier
  chapitre?: string; // regroupement (appareil, région…)
}

/* Base CCAM — à alimenter depuis le fichier fourni par Thomas. */
const CCAM_ACTES: ActeCcam[] = [];

function search(q: string): ActeCcam[] {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  return CCAM_ACTES.filter(
    (a) => a.code.toLowerCase().includes(t) || a.label.toLowerCase().includes(t),
  ).slice(0, 40);
}

export function CodageCcam() {
  const [q, setQ] = useState("");
  const results = useMemo(() => search(q), [q]);
  const ready = CCAM_ACTES.length > 0;
  const showResults = q.trim().length >= 2;

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="relative">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#0ea5e9]"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un acte, un code ou un libellé CCAM…"
          aria-label="Recherche d'un acte CCAM"
          className="cc-search py-4 pl-12 pr-4 text-[15px] text-ink"
        />
      </div>

      {!showResults && (
        <p className="mt-4 text-center text-[13px] text-ink-soft">
          Tapez au moins deux caractères — par exemple un code d&apos;acte, un mot du libellé ou une
          région anatomique.
        </p>
      )}

      {showResults && (
        <div className="cc-panel mt-4 overflow-hidden">
          {ready && results.length > 0 ? (
            <ul className="divide-y divide-line-soft">
              {results.map((a) => (
                <li key={a.code} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 shrink-0 rounded bg-[#e0f2fe] px-1.5 py-0.5 font-mono text-[12px] font-semibold text-[#0c4a6e]">
                    {a.code}
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-snug text-ink">{a.label}</span>
                  {a.tarif != null && (
                    <span className="shrink-0 font-mono text-[13px] text-[#0c2740]">
                      {a.tarif.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : ready ? (
            <p className="px-4 py-6 text-center text-sm text-ink-soft">
              Aucun acte ne correspond à cette recherche.
            </p>
          ) : (
            <div className="px-5 py-6 text-center">
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0ea5e9]">
                ▸ Base en cours d&apos;intégration
              </div>
              <p className="mx-auto mt-2 max-w-[46ch] text-sm leading-relaxed text-ink-soft">
                Le moteur de recherche est en place ; la base CCAM sera intégrée prochainement pour
                renvoyer les actes, leurs codes et leurs tarifs.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

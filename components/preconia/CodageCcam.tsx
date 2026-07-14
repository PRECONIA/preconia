"use client";

/* Aide au codage CCAM — moteur de recherche search-first ultra-performant.
   La base (public/ccam.json, ~8 300 actes, ~193 Ko gzip) est chargée une seule
   fois à la demande (hors bundle JS), puis indexée en mémoire : chaque acte reçoit
   une chaîne normalisée (minuscules, sans accents) pour un filtrage indexOf rapide.
   Recherche multi-termes (ET) + classement par pertinence ; frappe non bloquante
   via useDeferredValue ; rendu plafonné aux meilleurs résultats. Clic = copie du code. */

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

const MAX_RESULTS = 60;

interface Acte {
  code: string;
  label: string;
  t1: number | null; // tarif secteur 1
  t2: number | null; // tarif hors secteur 1
  ap: 0 | 1; // accord préalable
  regr: string; // regroupement (ADC, ATM…)
  chap: string; // chapitre
  npc: 0 | 1; // non pris en charge
  norm: string; // "code label" normalisé (index de recherche)
}

interface CcamFile {
  version: string;
  chapters: string[];
  acts: [string, string, number | null, number | null, 0 | 1, string, number, 0 | 1][];
}

/** minuscules + suppression des accents/diacritiques (é→e, œ→oe partiel). */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");
}

function eur(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

/* ----- moteur : filtrage + classement par pertinence ----- */
function runSearch(index: Acte[], q: string): { list: Acte[]; total: number } {
  const nq = norm(q).trim();
  if (nq.length < 2) return { list: [], total: 0 };
  const tokens = nq.split(/\s+/).filter(Boolean);
  const first = tokens[0];
  const matches: { a: Acte; score: number }[] = [];

  for (let i = 0; i < index.length; i++) {
    const a = index[i];
    const h = a.norm;
    let ok = true;
    for (let t = 0; t < tokens.length; t++) {
      if (h.indexOf(tokens[t]) === -1) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    // score de pertinence
    let score = 0;
    const codeN = a.code.toLowerCase();
    if (codeN === nq) score += 10000;
    else if (codeN.startsWith(first)) score += 4000;
    else if (codeN.indexOf(first) !== -1) score += 800;
    // libellé : mot commençant par le 1er terme > présence
    const labelN = h.slice(a.code.length + 1);
    if (labelN.startsWith(first)) score += 300;
    else if (new RegExp("\\b" + first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(labelN))
      score += 120;
    // position précoce du 1er terme = léger bonus
    const pos = labelN.indexOf(first);
    if (pos >= 0) score += Math.max(0, 40 - pos);
    // libellé court = acte plus « générique »
    score += Math.max(0, 30 - a.label.length / 6);

    matches.push({ a, score });
  }

  matches.sort((x, y) => y.score - x.score || x.a.label.length - y.a.label.length);
  return { list: matches.slice(0, MAX_RESULTS).map((m) => m.a), total: matches.length };
}

export function CodageCcam() {
  const [index, setIndex] = useState<Acte[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const deferredQ = useDeferredValue(q);
  const inputRef = useRef<HTMLInputElement>(null);

  // chargement + indexation de la base (une seule fois)
  useEffect(() => {
    let alive = true;
    fetch("/ccam.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<CcamFile>;
      })
      .then((data) => {
        if (!alive) return;
        const acts: Acte[] = data.acts.map((a) => {
          const code = a[0];
          const label = a[1];
          return {
            code,
            label,
            t1: a[2],
            t2: a[3],
            ap: a[4],
            regr: a[5],
            chap: data.chapters[a[6]] ?? "",
            npc: a[7],
            norm: norm(code + " " + label),
          };
        });
        setIndex(acts);
      })
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, []);

  const { list, total } = useMemo(
    () => (index ? runSearch(index, deferredQ) : { list: [], total: 0 }),
    [index, deferredQ],
  );

  const showResults = deferredQ.trim().length >= 2;
  const loading = !index && !loadError;

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied((c) => (c === code ? null : c)), 1400);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  return (
    <div className="mx-auto w-full max-w-[760px]">
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
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={loading ? "Chargement de la base CCAM…" : "Rechercher un acte, un code ou un libellé CCAM…"}
          aria-label="Recherche d'un acte CCAM"
          disabled={loading}
          className="cc-search py-4 pl-12 pr-4 text-[15px] text-ink disabled:opacity-70"
        />
      </div>

      {!showResults && !loadError && (
        <p className="mt-4 text-center text-[13px] text-ink-soft">
          {index
            ? `${index.length.toLocaleString("fr-FR")} actes indexés — tapez un code, un mot du libellé ou une région anatomique.`
            : loading
              ? "Préparation de la base…"
              : ""}
        </p>
      )}

      {loadError && (
        <p className="cc-panel mt-4 px-4 py-6 text-center text-sm text-ink-soft">
          La base CCAM n&apos;a pas pu être chargée. Réessayez en rechargeant la page.
        </p>
      )}

      {showResults && index && (
        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
            <span className="text-xs font-semibold text-[#0c2740]">Résultats</span>
            <span className="rounded-full bg-[#e0f2fe] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#0c4a6e]">
              {total.toLocaleString("fr-FR")} acte{total > 1 ? "s" : ""}
              {total > MAX_RESULTS ? ` · ${MAX_RESULTS} affichés` : ""}
            </span>
          </div>

          {list.length === 0 ? (
            <div className="cc-panel px-4 py-8 text-center text-sm text-ink-soft">
              Aucun acte ne correspond à cette recherche.
            </div>
          ) : (
            <ul className="cc-panel divide-y divide-line-soft overflow-hidden">
              {list.map((a) => (
                <li key={a.code}>
                  <button
                    type="button"
                    onClick={() => copy(a.code)}
                    title="Copier le code"
                    className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[#e0f2fe]/50"
                  >
                    <span
                      className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[12px] font-semibold ${
                        copied === a.code
                          ? "bg-[#0c2740] text-white"
                          : "bg-[#e0f2fe] text-[#0c4a6e]"
                      }`}
                    >
                      {copied === a.code ? "✓ copié" : a.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug text-ink">{a.label}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-soft">
                        <span className="font-mono">{a.regr || "—"}</span>
                        <span className="text-ink-soft/50">·</span>
                        <span className="truncate">{a.chap}</span>
                        {a.ap === 1 && (
                          <span className="rounded bg-amber-tint px-1.5 py-0.5 font-semibold text-amber">
                            Accord préalable
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="mt-0.5 shrink-0 text-right">
                      {a.t1 != null ? (
                        <>
                          <span className="block font-mono text-[13px] font-semibold text-[#0c2740]">
                            {eur(a.t1)}
                          </span>
                          {a.t2 != null && a.t2 !== a.t1 && (
                            <span className="block font-mono text-[10.5px] text-ink-soft">
                              hors secteur {eur(a.t2)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="block text-[11px] text-ink-soft/70">
                          {a.npc ? "Non pris en charge" : "n.c."}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 px-1 text-[11px] text-ink-soft/70">
            Tarifs de la CCAM (secteur 1) à titre indicatif — cliquez un acte pour copier son code.
          </p>
        </div>
      )}
    </div>
  );
}

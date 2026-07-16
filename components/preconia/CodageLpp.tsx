"use client";

/* Aide au codage LPP — recherche dans la Liste des Produits et Prestations
   remboursables (dispositifs médicaux). Base public/lpp.json (5 606 codes,
   ~81 Ko gzip) chargée à la demande puis indexée. Recherche multi-termes classée,
   frappe non bloquante, copie du code au clic. Sans tarif (les tarifs font foi
   dans le LPPTOT, pas dans ce fichier descriptif). */

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { FavStar, isFaved, toggleFav, useFavs } from "@/components/preconia/codageFavorites";

const MAX_RESULTS = 60;

interface Prod {
  code: string;
  label: string;
  titre: string;
  norm: string;
}

interface LppFile {
  version: string;
  titres: string[];
  acts: [string, string, number][];
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");
}

function runSearch(index: Prod[], q: string): { list: Prod[]; total: number } {
  const nq = norm(q).trim();
  if (nq.length < 2) return { list: [], total: 0 };
  const tokens = nq.split(/\s+/).filter(Boolean);
  const first = tokens[0];
  const matches: { a: Prod; score: number }[] = [];

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
    let score = 0;
    const codeN = a.code.toLowerCase();
    if (codeN === nq) score += 10000;
    else if (codeN.startsWith(first)) score += 4000;
    const labelN = h.slice(a.code.length + 1);
    if (labelN.startsWith(first)) score += 300;
    else if (new RegExp("\\b" + first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(labelN))
      score += 120;
    const pos = labelN.indexOf(first);
    if (pos >= 0) score += Math.max(0, 40 - pos);
    score += Math.max(0, 30 - a.label.length / 8);
    matches.push({ a, score });
  }
  matches.sort((x, y) => y.score - x.score || x.a.code.localeCompare(y.a.code));
  return { list: matches.slice(0, MAX_RESULTS).map((m) => m.a), total: matches.length };
}

export function CodageLpp() {
  const [index, setIndex] = useState<Prod[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const deferredQ = useDeferredValue(q);
  const favs = useFavs();

  useEffect(() => {
    let alive = true;
    fetch("/lpp.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<LppFile>;
      })
      .then((data) => {
        if (!alive) return;
        const items: Prod[] = data.acts.map((a) => ({
          code: a[0],
          label: a[1],
          titre: a[2] >= 0 ? data.titres[a[2]] : "",
          norm: norm(a[0] + " " + a[1]),
        }));
        setIndex(items);
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
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={loading ? "Chargement de la base LPP…" : "Rechercher un dispositif, un code, une marque…"}
          aria-label="Recherche d'un produit ou prestation LPP"
          disabled={loading}
          className="cc-search py-4 pl-12 pr-4 text-[15px] text-ink disabled:opacity-70"
        />
      </div>

      {!showResults && !loadError && (
        <p className="mt-4 text-center text-[13px] text-ink-soft">
          {index
            ? `${index.length.toLocaleString("fr-FR")} lignes LPP indexées — tapez un code, un dispositif ou une marque.`
            : "Préparation de la base…"}
        </p>
      )}

      {loadError && (
        <p className="cc-panel mt-4 px-4 py-6 text-center text-sm text-ink-soft">
          La base LPP n&apos;a pas pu être chargée. Réessayez en rechargeant la page.
        </p>
      )}

      {showResults && index && (
        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
            <span className="text-xs font-semibold text-[#0c2740]">Résultats</span>
            <span className="rounded-full bg-[#e0f2fe] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#0c4a6e]">
              {total.toLocaleString("fr-FR")} ligne{total > 1 ? "s" : ""}
              {total > MAX_RESULTS ? ` · ${MAX_RESULTS} affichées` : ""}
            </span>
          </div>

          {list.length === 0 ? (
            <div className="cc-panel px-4 py-8 text-center text-sm text-ink-soft">
              Aucun produit ou prestation ne correspond à cette recherche.
            </div>
          ) : (
            <ul className="cc-panel divide-y divide-line-soft overflow-hidden">
              {list.map((a) => (
                <li key={a.code} className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => copy(a.code)}
                    title="Copier le code"
                    className="flex min-w-0 flex-1 items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-[#e0f2fe]/50"
                  >
                    <span
                      className={`mt-0.5 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[12px] font-semibold ${
                        copied === a.code ? "bg-[#0c2740] text-white" : "bg-[#e0f2fe] text-[#0c4a6e]"
                      }`}
                    >
                      {copied === a.code ? "✓ copié" : a.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug text-ink">{a.label}</span>
                      {a.titre && (
                        <span className="mt-0.5 block truncate text-[10.5px] text-ink-soft/70">
                          {a.titre}
                        </span>
                      )}
                    </span>
                  </button>
                  <FavStar
                    on={isFaved(favs, "lpp", a.code)}
                    onToggle={() => toggleFav({ base: "lpp", code: a.code, label: a.label })}
                  />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 px-1 text-[11px] text-ink-soft/70">
            LPP au 09-07-2026 — désignations officielles, sans tarif (le LPPTOT fait foi) ; cliquez
            pour copier le code, l&apos;étoile l&apos;épingle dans vos favoris.
          </p>
        </div>
      )}
    </div>
  );
}

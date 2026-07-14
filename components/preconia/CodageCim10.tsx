"use client";

/* Aide au codage CIM-10 — moteur de recherche des diagnostics (CIM-10-FR 2026 PMSI).
   Base public/cim10.json (11 105 codes, ~141 Ko gzip) chargée à la demande puis indexée
   une fois (chaîne normalisée par code). Recherche multi-termes classée par pertinence,
   frappe non bloquante (useDeferredValue), rendu plafonné. Chaque résultat affiche son
   chapitre et, pour les sous-codes, sa catégorie parente (3 caractères). Clic = copie. */

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { norm, loadAliasMap, expandQuery, type AliasMap } from "@/components/preconia/codageAliases";

const MAX_RESULTS = 60;
const LEVEL_LABEL: Record<number, string> = { 3: "Catégorie", 4: "Sous-catégorie", 5: "Extension" };

interface Dx {
  code: string;
  label: string;
  level: number;
  chap: string;
  parent: string | null; // libellé de la catégorie parente (3 car.) pour les sous-codes
  norm: string;
}

interface Cim10File {
  version: string;
  chapters: string[];
  acts: [string, string, number, number][];
}

function runSearch(index: Dx[], q: string, aliasMap: AliasMap): { list: Dx[]; total: number } {
  const nq0 = norm(q).trim();
  if (nq0.length < 2) return { list: [], total: 0 };
  // requête d'origine + équivalents du thésaurus (union), chacun recherché puis fusionné.
  const queries = expandQuery(nq0, aliasMap);
  const best = new Map<string, { a: Dx; score: number }>();

  queries.forEach((qq, qi) => {
    const tokens = qq.split(/\s+/).filter(Boolean);
    const first = tokens[0];
    const penalty = qi === 0 ? 0 : 1200; // les résultats via synonyme passent après les directs
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
      if (codeN === qq) score += 10000;
      else if (codeN.startsWith(first)) score += 4000;
      else if (codeN.indexOf(first) !== -1) score += 600;
      const labelN = h.slice(a.code.length + 1);
      if (labelN.startsWith(first)) score += 300;
      else if (new RegExp("\\b" + first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(labelN))
        score += 120;
      const pos = labelN.indexOf(first);
      if (pos >= 0) score += Math.max(0, 40 - pos);
      if (a.level === 3) score += 25;
      score += Math.max(0, 30 - a.label.length / 6);
      score -= penalty;

      const prev = best.get(a.code);
      if (!prev || score > prev.score) best.set(a.code, { a, score });
    }
  });

  const arr = [...best.values()].sort((x, y) => y.score - x.score || x.a.code.localeCompare(y.a.code));
  return { list: arr.slice(0, MAX_RESULTS).map((m) => m.a), total: arr.length };
}

export function CodageCim10() {
  const [index, setIndex] = useState<Dx[] | null>(null);
  const [aliasMap, setAliasMap] = useState<AliasMap>(() => new Map());
  const [loadError, setLoadError] = useState(false);
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const deferredQ = useDeferredValue(q);

  useEffect(() => {
    loadAliasMap().then(setAliasMap);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/cim10.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<Cim10File>;
      })
      .then((data) => {
        if (!alive) return;
        const labelOf = new Map<string, string>();
        for (const a of data.acts) labelOf.set(a[0], a[1]);
        const items: Dx[] = data.acts.map((a) => {
          const code = a[0];
          const level = a[2];
          return {
            code,
            label: a[1],
            level,
            chap: data.chapters[a[3]] ?? "",
            parent: level >= 4 ? labelOf.get(code.slice(0, 3)) ?? null : null,
            norm: norm(code + " " + a[1]),
          };
        });
        setIndex(items);
      })
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, []);

  const { list, total } = useMemo(
    () => (index ? runSearch(index, deferredQ, aliasMap) : { list: [], total: 0 }),
    [index, deferredQ, aliasMap],
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
          placeholder={loading ? "Chargement de la base CIM-10…" : "Rechercher un diagnostic, un code ou un mot du libellé…"}
          aria-label="Recherche d'un diagnostic CIM-10"
          disabled={loading}
          className="cc-search py-4 pl-12 pr-4 text-[15px] text-ink disabled:opacity-70"
        />
      </div>

      {!showResults && !loadError && (
        <p className="mt-4 text-center text-[13px] text-ink-soft">
          {index
            ? `${index.length.toLocaleString("fr-FR")} diagnostics indexés — tapez un code (ex. N18) ou un mot du libellé.`
            : "Préparation de la base…"}
        </p>
      )}

      {loadError && (
        <p className="cc-panel mt-4 px-4 py-6 text-center text-sm text-ink-soft">
          La base CIM-10 n&apos;a pas pu être chargée. Réessayez en rechargeant la page.
        </p>
      )}

      {showResults && index && (
        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
            <span className="text-xs font-semibold text-[#0c2740]">Résultats</span>
            <span className="rounded-full bg-[#e0f2fe] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#0c4a6e]">
              {total.toLocaleString("fr-FR")} code{total > 1 ? "s" : ""}
              {total > MAX_RESULTS ? ` · ${MAX_RESULTS} affichés` : ""}
            </span>
          </div>

          {list.length === 0 ? (
            <div className="cc-panel px-4 py-8 text-center text-sm text-ink-soft">
              Aucun diagnostic ne correspond à cette recherche.
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
                      className={`mt-0.5 inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[12px] font-semibold ${
                        copied === a.code ? "bg-[#0c2740] text-white" : "bg-[#e0f2fe] text-[#0c4a6e]"
                      }`}
                    >
                      {copied === a.code ? "✓ copié" : a.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-snug text-ink">{a.label}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-soft">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                          {LEVEL_LABEL[a.level]}
                        </span>
                        {a.parent && (
                          <span className="truncate">
                            ↳ {a.code.slice(0, 3)} {a.parent}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block truncate text-[10.5px] text-ink-soft/70">
                        {a.chap}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 px-1 text-[11px] text-ink-soft/70">
            CIM-10-FR 2026 à usage PMSI — cliquez un diagnostic pour copier son code.
          </p>
        </div>
      )}
    </div>
  );
}

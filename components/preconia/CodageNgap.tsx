"use client";

/* Aide au codage NGAP — recherche plein-texte dans la Nomenclature Générale des
   Actes Professionnels (texte réglementaire). Base public/ngap.json (150 articles,
   ~98 Ko gzip). Chaque article est indexé verbatim (titre + corps) : la recherche
   retourne l'article officiel avec un extrait autour du terme, dépliable en entier.
   Aucune interprétation — le texte officiel fait foi. */

import { useDeferredValue, useEffect, useMemo, useState } from "react";

const MAX_RESULTS = 40;

interface Article {
  num: string;
  title: string;
  text: string;
  part: string;
  norm: string;
}

interface NgapFile {
  version: string;
  parts: string[];
  articles: [string, string, string, number][];
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");
}

/** extrait ~200 caractères autour de la première occurrence du terme. */
function excerpt(text: string, token: string): string {
  const i = norm(text).indexOf(token);
  if (i < 0) return text.slice(0, 200) + (text.length > 200 ? "…" : "");
  const start = Math.max(0, i - 80);
  const end = Math.min(text.length, i + token.length + 140);
  return (start > 0 ? "… " : "") + text.slice(start, end).replace(/\s+/g, " ").trim() + (end < text.length ? " …" : "");
}

function runSearch(index: Article[], q: string): { list: Article[]; total: number; first: string } {
  const nq = norm(q).trim();
  if (nq.length < 2) return { list: [], total: 0, first: "" };
  const tokens = nq.split(/\s+/).filter(Boolean);
  const first = tokens[0];
  const matches: { a: Article; score: number }[] = [];

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
    const titleN = norm(a.num + " " + a.title);
    if (titleN.indexOf(nq) !== -1) score += 500;
    for (const t of tokens) if (titleN.indexOf(t) !== -1) score += 60;
    // nombre d'occurrences du 1er terme dans le corps (pertinence)
    let occ = 0;
    let p = h.indexOf(first);
    while (p !== -1 && occ < 10) {
      occ++;
      p = h.indexOf(first, p + first.length);
    }
    score += occ * 4;
    matches.push({ a, score });
  }
  matches.sort((x, y) => y.score - x.score);
  return { list: matches.slice(0, MAX_RESULTS).map((m) => m.a), total: matches.length, first };
}

export function CodageNgap() {
  const [index, setIndex] = useState<Article[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);

  useEffect(() => {
    let alive = true;
    fetch("/ngap.json")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<NgapFile>;
      })
      .then((data) => {
        if (!alive) return;
        const items: Article[] = data.articles.map((a) => ({
          num: a[0],
          title: a[1],
          text: a[2],
          part: a[3] >= 0 ? data.parts[a[3]] : "",
          norm: norm(a[0] + " " + a[1] + " " + a[2]),
        }));
        setIndex(items);
      })
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, []);

  const { list, total, first } = useMemo(
    () => (index ? runSearch(index, deferredQ) : { list: [], total: 0, first: "" }),
    [index, deferredQ],
  );
  const showResults = deferredQ.trim().length >= 2;
  const loading = !index && !loadError;

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
          placeholder={loading ? "Chargement de la NGAP…" : "Rechercher un acte, une majoration, une règle (ex. « consultation 80 ans »)…"}
          aria-label="Recherche dans la NGAP"
          disabled={loading}
          className="cc-search py-4 pl-12 pr-4 text-[15px] text-ink disabled:opacity-70"
        />
      </div>

      {!showResults && !loadError && (
        <p className="mt-4 text-center text-[13px] text-ink-soft">
          {index
            ? `${index.length.toLocaleString("fr-FR")} articles indexés — cherchez une règle, un acte ou un code (GL1, CDE…) ; le texte officiel s'affiche.`
            : "Préparation de la base…"}
        </p>
      )}

      {loadError && (
        <p className="cc-panel mt-4 px-4 py-6 text-center text-sm text-ink-soft">
          La base NGAP n&apos;a pas pu être chargée. Réessayez en rechargeant la page.
        </p>
      )}

      {showResults && index && (
        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
            <span className="text-xs font-semibold text-[#0c2740]">Articles</span>
            <span className="rounded-full bg-[#e0f2fe] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#0c4a6e]">
              {total.toLocaleString("fr-FR")} article{total > 1 ? "s" : ""}
              {total > MAX_RESULTS ? ` · ${MAX_RESULTS} affichés` : ""}
            </span>
          </div>

          {list.length === 0 ? (
            <div className="cc-panel px-4 py-8 text-center text-sm text-ink-soft">
              Aucun article ne correspond à cette recherche.
            </div>
          ) : (
            <div className="space-y-2.5">
              {list.map((a) => (
                <details key={a.num + a.title} className="cc-panel group overflow-hidden">
                  <summary className="cursor-pointer list-none px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="shrink-0 rounded bg-[#e0f2fe] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#0c4a6e]">
                        {a.num}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold text-[#0c2740]">
                        {a.title || "(sans intitulé)"}
                      </span>
                      <span className="shrink-0 text-[11px] text-[#0ea5e9] transition-transform group-open:rotate-90">
                        ▸
                      </span>
                    </span>
                    <span className="mt-1.5 block text-[12.5px] leading-relaxed text-ink-soft">
                      {excerpt(a.text, first)}
                    </span>
                  </summary>
                  <div className="border-t border-line-soft px-4 py-3">
                    {a.part && (
                      <div className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-[#0ea5e9]">
                        {a.part}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
                      {a.text || "Article sans texte (abrogé ou renvoi)."}
                    </p>
                  </div>
                </details>
              ))}
            </div>
          )}
          <p className="mt-3 px-1 text-[11px] text-ink-soft/70">
            NGAP en vigueur du 21/06/2026 — texte officiel intégral, non interprété.
          </p>
        </div>
      )}
    </div>
  );
}

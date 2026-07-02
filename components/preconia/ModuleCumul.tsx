"use client";

/* Module d'évaluation de cumul VPH (sous le moteur de recherche LPPR).
   L'utilisateur choisit ce qu'il POSSÈDE déjà et ce qu'il SOUHAITE acquérir (acronyme LPPR +
   mode ACHAT/LLD) ; l'encart indique « Cumul autorisé » (vert) ou « Cumul interdit » (rouge).
   Règles : data/cumul.json (incompatibilités par acronyme) → isCumulAllowed (règle pure). */

import { useEffect, useState } from "react";
import { cumulCategories, cumulIncompatible, cumulMeta } from "@/lib/data";
import { isCumulAllowed } from "@/lib/rules";

type Mode = "ACHAT" | "LLD";
const MODES: Mode[] = ["ACHAT", "LLD"];

function frDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const modeChip = (on: boolean) =>
  `rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
    on
      ? "border-petrol bg-petrol text-white"
      : "border-line bg-card text-ink-soft hover:border-petrol hover:text-petrol-deep"
  }`;

function CategoryPicker({
  legend,
  code,
  setCode,
  mode,
  setMode,
  selectId,
}: {
  legend: string;
  code: string | null;
  setCode: (v: string | null) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  selectId: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-paper/40 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={selectId} className="text-sm font-semibold text-petrol-deep">
          {legend}
        </label>
        <div className="flex gap-1" role="group" aria-label={`Mode — ${legend}`}>
          {MODES.map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={modeChip(mode === m)}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <select
        id={selectId}
        value={code ?? ""}
        onChange={(e) => setCode(e.target.value || null)}
        className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-petrol"
      >
        <option value="">— Choisir une catégorie de VPH —</option>
        {cumulCategories.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} — {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ModuleCumul({
  embedded = false,
  idPrefix = "cumul",
  onVerdict,
}: {
  /** Variante embarquée (étape cumul du walker) : pas de carte autonome. */
  embedded?: boolean;
  /** Préfixe des ids DOM (unicité quand plusieurs instances coexistent). */
  idPrefix?: string;
  /** Remonte le verdict à chaque changement : true (autorisé) / false (interdit) / null. */
  onVerdict?: (allowed: boolean | null) => void;
}) {
  const [ownedCode, setOwnedCode] = useState<string | null>(null);
  const [ownedMode, setOwnedMode] = useState<Mode>("ACHAT");
  const [wantCode, setWantCode] = useState<string | null>(null);
  const [wantMode, setWantMode] = useState<Mode>("ACHAT");

  const allowed = isCumulAllowed(ownedCode, wantCode, cumulIncompatible);

  // remonte le verdict au parent (walker) à chaque changement.
  useEffect(() => {
    onVerdict?.(allowed);
  }, [allowed, onVerdict]);

  const inner = (
    <>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">Évaluation de cumul VPH</h2>
          <span className="text-[11px] font-semibold text-red-600">
            Règles à jour le {frDate(cumulMeta.lastUpdated)}
          </span>
        </div>
        <p className="mb-3 mt-1 text-xs text-ink-soft">
          Deux VPH sont-ils cumulables au titre de la LPPR ? Choisissez ce qui est déjà possédé et ce
          qui est souhaité.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <CategoryPicker
            legend="Je possède déjà"
            code={ownedCode}
            setCode={setOwnedCode}
            mode={ownedMode}
            setMode={setOwnedMode}
            selectId={`${idPrefix}-owned`}
          />
          <CategoryPicker
            legend="Je souhaite acquérir"
            code={wantCode}
            setCode={setWantCode}
            mode={wantMode}
            setMode={setWantMode}
            selectId={`${idPrefix}-want`}
          />
        </div>

        <div className="mt-3">
          {allowed === null ? (
            <p className="rounded-xl border border-dashed border-line px-3 py-3 text-center text-sm text-ink-soft">
              Sélectionnez une catégorie dans chaque volet pour évaluer le cumul.
            </p>
          ) : allowed ? (
            <div
              role="status"
              className="rounded-xl border-2 border-green-500 bg-green-50 px-4 py-3 text-center"
            >
              <p className="text-base font-semibold text-green-700">Cumul autorisé</p>
              <p className="mt-0.5 text-xs text-green-800/80">
                {ownedCode} ({ownedMode}) + {wantCode} ({wantMode}) — catégories cumulables.
              </p>
            </div>
          ) : (
            <div
              role="status"
              className="rounded-xl border-2 border-red-500 bg-red-50 px-4 py-3 text-center"
            >
              <p className="text-base font-semibold text-red-700">Cumul interdit</p>
              <p className="mt-0.5 text-xs text-red-700/80">
                {ownedCode} ({ownedMode}) + {wantCode} ({wantMode}) — catégories non cumulables.
              </p>
            </div>
          )}
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-ink-soft/90">
          Aide à la décision non opposable. {cumulMeta.source}
        </p>
    </>
  );

  // variante embarquée (étape cumul du walker) : pas de carte autonome.
  if (embedded) return <div className="rounded-xl border border-line bg-paper/30 p-4">{inner}</div>;

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <div className="px-6 pb-5 pt-5">{inner}</div>
    </section>
  );
}

"use client";

/* Module d'évaluation de cumul VPH (sous le moteur de recherche LPPR).
   L'utilisateur choisit ce qu'il POSSÈDE déjà et ce qu'il SOUHAITE acquérir (acronyme LPPR +
   mode ACHAT/LLD/LCD) ; l'encart indique « Cumul autorisé » (vert), « Cumul interdit » (rouge)
   ou « Dérogation possible » (ambre — LCD d'un FRE malgré un manuel possédé, Titre IV 4.1).
   Règles : data/cumul.json (incompatibilités par acronyme) → cumulVerdict (règle pure). */

import { useEffect, useState } from "react";
import { cumulCategories, cumulIncompatible, cumulMeta } from "@/lib/data";
import { cumulVerdict, type CumulMode, type CumulVerdict } from "@/lib/rules";

type Mode = CumulMode;
const MODES: Mode[] = ["ACHAT", "LLD", "LCD"];

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
  /** Remonte le verdict à chaque changement : « autorise » / « interdit » / « derogation » / null. */
  onVerdict?: (verdict: CumulVerdict | null) => void;
}) {
  const [ownedCode, setOwnedCode] = useState<string | null>(null);
  const [ownedMode, setOwnedMode] = useState<Mode>("ACHAT");
  const [wantCode, setWantCode] = useState<string | null>(null);
  const [wantMode, setWantMode] = useState<Mode>("ACHAT");

  const verdict = cumulVerdict(ownedCode, ownedMode, wantCode, wantMode, cumulIncompatible);

  // remonte le verdict au parent (walker) à chaque changement.
  useEffect(() => {
    onVerdict?.(verdict);
  }, [verdict, onVerdict]);

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
          {verdict === null ? (
            <p className="rounded-xl border border-dashed border-line px-3 py-3 text-center text-sm text-ink-soft">
              Sélectionnez une catégorie dans chaque volet pour évaluer le cumul.
            </p>
          ) : verdict === "autorise" ? (
            <div
              role="status"
              className="rounded-xl border-2 border-green-500 bg-green-50 px-4 py-3 text-center"
            >
              <p className="text-base font-semibold text-green-700">Cumul autorisé</p>
              <p className="mt-0.5 text-xs text-green-800/80">
                {ownedCode} ({ownedMode}) + {wantCode} ({wantMode}) — catégories cumulables.
              </p>
            </div>
          ) : verdict === "derogation" ? (
            <div
              role="status"
              className="rounded-xl border-2 border-amber-500 bg-amber-50 px-4 py-3 text-center"
            >
              <p className="text-base font-semibold text-amber-700">Dérogation possible</p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-800/90">
                {ownedCode} ({ownedMode}) + {wantCode} ({wantMode}) : le cumul est en principe
                interdit en LCD, mais une séquence de LCD d&apos;un FRE est permise par dérogation
                malgré un {ownedCode} possédé <b>sans option d&apos;assistance électrique à la
                propulsion</b>, en cas d&apos;épisode de soin avec impossibilité physique
                transitoire de propulser, objectivé par une nouvelle prescription (arrêté du
                06/02/2025, Titre IV 4.1).
              </p>
            </div>
          ) : (
            <div
              role="status"
              className="rounded-xl border-2 border-red-500 bg-red-50 px-4 py-3 text-center"
            >
              <p className="text-base font-semibold text-red-700">Cumul interdit</p>
              <p className="mt-0.5 text-xs text-red-700/80">
                {ownedCode} ({ownedMode}) + {wantCode} ({wantMode}) —{" "}
                {ownedMode === "LCD" || wantMode === "LCD"
                  ? "une prise en charge en location courte durée n'est cumulable avec aucun autre VPH loué ou vendu (Titre IV 4.1)."
                  : "catégories non cumulables."}
              </p>
            </div>
          )}
        </div>

        {(ownedCode === "SCO" || wantCode === "SCO") && verdict === "autorise" && (
          <p className="mt-2 rounded-lg border border-amber/30 bg-amber-tint px-3 py-2 text-[11.5px] leading-relaxed text-[#5c3208]">
            Rappel (Titre IV 4.2) : en cas de pathologie évolutive, la prescription d&apos;un
            scooter modulaire doit préciser qu&apos;un recours à un fauteuil roulant électrique
            n&apos;est pas envisagé dans l&apos;année qui suit.
          </p>
        )}

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

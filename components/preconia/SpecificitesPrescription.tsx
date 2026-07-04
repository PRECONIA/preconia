"use client";

/* Spécificités de prescription par VPH et par modalité (achat / LCD / LLD).
   Répond à « qui prescrit, qui évalue, faut-il une fiche de préconisation, une DAP,
   une évaluation environnementale ? » selon la catégorie et le mode de prise en charge.
   Données : devices.json (presc/eval/fiche/dap/modes) ; règles pures prescriberFor +
   prescriptionExtras (lib/rules.ts), sourcées sur l'arrêté du 06/02/2025. */

import { useMemo, useState } from "react";
import { devices, evaluators, modes as modeLabels, prescribers } from "@/lib/data";
import { prescriberFor, prescriptionExtras, type Modality } from "@/lib/rules";
import type { Mode } from "@/lib/types";

/* Catégories dans l'ordre de la nomenclature. */
const CATS = devices;

/** Modalité → contexte (pec) de prescriberFor. */
const PEC: Record<Modality, "achat" | "lcd" | "lld"> = { ACHAT: "achat", LCD: "lcd", LLD: "lld" };

const ENV_LABEL: Record<"non" | "besoins" | "renforcee", string> = {
  non: "Non requise",
  besoins:
    "Requise — volet « facteurs environnementaux » de l'évaluation des besoins (parmi les 4 critères, arrêté 3.1.4.2.1)",
  renforcee:
    "Requise et renforcée — compatibilité de l'environnement, possibilité de stockage et de recharge, certificat d'aptitude à la conduite (arrêté 3.1.5 / 9.5.b)",
};

function Row({ label, children, warn }: { label: string; children: React.ReactNode; warn?: boolean }) {
  return (
    <div className="border-b border-line-soft px-4 py-3 last:border-0">
      <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className={`mt-1 text-sm leading-relaxed ${warn ? "font-semibold text-amber" : "text-ink"}`}>
        {children}
      </dd>
    </div>
  );
}

export function SpecificitesPrescription() {
  const [code, setCode] = useState<string | null>(null);
  const device = useMemo(() => CATS.find((d) => d.code === code) ?? null, [code]);
  const applicable = (device?.modes ?? []) as Mode[];
  const [modality, setModality] = useState<Modality>("ACHAT");
  // modalité effective : bornée aux modes de la catégorie choisie.
  const mode: Modality = applicable.includes(modality as Mode) ? modality : (applicable[0] as Modality);

  const specs = device ? prescriptionExtras(device, mode) : null;
  const presc = device ? prescriberFor(device, PEC[mode], "premiere", prescribers) : "";

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      {/* bandeau de titre vert : distingue les modules outils du walker */}
      <div className="bg-petrol px-6 py-3">
        <h2 className="text-base font-semibold text-white">Spécificités de prescription par VPH</h2>
      </div>
      <div className="px-6 pb-5 pt-4">
        <p className="mb-3 text-xs text-ink-soft">
          Choisissez une catégorie de VPH et une modalité de prise en charge pour connaître le
          prescripteur habilité, l&apos;évaluation requise, la fiche de préconisation, la DAP et
          l&apos;évaluation environnementale (arrêté du 6 février 2025).
        </p>

        <label htmlFor="spec-cat" className="mb-1.5 block text-sm font-semibold text-petrol-deep">
          Catégorie de VPH
        </label>
        <select
          id="spec-cat"
          value={code ?? ""}
          onChange={(e) => setCode(e.target.value || null)}
          className="w-full rounded-lg border-2 border-orange-300 bg-card px-3 py-2.5 text-sm outline-none transition-colors focus:border-orange-500"
        >
          <option value="">— Choisir une catégorie —</option>
          {CATS.map((d) => (
            <option key={d.code} value={d.code}>
              {d.code} — {d.name}
            </option>
          ))}
        </select>

        {device && (
          <>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Modalité de prise en charge">
              {(["ACHAT", "LCD", "LLD"] as Modality[]).map((m) => {
                const ok = applicable.includes(m as Mode);
                const on = ok && mode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={!ok}
                    onClick={() => setModality(m)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      on
                        ? "border-petrol bg-petrol text-white"
                        : ok
                          ? "border-line bg-card text-ink-soft hover:border-petrol hover:text-petrol-deep"
                          : "cursor-not-allowed border-dashed border-line bg-paper/60 text-ink-soft/40"
                    }`}
                    title={ok ? undefined : "Cette catégorie n'est pas éligible à ce mode"}
                  >
                    {modeLabels[m]?.label ?? m}
                  </button>
                );
              })}
            </div>

            {specs && (
              <dl className="mt-3 overflow-hidden rounded-xl border border-line-soft">
                <Row label="Prescripteur (qui signe l'ordonnance)">{presc}</Row>
                <Row label="Évaluation des besoins & fiche de préconisation">
                  {specs.evaluateur
                    ? evaluators[specs.evaluateur]
                    : "Non requise pour cette modalité (en location courte durée, le parcours est allégé : essai comparatif sans fiche, arrêté 9.7)."}
                </Row>
                <Row label="Fiche de préconisation">
                  {specs.fichePreconisation
                    ? "Requise (modèle opposable publié par le ministère de la santé)"
                    : "Non requise"}
                </Row>
                <Row label="Demande d'accord préalable (DAP)" warn={specs.dap}>
                  {specs.dap ? "Requise" : "Non requise"}
                </Row>
                <Row label="Évaluation environnementale" warn={specs.envLevel === "renforcee"}>
                  {ENV_LABEL[specs.envLevel]}
                </Row>
              </dl>
            )}

            <p className="mt-3 text-[11px] leading-relaxed text-ink-soft/80">
              Rappel : au renouvellement à l&apos;identique, la prescription peut être établie par
              un médecin généraliste ou un ergothérapeute (arrêté 3.1.6). Aide à la décision non
              opposable — seuls les textes officiels font foi.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

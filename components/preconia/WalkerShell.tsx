"use client";

/* Shell minimal du walker (session « socle »).
   But : prouver que la machine à états, la navigation et les invariants fonctionnent
   de bout en bout. Le rendu riche par étape (QuestionStep, BesoinsForm, AdjonctionsPanel,
   PapPanel, ResultCard, synthèse copiable) est volontairement reporté à la session UI. */

import { useState } from "react";
import {
  adjBrandMap,
  adjGroups,
  besoins,
  classes,
  deviceModelsByType,
  deviceIndicationsByCode,
  deviceLppByType,
  devices,
  meta,
  modes as modeLabels,
  papForfaits,
  papRegions,
  prescribers,
} from "@/lib/data";
import {
  adaptedCode,
  brandsForBases,
  deviceAllowedForDuree,
  deviceBrandsForToken,
  deviceLpp,
  deviceModelGeneric,
  deviceModelsForBrand,
  hasBrandVariant,
  hasDeviceBrandVariant,
  modesForDuree,
} from "@/lib/rules";
import { eur } from "@/lib/format";
import { RechercheLpp } from "@/components/preconia/RechercheLpp";
import { Logo } from "@/components/preconia/Logo";
import type { Adjonction, BesoinField, Device } from "@/lib/types";
import { useWalker } from "@/lib/walker/WalkerProvider";
import {
  facets,
  selectCompatAdj,
  selectCosts,
  selectDevice,
  selectForfaits,
  selectRoute,
  selectSelectedAdj,
} from "@/lib/walker/selectors";
import type { Answers, Stage } from "@/lib/walker/types";

const btn =
  "block w-full text-left rounded-lg border border-line bg-card px-4 py-3 mb-2 transition-colors hover:border-petrol hover:bg-white";
const btnOn = "border-petrol bg-petrol-tint";
const link = "text-ink-soft hover:text-petrol-deep text-sm";
const navBtn =
  "inline-flex items-center gap-1.5 rounded-lg border-2 border-petrol bg-petrol-tint/50 px-4 py-2 text-sm font-semibold text-petrol-deep hover:bg-petrol-tint";
const primary =
  "inline-flex items-center gap-2 rounded-lg bg-petrol px-5 py-3 font-semibold text-white hover:bg-petrol-deep";
const finish =
  "inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white hover:bg-orange-700";

function priceLabel(a: Adjonction): string {
  if (a.devis) return "Sur devis";
  if (a.tbd) return "Tarif à préciser";
  return eur(a.price ?? 0);
}

// Propulsion manuelle / podale : fauteuils manuels + cycle (propulsion podale).
const MAN_FAMILIES = ["Manuel non modulaire", "Manuel modulaire", "Cycle"];

export function WalkerShell() {
  const { state, dispatch } = useWalker();
  const { stage, answers } = state;
  const device = selectDevice(state);

  const go = (s: Stage) => dispatch({ type: "GO", stage: s });
  const setAnswer = <K extends keyof Answers>(field: K, value: Answers[K]) =>
    dispatch({ type: "SET_ANSWER", field, value });

  const compatAdj = selectCompatAdj(state);
  const selectedAdj = selectSelectedAdj(state);
  const forfaits = selectForfaits(state);
  const costs = selectCosts(state);
  const route = selectRoute(state);

  // Marque du fauteuil → pilote le code LPP du fauteuil ET adapte les adjonctions / PAP.
  const brand = answers.vehicleBrand;
  const brandBases = [
    ...compatAdj.map((a) => a.code),
    ...(device?.modular ? [papForfaits.A.code, papForfaits.B.code] : []),
  ];
  // Union : marques de fauteuil (catalogue CERAH, pour le type/classe) + marques d'adjonctions/PAP.
  const deviceBrands = device ? deviceBrandsForToken(device, answers.classe, deviceModelsByType) : [];
  const availableBrands = Array.from(
    new Set([...deviceBrands, ...brandsForBases(brandBases, adjBrandMap)]),
  ).sort((a, b) => a.localeCompare(b));

  // Modèles commerciaux proposés pour la marque choisie (volet « modèle »).
  const brandModels = device
    ? deviceModelsForBrand(device, answers.classe, brand, deviceModelsByType)
    : [];
  const model = answers.vehicleModel;

  // Code LPP + tarif du fauteuil : code du modèle si dispo, sinon code marque, sinon code mère.
  const devLpp = device
    ? deviceLpp(device, answers.classe, deviceLppByType, deviceModelsByType, brand, model)
    : null;
  const devBrandHit = device
    ? hasDeviceBrandVariant(device, answers.classe, brand, deviceModelsByType)
    : false;
  // modèle choisi sans code propre → on affiche le code générique (mère).
  const devModelGeneric = device
    ? deviceModelGeneric(device, answers.classe, brand, model, deviceModelsByType)
    : false;

  // Forfait de livraison & mise en service — option cochable sur la fiche finale.
  const [addLivraison, setAddLivraison] = useState(false);

  // Tous les codes LPP de la fiche finale : fauteuil + forfaits PAP + adjonctions (adaptés marque)
  // + le forfait de livraison s'il est coché.
  const lpprCodes = [
    ...(devLpp && device
      ? [
          {
            code: devLpp.code,
            label: model ? `${device.name} — ${model}${brand ? ` (${brand})` : ""}` : device.name,
          },
        ]
      : []),
    ...forfaits.map((f) => ({
      code: adaptedCode(papForfaits[f].code, brand, adjBrandMap),
      label: papForfaits[f].label,
    })),
    ...selectedAdj.map((a) => ({
      code: adaptedCode(a.code, brand, adjBrandMap),
      label: a.name,
    })),
    ...(addLivraison ? [{ code: meta.livraison.code, label: meta.livraison.label }] : []),
  ];
  const [copied, setCopied] = useState(false);
  const copyToClipboard = async (text: string, mark: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      mark(true);
      window.setTimeout(() => mark(false), 2000);
    } catch {
      /* clipboard indisponible */
    }
  };
  const copyCodes = () =>
    copyToClipboard(lpprCodes.map((c) => `${c.code}\t${c.label}`).join("\n"), setCopied);
  const [copiedLiv, setCopiedLiv] = useState(false);
  const copyLivraison = () =>
    copyToClipboard(`${meta.livraison.code}\t${meta.livraison.label}`, setCopiedLiv);
  // Encart « définition + spécificités techniques » du forfait PAP A ou B.
  const [papInfo, setPapInfo] = useState<"A" | "B" | null>(null);

  return (
    <div className="relative z-10 mx-auto max-w-[790px] px-5 pb-16 pt-8">
      <header>
        <div className="pc-wordmark-rise flex items-center gap-3.5">
          <Logo className="h-12 w-12 shrink-0 drop-shadow-sm sm:h-14 sm:w-14" />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-petrol">
              Aide à la préconisation VPH · Médecine physique &amp; réadaptation
            </div>
            <div className="text-[30px] font-bold leading-none tracking-tight">
              PRECON<span className="pc-accent-breathe inline-block text-petrol">IA</span>
            </div>
          </div>
        </div>
        <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-ink-soft">
          Du profil fonctionnel au dispositif, à sa classe, ses adjonctions facturables (codes LPPR)
          et son positionnement — d&apos;après la nomenclature VPH 2025 et les fiches 2026.
        </p>
      </header>

      {stage !== "home" && (
        <div className="my-5 flex flex-wrap items-center gap-2">
          {facets(answers).map((f) => (
            <span
              key={f.k}
              className={`rounded-full border px-3 py-1 text-xs ${
                f.v ? "border-line bg-card text-ink-soft" : "border-dashed border-line text-ink-soft/60"
              }`}
            >
              {f.k}
              {f.v ? " : " : ""}
              {f.v && <b className="text-ink">{f.v}</b>}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        <div className="h-[3px] bg-gradient-to-r from-petrol to-petrol-deep" />
        <div className="px-6 py-6">
          {/* ---------------- HOME ---------------- */}
          {stage === "home" && (
            <>
              <h1 className="mb-1 text-xl font-semibold">
                Préconisation d&apos;un véhicule pour personne handicapée
              </h1>
              <p className="mb-4 text-sm text-ink-soft">
                Un parcours guidé mène du profil fonctionnel à la catégorie LPPR, sa classe, son
                circuit de prise en charge et ses adjonctions.
              </p>
              <button className={primary} onClick={() => go("age")}>
                Commencer l&apos;évaluation →
              </button>
            </>
          )}

          {/* ---------------- AGE ---------------- */}
          {stage === "age" && (
            <Step title="Âge du patient" hint="Conditionne l'accès aux poussettes (moins de 18 ans).">
              <button
                className={`${btn} ${answers.age === "adulte" ? btnOn : ""}`}
                onClick={() => {
                  setAnswer("age", "adulte");
                  go("duree");
                }}
              >
                Adulte (18 ans et plus)
              </button>
              <button
                className={`${btn} ${answers.age === "enfant" ? btnOn : ""}`}
                onClick={() => {
                  setAnswer("age", "enfant");
                  go("duree");
                }}
              >
                Enfant (moins de 18 ans)
              </button>
              <Nav dispatch={dispatch} />
            </Step>
          )}

          {/* ---------------- DUREE ---------------- */}
          {stage === "duree" && (
            <Step title="Durée prévisible du besoin" hint="Détermine le mode de prise en charge.">
              <button
                className={`${btn} ${answers.duree === "temp" ? btnOn : ""}`}
                onClick={() => {
                  setAnswer("duree", "temp");
                  go("mob");
                }}
              >
                Temporaire — 3 mois ou moins · location courte durée (LCD)
              </button>
              <button
                className={`${btn} ${answers.duree === "durable" ? btnOn : ""}`}
                onClick={() => {
                  setAnswer("duree", "durable");
                  go("mob");
                }}
              >
                Durable — 6 mois ou plus · achat ou location longue durée (ACHAT / LLD)
              </button>
              <Nav dispatch={dispatch} />
            </Step>
          )}

          {/* ---------------- MOBILITE ---------------- */}
          {stage === "mob" && (
            <Step title="Capacité de propulsion" hint="Oriente vers la famille de dispositif.">
              <button
                className={`${btn} ${answers.mob === "manuel" ? btnOn : ""}`}
                onClick={() => {
                  setAnswer("mob", "manuel");
                  go("cfg_man");
                }}
              >
                Propulsion manuelle / podale
              </button>
              <button
                className={`${btn} ${answers.mob === "elec" ? btnOn : ""}`}
                onClick={() => {
                  setAnswer("mob", "elec");
                  go("cfg_elec");
                }}
              >
                Propulsion électrique
              </button>
              <Nav dispatch={dispatch} />
            </Step>
          )}

          {/* ---------------- CONFIG (man / elec / pou) ---------------- */}
          {stage === "cfg_man" && (
            <DeviceChoice
              title="Configuration manuelle / podale"
              list={[
                ...devices.filter((d) => MAN_FAMILIES.includes(d.family)),
                // poussettes (POU_S, POU_MRE) réservées aux enfants
                ...(answers.age === "enfant"
                  ? devices.filter((d) => d.family === "Poussette")
                  : []),
              ].filter((d) => deviceAllowedForDuree(d, answers.duree))}
              duree={answers.duree}
              dispatch={dispatch}
            />
          )}
          {stage === "cfg_elec" && (
            <DeviceChoice
              title="Configuration électrique"
              list={devices
                .filter((d) => d.family === "Électrique")
                .filter((d) => deviceAllowedForDuree(d, answers.duree))}
              duree={answers.duree}
              dispatch={dispatch}
            />
          )}

          {/* ---------------- BESOINS ---------------- */}
          {stage === "besoins" && device && (
            <Step
              title="Besoins & environnement"
              hint="D'après la fiche d'évaluation des besoins 2026."
            >
              {device.electric && (
                <div className="mb-4">
                  <div className="mb-2 text-sm font-semibold">Classe du fauteuil électrique</div>
                  {classes.map((c) => (
                    <button
                      key={c.value}
                      className={`${btn} ${answers.classe === c.value ? btnOn : ""}`}
                      onClick={() => setAnswer("classe", c.value)}
                    >
                      <b>{c.label}</b>
                      <span className="block text-xs text-ink-soft">{c.desc}</span>
                    </button>
                  ))}
                  {route && (
                    <Flag>
                      <b>Soumis au code de la route.</b> Ceinture, éclairage et bandes réfléchissantes
                      sont obligatoires, inclus et non facturables en sus.
                    </Flag>
                  )}
                </div>
              )}

              {besoins.fields
                .filter((f) => f.id !== "classe")
                .map((f) => (
                  <BesoinFieldRow key={f.id} field={f} answers={answers} onSet={setAnswer} />
                ))}

              {answers.aptitude === "non" && (
                <Flag>
                  <b>Conduite par tierce personne.</b> Inaptitude à la conduite (sensorielle, motrice
                  ou cognitive) → commande pour l&apos;accompagnant (FREP/FREV, exception nomenclature).
                </Flag>
              )}

              <Nav dispatch={dispatch} next={() => go("adj")} nextLabel="Suivant →" />
            </Step>
          )}

          {/* ---------------- ADJONCTIONS + PAP ---------------- */}
          {stage === "adj" && device && (
            <Step
              title="Adjonctions & positionnement"
              hint={`Sélection compatible avec le ${device.code}. Codes LPPR et tarifs TTC indicatifs.`}
            >
              {devLpp && (
                <div className="mb-5 rounded-xl border-2 border-orange-400 bg-orange-100/60 p-4">
                  <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-orange-800">
                    Fauteuil sélectionné · code LPP
                    {devBrandHit ? (
                      <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        {brand}
                      </span>
                    ) : (
                      brand && (
                        <span className="rounded bg-orange-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                          générique
                        </span>
                      )
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded bg-orange-200/70 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-orange-800">
                        {devLpp.code}
                      </span>
                      <span className="truncate text-sm text-ink">{model ?? device.name}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-mono text-sm font-semibold text-orange-800">
                        {devLpp.tarif != null ? eur(devLpp.tarif) : "tarif n.c."}
                      </span>
                      <span className="block text-[10px] font-normal text-orange-700/80">
                        à titre indicatif
                      </span>
                    </span>
                  </div>
                  {devModelGeneric && (
                    <p className="mt-2 rounded-md bg-orange-200/60 px-2 py-1.5 text-[11px] text-orange-800">
                      Pas de code produit pour ce modèle — code générique (mère) affiché.
                    </p>
                  )}
                </div>
              )}

              {availableBrands.length > 0 && (
                <div className="mb-5 rounded-xl border-2 border-petrol bg-petrol-tint/50 p-4">
                  <label htmlFor="vehicleBrand" className="mb-1.5 block text-sm font-semibold text-petrol-deep">
                    Marque du fauteuil
                    <span className="ml-1.5 font-normal text-petrol-deep/70">· adapte les codes LPP</span>
                  </label>
                  <select
                    id="vehicleBrand"
                    value={brand ?? ""}
                    onChange={(e) => setAnswer("vehicleBrand", e.target.value || null)}
                    className="w-full rounded-lg border-2 border-petrol bg-card px-3 py-2.5 text-sm font-medium text-petrol-deep outline-none focus:ring-2 focus:ring-petrol/40"
                  >
                    <option value="">Générique (code mère)</option>
                    {availableBrands.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>

                  {brandModels.length > 0 && (
                    <div className="mt-3 border-t border-petrol/20 pt-3">
                      <label
                        htmlFor="vehicleModel"
                        className="mb-1.5 block text-sm font-semibold text-petrol-deep"
                      >
                        Modèle
                        <span className="ml-1.5 font-normal text-petrol-deep/70">
                          · {brandModels.length} modèle{brandModels.length > 1 ? "s" : ""} · CERAH
                        </span>
                      </label>
                      <select
                        id="vehicleModel"
                        value={model ?? ""}
                        onChange={(e) => setAnswer("vehicleModel", e.target.value || null)}
                        className="w-full rounded-lg border-2 border-petrol bg-card px-3 py-2.5 text-sm font-medium text-petrol-deep outline-none focus:ring-2 focus:ring-petrol/40"
                      >
                        <option value="">Tous modèles (code marque)</option>
                        {brandModels.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <h3 className="mb-3 mt-1 text-lg font-semibold tracking-tight">Adjonctions facturables</h3>

              {compatAdj.length === 0 && (
                <p className="rounded-lg bg-petrol-tint/40 px-3 py-2 text-sm text-ink-soft">
                  Aucune adjonction facturable répertoriée pour ce dispositif.
                </p>
              )}

              {(["aap", "conduite", "option"] as const)
                .map((g) => ({ g, items: compatAdj.filter((a) => a.group === g) }))
                .filter(({ items }) => items.length > 0)
                .map(({ g, items }) => (
                  <div key={g} className="mb-3">
                    <div className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                      {adjGroups[g]}
                    </div>
                    {items.map((item) => (
                      <button
                        key={item.code}
                        className={`${btn} flex items-start justify-between gap-3 ${
                          state.adj[item.code] ? btnOn : ""
                        }`}
                        onClick={() => dispatch({ type: "TOGGLE_ADJ", item })}
                      >
                        <span>
                          <b className="block">{item.name}</b>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="rounded bg-petrol-tint px-1.5 py-0.5 font-mono text-[11px] font-semibold text-petrol-deep">
                              {adaptedCode(item.code, brand, adjBrandMap)}
                            </span>
                            {brand && !hasBrandVariant(item.code, brand, adjBrandMap) && (
                              <span className="text-[10px] text-ink-soft">générique</span>
                            )}
                          </span>
                        </span>
                        <span
                          className={`whitespace-nowrap font-mono text-sm font-semibold ${
                            item.devis || item.tbd ? "text-amber" : "text-petrol-deep"
                          }`}
                        >
                          {priceLabel(item)}
                        </span>
                      </button>
                    ))}
                  </div>
                ))}

              {/* PAP */}
              <div className="mb-3 mt-6 flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold tracking-tight">
                  Produits d&apos;aide au positionnement
                </h3>
                {(["A", "B"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setPapInfo(papInfo === f ? null : f)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                      papInfo === f
                        ? "border-petrol bg-petrol text-white"
                        : "border-petrol/40 text-petrol-deep hover:bg-petrol-tint"
                    }`}
                  >
                    ⓘ PAP {f}
                  </button>
                ))}
              </div>
              {papInfo && (
                <div className="mb-3 rounded-xl border-2 border-petrol bg-petrol-tint/40 p-4 text-sm leading-relaxed">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <b className="text-petrol-deep">{papForfaits[papInfo].label}</b>
                    <button
                      type="button"
                      onClick={() => setPapInfo(null)}
                      className="shrink-0 text-xs text-ink-soft hover:text-petrol-deep"
                    >
                      Fermer ✕
                    </button>
                  </div>
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-petrol">
                    Définition
                  </div>
                  <ul className="mb-3 list-disc space-y-1 pl-4 text-ink">
                    {papForfaits[papInfo].definition.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                  <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-petrol">
                    Spécificités techniques minimales
                  </div>
                  <ul className="list-disc space-y-1 pl-4 text-ink">
                    {papForfaits[papInfo].technique.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {device.modular ? (
                papRegions.map((region) => (
                  <details key={region.name} className="mb-2 rounded-lg border border-line-soft">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                      {region.name}{" "}
                      <span className="ml-2 rounded bg-petrol-tint px-1.5 font-mono text-[10px] text-petrol-deep">
                        Forfait {region.forfait}
                      </span>
                    </summary>
                    {region.items.map((it) => (
                      <div key={it.name} className="group relative border-t border-line-soft">
                        <button
                          className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-white"
                          onClick={() => dispatch({ type: "TOGGLE_PAP", name: it.name })}
                        >
                          <span
                            className={`mt-0.5 inline-block h-4 w-4 shrink-0 rounded border ${
                              state.pap[it.name] ? "border-petrol bg-petrol" : "border-line"
                            }`}
                          />
                          <span>
                            <b className="block text-sm">{it.name}</b>
                            <span className="block text-xs text-ink-soft">{it.desc}</span>
                          </span>
                        </button>
                        {it.info && (
                          <div className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-full rounded-xl border-2 border-orange-400 bg-orange-50 p-4 text-[13px] leading-relaxed text-orange-900 shadow-xl group-hover:block lg:fixed lg:left-[calc(50%+399px)] lg:right-4 lg:top-16 lg:z-50 lg:mt-0 lg:w-auto lg:max-w-[34rem]">
                            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-orange-700">
                              {it.name}
                            </div>
                            {it.info}
                          </div>
                        )}
                      </div>
                    ))}
                  </details>
                ))
              ) : (
                <p className="rounded-lg bg-petrol-tint/40 px-3 py-2 text-sm text-ink-soft">
                  Dispositif non modulaire : les PAP ne s&apos;appliquent pas.
                </p>
              )}

              {(selectedAdj.length > 0 || forfaits.length > 0) && (
                <Subtotal costs={costs} />
              )}

              <Nav dispatch={dispatch} next={() => go("result")} nextLabel="Terminer" nextFinish />
            </Step>
          )}

          {/* ---------------- RESULTAT ---------------- */}
          {stage === "result" && device && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-lg bg-petrol-deep px-3 py-2 font-mono text-lg font-semibold text-petrol-tint">
                  {device.code}
                </span>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                  {device.family}
                </span>
                {answers.vehicleBrand && (
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                    {answers.vehicleBrand}
                  </span>
                )}
                {device.electric && answers.classe && (
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                    Classe {answers.classe}
                  </span>
                )}
              </div>
              <div className="mt-3 text-lg font-semibold">{device.name}</div>

              <dl className="my-4 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line-soft bg-line-soft sm:grid-cols-2">
                <Cell full label="Mode de prise en charge">
                  {device.modes
                    .filter((m) => modesForDuree(answers.duree).includes(m))
                    .map((m) => modeLabels[m]?.label ?? m)
                    .join(" / ")}
                </Cell>
                <Cell full label="Prescripteur / attestation">{prescribers[device.presc]}</Cell>
                <Cell label="Fiche évaluation + préconisation">
                  {device.fiche ? "Requises" : "Non concerné"}
                </Cell>
                <Cell label="Accord préalable">
                  <span className={device.dap ? "font-semibold text-amber" : ""}>
                    {device.dap ? "DAP requise" : "Non requise"}
                  </span>
                </Cell>
              </dl>

              {route && (
                <Flag>
                  <b>Classe {answers.classe} — code de la route.</b> Ceinture, éclairage et bandes
                  réfléchissantes inclus et non facturables en sus.
                </Flag>
              )}
              {device.electric && answers.aptitude === "non" && (
                <Flag>
                  <b>Conduite par tierce personne.</b> Commande pour l&apos;accompagnant
                  (FREP/FREV, exception nomenclature).
                </Flag>
              )}

              {(devLpp || selectedAdj.length > 0 || forfaits.length > 0) && (
                <div className="my-4">
                  <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                    Codes LPP &amp; tarifs
                  </h4>
                  <p className="mb-2 text-[11px] italic text-ink-soft">
                    Tarifs de responsabilité LPPR, affichés à titre indicatif.
                  </p>
                  {devLpp && (
                    <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-1.5 text-sm">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="shrink-0 rounded bg-orange-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-orange-800">
                          {devLpp.code}
                        </span>
                        <span>
                          {model ? `${device.name} — ${model}` : device.name}{" "}
                          <span className="text-ink-soft">· {brand ?? "dispositif"}</span>
                        </span>
                      </span>
                      <span className="font-mono text-orange-800">
                        {devLpp.tarif != null ? eur(devLpp.tarif) : "n.c."}
                      </span>
                    </div>
                  )}
                  {forfaits.map((f) => (
                    <Line
                      key={f}
                      code={adaptedCode(papForfaits[f].code, brand, adjBrandMap)}
                      label={papForfaits[f].label}
                      value={eur(papForfaits[f].price)}
                    />
                  ))}
                  {selectedAdj.map((a) => (
                    <Line
                      key={a.code}
                      code={adaptedCode(a.code, brand, adjBrandMap)}
                      label={a.name}
                      value={priceLabel(a)}
                      open={!!(a.devis || a.tbd)}
                    />
                  ))}
                  {addLivraison && (
                    <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-1.5 text-sm">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-800">
                          {meta.livraison.code}
                        </span>
                        <span>
                          {meta.livraison.label} <span className="text-ink-soft">· MAD</span>
                        </span>
                      </span>
                      <span className="font-mono text-blue-800">{eur(meta.livraison.price)}</span>
                    </div>
                  )}
                  {(selectedAdj.length > 0 || forfaits.length > 0) && <Subtotal costs={costs} />}
                  {devLpp?.tarif != null && (
                    <div className="mt-2 flex items-center justify-between rounded-lg bg-ink/5 px-4 py-3">
                      <b className="text-sm text-ink">
                        Total indicatif{costs.hasOpen ? " (hors devis / à préciser)" : ""}
                      </b>
                      <span className="font-mono text-base font-semibold text-ink">
                        {eur(devLpp.tarif + costs.subtotal + (addLivraison ? meta.livraison.price : 0))}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={copyCodes}
                    className={`mt-3 w-full justify-center ${primary} py-3`}
                  >
                    {copied ? "✓ Codes LPP copiés" : `Copier les ${lpprCodes.length} codes LPP`}
                  </button>

                  {/* Forfait de livraison : option cochable, encart bleu, copie dédiée. */}
                  <div className="mt-3 rounded-xl border-2 border-blue-400 bg-blue-50 p-4">
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={addLivraison}
                        onChange={(e) => setAddLivraison(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-blue-600"
                      />
                      <span className="text-sm">
                        <b className="text-blue-900">Ajouter le forfait Mise A Disposition (MAD)</b>
                        <span className="mt-0.5 block text-[12px] text-blue-800/80">
                          {meta.livraison.label}
                        </span>
                      </span>
                    </label>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <span className="rounded bg-blue-200/70 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-blue-900">
                          {meta.livraison.code}
                        </span>
                        <span className="font-mono text-sm font-semibold text-blue-900">
                          {eur(meta.livraison.price)}
                        </span>
                      </span>
                      <button
                        onClick={copyLivraison}
                        className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        {copiedLiv ? "✓ Copié" : "Copier le code MAD"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {Object.values(state.pap).some(Boolean) && (
                <div className="my-4">
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                    Positionnement (PAP) retenu
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(state.pap)
                      .filter((k) => state.pap[k])
                      .map((k) => (
                        <span key={k} className="rounded border border-line-soft bg-petrol-tint/40 px-2 py-1 text-xs">
                          {k}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button className={`${primary} py-2.5`} onClick={() => go("adj")}>
                  Modifier les adjonctions
                </button>
                <button
                  className="rounded-lg border border-line bg-card px-4 py-2.5 font-semibold hover:border-petrol hover:text-petrol-deep"
                  onClick={() => dispatch({ type: "RESET" })}
                >
                  Nouvelle évaluation
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <RechercheLpp />

      <footer className="mt-6 border-t border-line pt-4 text-[11.5px] leading-relaxed text-ink-soft/90">
        <b className="text-ink-soft">{meta.disclaimer}</b> Source : {meta.source}. Dernière mise à
        jour : {meta.lastUpdated}.
      </footer>
    </div>
  );
}

/* ---------------- petits composants utilitaires ---------------- */

function Step({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <>
      <h2 className="mb-1 text-xl font-semibold">{title}</h2>
      {hint && <p className="mb-4 text-sm text-ink-soft">{hint}</p>}
      {children}
    </>
  );
}

function Nav({
  dispatch,
  next,
  nextLabel,
  nextPrimary,
  nextFinish,
}: {
  dispatch: ReturnType<typeof useWalker>["dispatch"];
  next?: () => void;
  nextLabel?: string;
  nextPrimary?: boolean;
  nextFinish?: boolean;
}) {
  const nextClass = nextFinish ? finish : nextPrimary ? `${primary} py-2.5` : navBtn;
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <button className={navBtn} onClick={() => dispatch({ type: "BACK" })}>
        ← Précédent
      </button>
      {next ? (
        <button className={nextClass} onClick={next}>
          {nextLabel}
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

function DeviceChoice({
  title,
  list,
  duree,
  dispatch,
}: {
  title: string;
  list: Device[];
  duree: Answers["duree"];
  dispatch: ReturnType<typeof useWalker>["dispatch"];
}) {
  const allowed = modesForDuree(duree);
  return (
    <Step title={title} hint="Choisissez le dispositif correspondant au besoin dominant.">
      {list.length === 0 && (
        <p className="rounded-lg bg-petrol-tint/40 px-3 py-2 text-sm text-ink-soft">
          Aucun dispositif disponible pour cette temporalité.
        </p>
      )}
      {list.map((d) => {
        const modes = d.modes.filter((m) => allowed.includes(m));
        const ind = deviceIndicationsByCode[d.code] ?? {};
        const entries = modes.map((m) => [m, ind[m]] as const).filter(([, t]) => t);
        return (
          <div key={d.code} className="group relative">
            <button
              className={btn}
              onClick={() => dispatch({ type: "CHOOSE_DEVICE", code: d.code })}
            >
              <b className="block">
                <span className="font-mono">{d.code}</span> — {d.name}
              </b>
              <span className="mt-0.5 block text-xs text-ink-soft">
                Prise en charge : {modes.join(" · ")}
              </span>
            </button>
            {entries.length > 0 && (
              <div className="pointer-events-none absolute left-0 top-full z-30 mt-2 hidden w-full rounded-xl border-2 border-orange-400 bg-orange-50 p-4 text-[13px] leading-relaxed text-orange-900 shadow-xl group-hover:block lg:fixed lg:left-[calc(50%+399px)] lg:right-4 lg:top-16 lg:z-50 lg:mt-0 lg:w-auto lg:max-w-[34rem]">
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-orange-700">
                  Indication officielle de prise en charge
                </div>
                {entries.map(([m, t]) => (
                  <p key={m} className="mb-2 last:mb-0">
                    <span className="font-semibold">{m} — </span>
                    {t}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <Nav dispatch={dispatch} />
    </Step>
  );
}

function BesoinFieldRow({
  field,
  answers,
  onSet,
}: {
  field: BesoinField;
  answers: Answers;
  onSet: <K extends keyof Answers>(field: K, value: Answers[K]) => void;
}) {
  if (!field.options) return null;
  const current = answers[field.id as keyof Answers];
  return (
    <div className="mb-4">
      <div className="mb-2 text-sm font-semibold">
        {field.label}
        {field.hint && <span className="ml-1.5 font-normal text-ink-soft">· {field.hint}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {field.options.map((o) => (
          <button
            key={o.v}
            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
              current === o.v ? "border-petrol bg-petrol text-white" : "border-line bg-card hover:border-petrol"
            }`}
            onClick={() => onSet(field.id as keyof Answers, o.v as Answers[keyof Answers])}
          >
            {o.t}
          </button>
        ))}
      </div>
    </div>
  );
}

function Flag({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-amber/30 bg-amber-tint px-3 py-3 text-sm leading-relaxed text-[#5c3208]">
      {children}
    </div>
  );
}

function Subtotal({ costs }: { costs: ReturnType<typeof selectCosts> }) {
  return (
    <div className="mt-3 flex items-center justify-between rounded-lg bg-petrol-tint px-4 py-3">
      <b className="text-sm text-petrol-deep">
        Sous-total{costs.hasOpen ? " (hors devis / à préciser)" : ""}
      </b>
      <span className="font-mono text-base font-semibold text-petrol-deep">{eur(costs.subtotal)}</span>
    </div>
  );
}

function Cell({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`bg-card px-4 py-3 ${full ? "sm:col-span-2" : ""}`}>
      <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

function Line({ code, label, value, open }: { code: string; label: string; value: string; open?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-1.5 text-sm last:border-0">
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="shrink-0 rounded bg-petrol-tint px-1.5 py-0.5 font-mono text-[11px] font-semibold text-petrol-deep">
          {code}
        </span>
        <span>{label}</span>
      </span>
      <span className={`font-mono ${open ? "text-amber" : "text-petrol-deep"}`}>{value}</span>
    </div>
  );
}

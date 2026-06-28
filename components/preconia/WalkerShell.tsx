"use client";

/* Shell minimal du walker (session « socle »).
   But : prouver que la machine à états, la navigation et les invariants fonctionnent
   de bout en bout. Le rendu riche par étape (QuestionStep, BesoinsForm, AdjonctionsPanel,
   PapPanel, ResultCard, synthèse copiable) est volontairement reporté à la session UI. */

import {
  adjGroups,
  besoins,
  classes,
  devices,
  meta,
  modes as modeLabels,
  papForfaits,
  papRegions,
  prescribers,
} from "@/lib/data";
import { eur } from "@/lib/format";
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
const primary =
  "inline-flex items-center gap-2 rounded-lg bg-petrol px-5 py-3 font-semibold text-white hover:bg-petrol-deep";

function priceLabel(a: Adjonction): string {
  if (a.devis) return "Sur devis";
  if (a.tbd) return "Tarif à préciser";
  return eur(a.price ?? 0);
}

const MAN_FAMILIES = ["Manuel non modulaire", "Manuel modulaire"];

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

  return (
    <div className="mx-auto max-w-[790px] px-5 pb-16 pt-8">
      <header>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-petrol">
          Aide à la préconisation VPH · Médecine physique &amp; réadaptation
        </div>
        <div className="my-1 text-[30px] font-bold tracking-tight">
          PRECON<span className="text-petrol">IA</span>
        </div>
        <p className="max-w-[60ch] text-sm leading-relaxed text-ink-soft">
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
                Temporaire — moins de 3 mois estimés
              </button>
              <button
                className={`${btn} ${answers.duree === "durable" ? btnOn : ""}`}
                onClick={() => {
                  setAnswer("duree", "durable");
                  go("mob");
                }}
              >
                Durable — permanent ou supérieur à 6 mois
              </button>
              <Nav dispatch={dispatch} />
            </Step>
          )}

          {/* ---------------- MOBILITE ---------------- */}
          {stage === "mob" && (
            <Step title="Capacité de marche et de propulsion" hint="Détermine la grande famille de dispositif.">
              <button className={btn} onClick={() => dispatch({ type: "CHOOSE_DEVICE", code: "SCO", mob: "scooter" })}>
                Marche possible sur quelques mètres → scooter
              </button>
              <button
                className={btn}
                onClick={() => {
                  setAnswer("mob", "manuel");
                  go("cfg_man");
                }}
              >
                Incapacité de marche — propulsion manuelle possible
              </button>
              <button
                className={btn}
                onClick={() => {
                  setAnswer("mob", "elec");
                  go("cfg_elec");
                }}
              >
                Incapacité de marche — propulsion manuelle impossible (électrique)
              </button>
              {answers.age === "enfant" && (
                <button
                  className={btn}
                  onClick={() => {
                    setAnswer("mob", "poussette");
                    go("cfg_pou");
                  }}
                >
                  Enfant ne pouvant utiliser un autre VPH → poussette
                </button>
              )}
              <button className={btn} onClick={() => dispatch({ type: "CHOOSE_DEVICE", code: "BASE", mob: "base" })}>
                Installation sur moulage thermoformable → base roulante
              </button>
              <button className={btn} onClick={() => dispatch({ type: "CHOOSE_DEVICE", code: "CYC", mob: "cycle" })}>
                Déplacement par tricycle adapté → cycle
              </button>
              <Nav dispatch={dispatch} />
            </Step>
          )}

          {/* ---------------- CONFIG (man / elec / pou) ---------------- */}
          {stage === "cfg_man" && (
            <DeviceChoice
              title="Configuration manuelle"
              list={devices.filter((d) => MAN_FAMILIES.includes(d.family))}
              dispatch={dispatch}
            />
          )}
          {stage === "cfg_elec" && (
            <DeviceChoice
              title="Configuration électrique"
              list={devices.filter((d) => d.family === "Électrique")}
              dispatch={dispatch}
            />
          )}
          {stage === "cfg_pou" && (
            <DeviceChoice
              title="Type de poussette"
              list={devices.filter((d) => d.family === "Poussette")}
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
                .filter((f) => !(f.id === "depl" && device.electric))
                .map((f) => (
                  <BesoinFieldRow key={f.id} field={f} answers={answers} onSet={setAnswer} />
                ))}

              {device.electric && answers.cognition === "non" && (
                <Flag>
                  <b>Capacités de conduite insuffisantes.</b> Envisager une commande pour
                  l&apos;accompagnant (FREP/FREV — exception prévue par la nomenclature).
                </Flag>
              )}

              <Nav dispatch={dispatch} next={() => go("adj")} nextLabel="Adjonctions →" />
            </Step>
          )}

          {/* ---------------- ADJONCTIONS + PAP ---------------- */}
          {stage === "adj" && device && (
            <Step
              title="Adjonctions facturables"
              hint={`Sélection compatible avec le ${device.code}. Codes LPPR et tarifs TTC indicatifs.`}
            >
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
                          <span className="font-mono text-[11px] text-ink-soft">{item.code}</span>
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
              <div className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                Produits d&apos;aide au positionnement (PAP)
              </div>
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
                      <button
                        key={it.name}
                        className="flex w-full items-start gap-2 border-t border-line-soft px-3 py-2 text-left hover:bg-white"
                        onClick={() => dispatch({ type: "TOGGLE_PAP", name: it.name })}
                      >
                        <span
                          className={`mt-0.5 inline-block h-4 w-4 rounded border ${
                            state.pap[it.name] ? "border-petrol bg-petrol" : "border-line"
                          }`}
                        />
                        <span>
                          <b className="block text-sm">{it.name}</b>
                          <span className="block text-xs text-ink-soft">{it.desc}</span>
                        </span>
                      </button>
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

              <Nav dispatch={dispatch} next={() => go("result")} nextLabel="Voir la préconisation →" />
            </Step>
          )}

          {/* ---------------- RESULTAT ---------------- */}
          {stage === "result" && device && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-lg bg-petrol-deep px-3 py-2 font-mono text-lg font-semibold text-petrol-tint">
                  {device.code}
                </span>
                <span className="rounded-full bg-petrol-tint px-3 py-1 text-xs font-semibold text-petrol-deep">
                  {device.family}
                </span>
                {device.electric && answers.classe && (
                  <span className="rounded-full bg-petrol-tint px-3 py-1 text-xs font-semibold text-petrol-deep">
                    Classe {answers.classe}
                  </span>
                )}
                {device.tarif && (
                  <span className="font-mono text-sm font-semibold text-petrol-deep">
                    {eur(device.tarif)} <span className="font-normal text-ink-soft">base</span>
                  </span>
                )}
              </div>
              <div className="mt-3 text-lg font-semibold">{device.name}</div>

              <dl className="my-4 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line-soft bg-line-soft sm:grid-cols-2">
                <Cell full label="Mode de prise en charge">
                  {device.modes.map((m) => modeLabels[m]?.label ?? m).join(" / ")}
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

              <Section title="Indications · mots-clés de prescription" items={device.indications} />

              {route && (
                <Flag>
                  <b>Classe {answers.classe} — code de la route.</b> Ceinture, éclairage et bandes
                  réfléchissantes inclus et non facturables en sus.
                </Flag>
              )}
              {answers.conduite && (
                <Flag>
                  <b>Conduite depuis le fauteuil.</b> Assise basse (type Low Rider), homologation
                  ISO 7176-19 et arrimage. À coordonner avec l&apos;évaluation du véhicule aménagé.
                </Flag>
              )}

              {(selectedAdj.length > 0 || forfaits.length > 0) && (
                <div className="my-4">
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                    Adjonctions &amp; forfaits PAP
                  </h4>
                  {forfaits.map((f) => (
                    <Line key={f} code={papForfaits[f].code} label={papForfaits[f].label} value={eur(papForfaits[f].price)} />
                  ))}
                  {selectedAdj.map((a) => (
                    <Line key={a.code} code={a.code} label={a.name} value={priceLabel(a)} open={!!(a.devis || a.tbd)} />
                  ))}
                  <Subtotal costs={costs} />
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

              <Section title="Fiche technique · repères" items={device.ft} muted />

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

      <footer className="mt-6 border-t border-line pt-4 text-[11.5px] leading-relaxed text-ink-soft/90">
        <b className="text-ink-soft">{meta.disclaimer}</b> {meta.livraison.label}{" "}
        <span className="font-mono">{meta.livraison.code}</span> : {eur(meta.livraison.price)}. Source :{" "}
        {meta.source}. Dernière mise à jour : {meta.lastUpdated}.
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
}: {
  dispatch: ReturnType<typeof useWalker>["dispatch"];
  next?: () => void;
  nextLabel?: string;
}) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <button className={link} onClick={() => dispatch({ type: "BACK" })}>
        ← Retour
      </button>
      {next ? (
        <button className={link} onClick={next}>
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
  dispatch,
}: {
  title: string;
  list: Device[];
  dispatch: ReturnType<typeof useWalker>["dispatch"];
}) {
  return (
    <Step title={title} hint="Choisissez le dispositif correspondant au besoin dominant.">
      {list.map((d) => (
        <button key={d.code} className={btn} onClick={() => dispatch({ type: "CHOOSE_DEVICE", code: d.code })}>
          <b className="block">
            <span className="font-mono">{d.code}</span> — {d.name}
          </b>
          <span className="block text-xs text-ink-soft">{d.indications[0]}</span>
        </button>
      ))}
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
        {field.effect && field.id === "conduiteAuto" && (
          <span className="ml-1.5 font-normal text-ink-soft">· active le volet véhicule aménagé</span>
        )}
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

function Section({ title, items, muted }: { title: string; items: string[]; muted?: boolean }) {
  return (
    <div className="my-4">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${muted ? "bg-line" : "bg-petrol"}`} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Line({ code, label, value, open }: { code: string; label: string; value: string; open?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-1.5 text-sm last:border-0">
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="font-mono text-[11px] text-ink-soft">{code}</span>
        <span>{label}</span>
      </span>
      <span className={`font-mono ${open ? "text-amber" : "text-petrol-deep"}`}>{value}</span>
    </div>
  );
}

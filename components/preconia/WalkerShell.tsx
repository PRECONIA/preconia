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
  deviceOptionSheetByToken,
  deviceIndicationsByCode,
  deviceLppByType,
  devices,
  lcdForfaits,
  lldForfaits,
  madLcd,
  madNiveaux,
  meta,
  prestationByCode,
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
  lcdForfaitFor,
  lcdOptionAchatFor,
  lldForfaitFor,
  madForfaitFor,
  madLcdFor,
  modesForDuree,
  optionSheetFor,
} from "@/lib/rules";
import { eur } from "@/lib/format";
import { RechercheLpp } from "@/components/preconia/RechercheLpp";
import { ModuleCumul } from "@/components/preconia/ModuleCumul";
import { RechercheVph } from "@/components/preconia/RechercheVph";
import { Logo } from "@/components/preconia/Logo";
import type { FicheData } from "@/components/preconia/fiche-pdf";
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
/** Bouton de choix : l'état sélectionné remplace le hover (sinon le bouton cliqué restait
    blanc tant que la souris ne quittait pas le bouton — le hover l'emportait sur la sélection). */
const choice = (on: boolean, extra = "") =>
  `block w-full text-left rounded-lg border px-4 py-3 mb-2 transition-colors ${extra} ${
    on ? "border-petrol bg-petrol-tint" : "border-line bg-card hover:border-petrol hover:bg-white"
  }`;
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

/** Mode de prise en charge retenu par le parcours : achat, LCD ou LLD. */
type Pec = "achat" | "lcd" | "lld";

/* Charte des encarts « code du fauteuil » : une couleur par mode de prise en charge —
   achat = orange (existant), LCD = cyan, LLD = violet (classes Tailwind statiques). */
const PEC_TINT: Record<
  Pec,
  { box: string; title: string; badge: string; badgeSoft: string; strong: string; soft: string; tag: string }
> = {
  achat: {
    box: "border-orange-400 bg-orange-100/60",
    title: "text-orange-800",
    badge: "bg-orange-200/70 text-orange-800",
    badgeSoft: "bg-orange-100 text-orange-800",
    strong: "text-orange-800",
    soft: "text-orange-700/80",
    tag: "bg-orange-500",
  },
  lcd: {
    box: "border-cyan-500 bg-cyan-100/60",
    title: "text-cyan-800",
    badge: "bg-cyan-200/70 text-cyan-900",
    badgeSoft: "bg-cyan-100 text-cyan-900",
    strong: "text-cyan-800",
    soft: "text-cyan-700/80",
    tag: "bg-cyan-600",
  },
  lld: {
    box: "border-violet-500 bg-violet-100/60",
    title: "text-violet-800",
    badge: "bg-violet-200/70 text-violet-900",
    badgeSoft: "bg-violet-100 text-violet-800",
    strong: "text-violet-800",
    soft: "text-violet-700/80",
    tag: "bg-violet-600",
  },
};

/** Suffixe de périodicité d'un forfait de location (« / semaine », « / trimestre »). */
const perUnit = (u?: string) => (u === "semaine" ? " / semaine" : u === "trimestre" ? " / trimestre" : "");

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
  // Fiche tarif/options constructeur pour le modèle choisi (null = non répertoriée).
  const optionSheet = device
    ? optionSheetFor(device, answers.classe, brand, model, deviceOptionSheetByToken)
    : null;

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

  // Mode de prise en charge retenu : LCD (besoin temporaire), LLD ou achat (besoin durable).
  const pec: Pec = answers.duree === "temp" ? "lcd" : answers.acquisition === "lld" ? "lld" : "achat";
  const tint = PEC_TINT[pec];
  // Forfait de location : le code LPPR facturé en LCD (hebdo, selon la durée) ou LLD
  // (trimestriel, FREP par classe) — jamais le code d'achat neuf.
  const locForfait = device
    ? pec === "lcd"
      ? lcdForfaitFor(device.code, answers.lcdDuree, lcdForfaits, prestationByCode)
      : pec === "lld"
        ? lldForfaitFor(device, answers.classe, lldForfaits, prestationByCode)
        : null
    : null;
  // Option d'achat LCD de la catégorie — cochable sur la fiche finale.
  const lcdOption =
    device && pec === "lcd" ? lcdOptionAchatFor(device.code, lcdForfaits, prestationByCode) : null;
  const [addOptionAchat, setAddOptionAchat] = useState(false);

  // Forfait de livraison — option cochable sur la fiche finale.
  const [addLivraison, setAddLivraison] = useState(false);
  // Forfait MAD — cochable aussi. MAD1/MAD2 valent à l'achat et en LLD (Titre IV 5.1/5.2) ;
  // en LCD c'est le forfait MAD dédié du Titre I (1213650, réservé FRM et FRE) qui s'applique.
  const [addMad, setAddMad] = useState(false);
  const madForfait =
    device && pec !== "lcd"
      ? madForfaitFor(device.code, answers.mad, madNiveaux, prestationByCode)
      : null;
  const madLcdForfait =
    device && pec === "lcd" ? madLcdFor(device.code, madLcd, prestationByCode) : null;
  // Forfait MAD effectif selon le mode (alimente codes copiés, total et PDF).
  const effMad = pec === "lcd" ? madLcdForfait : madForfait;
  // Verdict du module de cumul embarqué (étape cumul) : null tant que non évalué.
  const [cumulVerdict, setCumulVerdict] = useState<boolean | null>(null);

  // Ligne « fauteuil » de la fiche : code d'achat neuf en achat, forfait de location en LCD/LLD.
  const deviceLine =
    device && pec === "achat" && devLpp
      ? {
          code: devLpp.code,
          label: model ? `${device.name} — ${model}${brand ? ` (${brand})` : ""}` : device.name,
        }
      : device && pec !== "achat" && locForfait
        ? { code: locForfait.code, label: locForfait.label }
        : null;

  // Tous les codes LPP de la fiche finale : fauteuil (ou forfait de location) + forfaits PAP
  // + adjonctions (adaptés marque) + option d'achat LCD, livraison et MAD s'ils sont cochés.
  const lpprCodes = [
    ...(deviceLine ? [deviceLine] : []),
    ...forfaits.map((f) => ({
      code: adaptedCode(papForfaits[f].code, brand, adjBrandMap),
      label: papForfaits[f].label,
    })),
    ...selectedAdj.map((a) => ({
      code: adaptedCode(a.code, brand, adjBrandMap),
      label: a.name,
    })),
    ...(addOptionAchat && lcdOption ? [{ code: lcdOption.code, label: lcdOption.label }] : []),
    ...(addLivraison ? [{ code: meta.livraison.code, label: meta.livraison.label }] : []),
    ...(addMad && effMad ? [{ code: effMad.code, label: effMad.label }] : []),
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
  const [copiedMad, setCopiedMad] = useState(false);
  const copyMad = () =>
    effMad && copyToClipboard(`${effMad.code}\t${effMad.label}`, setCopiedMad);
  const [copiedOption, setCopiedOption] = useState(false);
  const copyOption = () =>
    lcdOption && copyToClipboard(`${lcdOption.code}\t${lcdOption.label}`, setCopiedOption);
  // Encart « définition + spécificités techniques » du forfait PAP A ou B.
  const [papInfo, setPapInfo] = useState<"A" | "B" | null>(null);
  // Connecteur animé : trace une ligne du bouton survolé vers l'encart info orange (grand écran).
  const [connSource, setConnSource] = useState<DOMRect | null>(null);
  const onHoverEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024)
      setConnSource(e.currentTarget.getBoundingClientRect());
  };
  const onHoverLeave = () => setConnSource(null);

  // ---- Export PDF de la fiche de préconisation ----
  // Construit un objet purement sérialisable depuis l'état courant (aucune logique dans le PDF).
  const buildFicheData = (): FicheData => {
    const dev = device!;
    const allowedModes = modesForDuree(answers.duree, answers.acquisition);

    const profile: { k: string; v: string }[] = facets(answers)
      .filter((f) => f.v)
      .map((f) => ({ k: f.k, v: f.v as string }));
    if (dev.electric && answers.classe) profile.push({ k: "Classe", v: `Classe ${answers.classe}` });
    if (answers.vehicleBrand) profile.push({ k: "Marque", v: answers.vehicleBrand });
    if (answers.vehicleModel) profile.push({ k: "Modèle", v: answers.vehicleModel });

    const flags: string[] = [];
    if (route)
      flags.push(
        `Classe ${answers.classe} — code de la route : ceinture, éclairage et bandes réfléchissantes inclus et non facturables en sus.`,
      );
    if (dev.electric && answers.aptitude === "non")
      flags.push(
        "Conduite par tierce personne : commande pour l'accompagnant (FREP/FREV, exception nomenclature).",
      );

    const vphInd = Object.entries(deviceIndicationsByCode[dev.code] ?? {})
      .filter(([m]) => allowedModes.includes(m as (typeof allowedModes)[number]))
      .map(([mode, text]) => ({ mode, text }));

    const devDisplayName = model
      ? `${dev.name} — ${model}${brand ? ` (${brand})` : ""}`
      : `${dev.name}${brand ? ` · ${brand}` : ""}`;
    // Achat : code d'achat neuf ; LCD/LLD : le forfait de location est LE code facturé.
    const vph =
      pec === "achat"
        ? devLpp
          ? {
              code: devLpp.code,
              tarif: devLpp.tarif,
              tarifUnit: null,
              name: devDisplayName,
              indications: vphInd,
            }
          : null
        : locForfait
          ? {
              code: locForfait.code,
              tarif: locForfait.price,
              tarifUnit: perUnit(locForfait.unit) || null,
              name: `${devDisplayName} — ${pec === "lcd" ? "location courte durée" : "location longue durée"}`,
              indications: vphInd,
            }
          : null;

    const forfaitsData = forfaits.map((f) => ({
      code: adaptedCode(papForfaits[f].code, brand, adjBrandMap),
      label: papForfaits[f].label,
      price: papForfaits[f].price,
      definition: papForfaits[f].definition,
      technique: papForfaits[f].technique,
    }));

    const adjData = selectedAdj.map((a) => ({
      code: adaptedCode(a.code, brand, adjBrandMap),
      name: a.name,
      price: priceLabel(a),
      open: !!(a.devis || a.tbd),
    }));

    const papData = papRegions.flatMap((r) =>
      r.items
        .filter((it) => state.pap[it.name])
        .map((it) => ({
          name: it.name,
          forfait: r.forfait,
          code: adaptedCode(papForfaits[r.forfait].code, brand, adjBrandMap),
          info: it.info,
        })),
    );

    const extras =
      (addLivraison ? meta.livraison.price : 0) +
      (addMad && effMad ? effMad.price : 0) +
      (addOptionAchat && lcdOption ? lcdOption.price : 0);
    // Achat : total avec le fauteuil. Location : total des seuls éléments ponctuels, le forfait
    // de location (périodique) restant affiché à part — jamais mélangé au total.
    const total =
      pec === "achat"
        ? devLpp?.tarif != null
          ? devLpp.tarif + costs.subtotal + extras
          : null
        : costs.subtotal + extras > 0
          ? costs.subtotal + extras
          : null;

    const lcdDureeLabel =
      pec === "lcd" && answers.lcdDuree
        ? answers.lcdDuree === "s13"
          ? " (jusqu'à 13 semaines)"
          : " (14 à 26 semaines)"
        : "";

    return {
      generatedAt: new Date().toLocaleDateString("fr-FR"),
      pec,
      device: {
        code: dev.code,
        name: dev.name,
        family: dev.family,
        modes:
          dev.modes
            .filter((m) => allowedModes.includes(m))
            .map((m) => modeLabels[m]?.label ?? m)
            .join(" / ") + lcdDureeLabel,
        presc: prescribers[dev.presc],
        fiche: dev.fiche,
        dap: dev.dap,
      },
      profile,
      flags,
      vph,
      forfaits: forfaitsData,
      adjonctions: adjData,
      pap: papData,
      optionAchat:
        addOptionAchat && lcdOption
          ? { code: lcdOption.code, label: lcdOption.label, price: lcdOption.price }
          : null,
      livraison: addLivraison
        ? { code: meta.livraison.code, label: meta.livraison.label, price: meta.livraison.price }
        : null,
      mad: addMad && effMad ? { code: effMad.code, label: effMad.label, price: effMad.price } : null,
      totals: {
        subtotal: costs.subtotal,
        hasOpen: costs.hasOpen,
        total,
        horsLocation: pec !== "achat",
      },
      disclaimer: meta.disclaimer,
      source: meta.source,
      lastUpdated: meta.lastUpdated,
    };
  };

  const [pdfBusy, setPdfBusy] = useState(false);
  const exportPdf = async () => {
    if (!device) return;
    // Onglet ouvert dans le geste de clic (sinon bloqué comme pop-up après l'await).
    const win = window.open("", "_blank");
    if (win) {
      win.document.title = `Préconisation ${device.code}`;
      win.document.body.style.cssText = "margin:0;font-family:sans-serif;color:#4c5c68";
      win.document.body.innerHTML =
        '<p style="padding:24px">Génération de la fiche PDF…</p>';
    }
    setPdfBusy(true);
    try {
      const data = buildFicheData();
      const { renderFichePdfUrl } = await import("@/components/preconia/fiche-pdf");
      const url = await renderFichePdfUrl(data);
      if (win) win.location.href = url;
      else window.location.href = url; // repli si pop-up bloqué
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error("Export PDF échoué", e);
      win?.close();
    } finally {
      setPdfBusy(false);
    }
  };

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
                Prescription &amp; préconisation d&apos;un fauteuil roulant (VPH)
              </h1>
              <p className="mb-4 text-sm text-ink-soft">
                Un parcours guidé mène du profil fonctionnel à la catégorie LPPR, sa classe, son
                circuit de prise en charge et ses adjonctions.
              </p>
              <button className={`${primary} w-full justify-center`} onClick={() => go("age")}>
                Commencer l&apos;évaluation →
              </button>
            </>
          )}

          {/* ---------------- CUMUL ---------------- */}
          {stage === "cumul" && (
            <Step
              title="Cumul de VPH"
              hint="Le patient possède-t-il déjà un VPH pris en charge ? Certaines catégories ne sont pas cumulables (nomenclature LPPR)."
            >
              <button
                className={choice(answers.cumul === "non")}
                onClick={() => {
                  setAnswer("cumul", "non");
                  go("duree");
                }}
              >
                Non — pas de VPH déjà possédé (pas de question de cumul)
              </button>
              <button
                className={choice(answers.cumul === "oui")}
                onClick={() => setAnswer("cumul", "oui")}
              >
                Oui — un VPH est déjà possédé (évaluer le cumul)
              </button>

              {answers.cumul === "oui" && (
                <div className="mt-3">
                  <ModuleCumul embedded idPrefix="walker-cumul" onVerdict={setCumulVerdict} />

                  {cumulVerdict === true && (
                    <button
                      className={`${primary} mt-3 w-full justify-center`}
                      onClick={() => go("duree")}
                    >
                      Cumul autorisé — poursuivre l&apos;évaluation →
                    </button>
                  )}
                  {cumulVerdict === false && (
                    <div className="mt-3 rounded-xl border-2 border-red-500 bg-red-50 p-4 text-center">
                      <p className="text-sm font-semibold text-red-700">
                        Cumul interdit — fin de l&apos;évaluation.
                      </p>
                      <p className="mt-1 text-xs text-red-700/80">
                        La catégorie souhaitée n&apos;est pas cumulable avec le VPH déjà possédé au
                        titre de la LPPR.
                      </p>
                      <button
                        className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-red-300 bg-card px-4 py-2.5 font-semibold text-red-700 hover:bg-red-100"
                        onClick={() => dispatch({ type: "RESET" })}
                      >
                        Nouvelle évaluation
                      </button>
                    </div>
                  )}
                </div>
              )}
              <Nav dispatch={dispatch} />
            </Step>
          )}

          {/* ---------------- AGE ---------------- */}
          {stage === "age" && (
            <Step title="Âge du patient" hint="Conditionne l'accès aux poussettes (moins de 18 ans).">
              <button
                className={choice(answers.age === "adulte")}
                onClick={() => {
                  setAnswer("age", "adulte");
                  go("mad");
                }}
              >
                Adulte (18 ans et plus)
              </button>
              <button
                className={choice(answers.age === "enfant")}
                onClick={() => {
                  setAnswer("age", "enfant");
                  go("mad");
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
                className={choice(answers.duree === "temp")}
                onClick={() => {
                  setAnswer("duree", "temp");
                  go("lcd_duree");
                }}
              >
                Temporaire — 3 mois ou moins · location courte durée (LCD)
              </button>
              <button
                className={choice(answers.duree === "durable")}
                onClick={() => {
                  setAnswer("duree", "durable");
                  go("acq");
                }}
              >
                Durable — 6 mois ou plus · achat ou location longue durée (ACHAT / LLD)
              </button>
              <Nav dispatch={dispatch} />
            </Step>
          )}

          {/* ---------------- DUREE DE LA LCD (forfait hebdo ≤ 13 sem / 14–26 sem) ---------------- */}
          {stage === "lcd_duree" && (
            <Step
              title="Durée de la location courte durée"
              hint="Le forfait hebdomadaire LCD dépend de la durée de location : jusqu'à 13 semaines, ou de 14 à 26 semaines incluses (au maximum 6 mois de facturation sur 12 mois glissants)."
            >
              <button
                className={choice(answers.lcdDuree === "s13")}
                onClick={() => {
                  setAnswer("lcdDuree", "s13");
                  go("mob");
                }}
              >
                Jusqu&apos;à 13 semaines{" "}
                <span className="text-ink-soft">· forfait hebdomadaire ≤ 13 sem</span>
              </button>
              <button
                className={choice(answers.lcdDuree === "s26")}
                onClick={() => {
                  setAnswer("lcdDuree", "s26");
                  go("mob");
                }}
              >
                De 14 à 26 semaines{" "}
                <span className="text-ink-soft">· forfait hebdomadaire 14–26 sem</span>
              </button>
              <Nav dispatch={dispatch} />
            </Step>
          )}

          {/* ---------------- ACQUISITION (achat / LLD) ---------------- */}
          {stage === "acq" && (
            <Step
              title="Achat ou location longue durée"
              hint="Besoin durable : le VPH est acheté, ou loué en longue durée (forfait trimestriel). La LLD est réservée aux catégories FRMP, FRMV, FREP, FREV et POU_MRE — seuls les VPH éligibles seront proposés."
            >
              <button
                className={choice(answers.acquisition === "achat")}
                onClick={() => {
                  setAnswer("acquisition", "achat");
                  go("mob");
                }}
              >
                Achat <span className="text-ink-soft">· code LPPR d&apos;achat neuf</span>
              </button>
              <button
                className={choice(answers.acquisition === "lld")}
                onClick={() => {
                  setAnswer("acquisition", "lld");
                  go("mob");
                }}
              >
                Location longue durée (LLD){" "}
                <span className="text-ink-soft">· forfait trimestriel</span>
              </button>
              <Nav dispatch={dispatch} />
            </Step>
          )}

          {/* ---------------- MAD (première / renouvellement) ---------------- */}
          {stage === "mad" && (
            <Step
              title="Mise à disposition"
              hint="Détermine le forfait applicable : MAD1 (première mise à disposition ou changement de catégorie) ou MAD2 (renouvellement à l'identique). Sans objet pour les fauteuils non modulaires (FMP, FMPR)."
            >
              <button
                className={choice(answers.mad === "premiere")}
                onClick={() => {
                  setAnswer("mad", "premiere");
                  go("cumul");
                }}
              >
                Première mise à disposition <span className="text-ink-soft">· forfait MAD1</span>
              </button>
              <button
                className={choice(answers.mad === "renouv_cat")}
                onClick={() => {
                  setAnswer("mad", "renouv_cat");
                  go("cumul");
                }}
              >
                Renouvellement avec changement de catégorie{" "}
                <span className="text-ink-soft">· forfait MAD1</span>
              </button>
              <button
                className={choice(answers.mad === "renouv_id")}
                onClick={() => {
                  setAnswer("mad", "renouv_id");
                  go("duree");
                }}
              >
                Renouvellement à l&apos;identique <span className="text-ink-soft">· forfait MAD2</span>
              </button>
              <Nav dispatch={dispatch} />
            </Step>
          )}

          {/* ---------------- MOBILITE ---------------- */}
          {stage === "mob" && (
            <Step title="Capacité de propulsion" hint="Oriente vers la famille de dispositif.">
              <button
                className={choice(answers.mob === "manuel")}
                onClick={() => {
                  setAnswer("mob", "manuel");
                  go("cfg_man");
                }}
              >
                Propulsion manuelle / podale
              </button>
              <button
                className={choice(answers.mob === "elec")}
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
              ].filter((d) => deviceAllowedForDuree(d, answers.duree, answers.acquisition))}
              duree={answers.duree}
              acquisition={answers.acquisition}
              dispatch={dispatch}
              onEnter={onHoverEnter}
              onLeave={onHoverLeave}
            />
          )}
          {stage === "cfg_elec" && (
            <DeviceChoice
              title="Configuration électrique"
              list={devices
                .filter((d) => d.family === "Électrique")
                .filter((d) => deviceAllowedForDuree(d, answers.duree, answers.acquisition))}
              duree={answers.duree}
              acquisition={answers.acquisition}
              dispatch={dispatch}
              onEnter={onHoverEnter}
              onLeave={onHoverLeave}
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
                      className={choice(answers.classe === c.value)}
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
              {/* Fauteuil en location (LCD / LLD) : le code LPPR facturé est le forfait de
                  location, pas le code d'achat — encart cyan (LCD) ou violet (LLD). */}
              {pec !== "achat" && (
                <div className={`mb-5 rounded-xl border-2 p-4 ${tint.box}`}>
                  <div className={`mb-1.5 flex items-center gap-2 text-sm font-semibold ${tint.title}`}>
                    {pec === "lcd"
                      ? "Fauteuil en location courte durée · code LPPR"
                      : "Fauteuil en location longue durée · code LPPR"}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${tint.tag}`}
                    >
                      {pec === "lcd"
                        ? answers.lcdDuree === "s26"
                          ? "LCD 14–26 sem"
                          : "LCD ≤ 13 sem"
                        : "LLD"}
                    </span>
                  </div>
                  {locForfait ? (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[12px] font-semibold ${tint.badge}`}
                          >
                            {locForfait.code}
                          </span>
                          <span className="truncate text-sm text-ink">{model ?? device.name}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className={`block font-mono text-sm font-semibold ${tint.strong}`}>
                            {eur(locForfait.price)}
                            {perUnit(locForfait.unit)}
                          </span>
                          <span className={`block text-[10px] font-normal ${tint.soft}`}>
                            forfait de location — à titre indicatif
                          </span>
                        </span>
                      </div>
                      {pec === "lcd" && lcdOption && (
                        <p className={`mt-2 rounded-md px-2 py-1.5 text-[11px] ${tint.badgeSoft}`}>
                          Option d&apos;achat {device.code} au terme de la location : code{" "}
                          <span className="font-mono font-semibold">{lcdOption.code}</span> (
                          {eur(lcdOption.price)}) — cochable sur la fiche finale.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className={`text-sm ${tint.soft}`}>
                      {pec === "lld" && device.electric && !answers.classe
                        ? "Sélectionnez la classe du fauteuil (étape besoins) pour déterminer le forfait trimestriel LLD."
                        : "Forfait de location indisponible pour ce dispositif."}
                    </p>
                  )}
                </div>
              )}

              {pec === "achat" && devLpp && (
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

                  {model && (
                    <div className="mt-3 border-t border-petrol/20 pt-3">
                      {optionSheet ? (
                        <a
                          href={optionSheet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-petrol bg-card px-3 py-2.5 text-sm font-semibold text-petrol-deep outline-none transition hover:bg-petrol hover:text-white focus:ring-2 focus:ring-petrol/40"
                        >
                          {optionSheet.kind === "pdf"
                            ? "Bon de commande & options (PDF)"
                            : "Bon de commande & options — page constructeur"}{" "}
                          ↗
                        </a>
                      ) : (
                        <p className="text-center text-sm text-petrol-deep/60">
                          Pas de fiche d’option constructeur disponible pour ce modèle.
                        </p>
                      )}
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
                        className={choice(!!state.adj[item.code], "flex items-start justify-between gap-3")}
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
                      <div
                        key={it.name}
                        className="group relative border-t border-line-soft"
                        onMouseEnter={it.info ? onHoverEnter : undefined}
                        onMouseLeave={it.info ? onHoverLeave : undefined}
                      >
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
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    pec === "lcd"
                      ? "bg-cyan-100 text-cyan-800"
                      : pec === "lld"
                        ? "bg-violet-100 text-violet-800"
                        : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {pec === "lcd"
                    ? answers.lcdDuree === "s26"
                      ? "LCD 14–26 sem"
                      : "LCD ≤ 13 sem"
                    : pec === "lld"
                      ? "LLD"
                      : "Achat"}
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
                    .filter((m) => modesForDuree(answers.duree, answers.acquisition).includes(m))
                    .map((m) => modeLabels[m]?.label ?? m)
                    .join(" / ")}
                  {pec === "lcd" && answers.lcdDuree
                    ? answers.lcdDuree === "s13"
                      ? " (jusqu'à 13 semaines)"
                      : " (14 à 26 semaines)"
                    : ""}
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

              {(devLpp || locForfait || selectedAdj.length > 0 || forfaits.length > 0) && (
                <div className="my-4">
                  <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                    Codes LPP &amp; tarifs
                  </h4>
                  <p className="mb-2 text-[11px] italic text-ink-soft">
                    Tarifs de responsabilité LPPR, affichés à titre indicatif.
                  </p>
                  {/* ligne fauteuil : code d'achat neuf (orange), ou forfait de location LCD
                      (cyan) / LLD (violet) — le code facturé en location est celui du forfait. */}
                  {(pec === "achat" ? devLpp != null : locForfait != null) && (
                    <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-1.5 text-sm">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${tint.badgeSoft}`}
                        >
                          {pec === "achat" ? devLpp!.code : locForfait!.code}
                        </span>
                        <span>
                          {model ? `${device.name} — ${model}` : device.name}{" "}
                          <span className="text-ink-soft">
                            ·{" "}
                            {pec === "achat"
                              ? (brand ?? "dispositif")
                              : pec === "lcd"
                                ? "location courte durée"
                                : "location longue durée"}
                          </span>
                        </span>
                      </span>
                      <span className={`font-mono ${tint.strong}`}>
                        {pec === "achat"
                          ? devLpp!.tarif != null
                            ? eur(devLpp!.tarif)
                            : "n.c."
                          : `${eur(locForfait!.price)}${perUnit(locForfait!.unit)}`}
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
                  {addOptionAchat && lcdOption && (
                    <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-1.5 text-sm">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="shrink-0 rounded bg-cyan-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-cyan-900">
                          {lcdOption.code}
                        </span>
                        <span>
                          {lcdOption.label}{" "}
                          <span className="text-ink-soft">· option d&apos;achat LCD</span>
                        </span>
                      </span>
                      <span className="font-mono text-cyan-800">{eur(lcdOption.price)}</span>
                    </div>
                  )}
                  {addLivraison && (
                    <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-1.5 text-sm">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-800">
                          {meta.livraison.code}
                        </span>
                        <span>
                          {meta.livraison.label} <span className="text-ink-soft">· livraison</span>
                        </span>
                      </span>
                      <span className="font-mono text-blue-800">{eur(meta.livraison.price)}</span>
                    </div>
                  )}
                  {addMad && effMad && (
                    <div className="flex items-baseline justify-between gap-3 border-b border-line-soft py-1.5 text-sm">
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-blue-800">
                          {effMad.code}
                        </span>
                        <span>
                          {effMad.label}{" "}
                          <span className="text-ink-soft">
                            · {pec === "lcd" ? "MAD LCD" : `MAD niveau ${madForfait!.niveau}`}
                          </span>
                        </span>
                      </span>
                      <span className="font-mono text-blue-800">{eur(effMad.price)}</span>
                    </div>
                  )}
                  {(selectedAdj.length > 0 || forfaits.length > 0) && <Subtotal costs={costs} />}
                  {(pec === "achat"
                    ? devLpp?.tarif != null
                    : costs.subtotal +
                        (addLivraison ? meta.livraison.price : 0) +
                        (addMad && effMad ? effMad.price : 0) +
                        (addOptionAchat && lcdOption ? lcdOption.price : 0) >
                      0) && (
                    <div className="mt-2 flex items-center justify-between rounded-lg bg-ink/5 px-4 py-3">
                      <b className="text-sm text-ink">
                        Total indicatif
                        {pec !== "achat" ? " hors forfait de location" : ""}
                        {costs.hasOpen ? " (hors devis / à préciser)" : ""}
                      </b>
                      <span className="font-mono text-base font-semibold text-ink">
                        {eur(
                          (pec === "achat" ? (devLpp?.tarif ?? 0) : 0) +
                            costs.subtotal +
                            (addLivraison ? meta.livraison.price : 0) +
                            (addMad && effMad ? effMad.price : 0) +
                            (addOptionAchat && lcdOption ? lcdOption.price : 0),
                        )}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={copyCodes}
                    className={`mt-3 w-full justify-center ${primary} py-3`}
                  >
                    {copied ? "✓ Codes LPP copiés" : `Copier les ${lpprCodes.length} codes LPP`}
                  </button>

                  {/* Prestations associées : MAD (code auto : niveau + MAD1/MAD2) et forfait de
                      livraison — options cochables, encart bleu, copie dédiée. */}
                  <div className="mt-3 rounded-xl border-2 border-blue-400 bg-blue-50 p-4">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-blue-900/70">
                      Prestations associées
                    </div>

                    {/* En LCD : forfait MAD dédié du Titre I (1213650, FRM/FRE) — MAD1/MAD2
                        sont réservés à l'achat et à la LLD. */}
                    {pec === "lcd" ? (
                      madLcdForfait ? (
                        <div className="border-b border-blue-200 pb-3">
                          <label className="flex cursor-pointer items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={addMad}
                              onChange={(e) => setAddMad(e.target.checked)}
                              className="mt-0.5 h-4 w-4 accent-blue-600"
                            />
                            <span className="text-sm">
                              <b className="text-blue-900">
                                Ajouter le forfait de mise à disposition — MAD LCD
                              </b>
                              <span className="mt-0.5 block text-[12px] text-blue-800/80">
                                Mise à disposition en location courte durée ({device.code}) — au
                                plus une fois par épisode de location.
                              </span>
                            </span>
                          </label>
                          <div className="mt-2.5 flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2">
                              <span className="rounded bg-blue-200/70 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-blue-900">
                                {madLcdForfait.code}
                              </span>
                              <span className="font-mono text-sm font-semibold text-blue-900">
                                {eur(madLcdForfait.price)}
                              </span>
                            </span>
                            <button
                              onClick={copyMad}
                              className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                              {copiedMad ? "✓ Copié" : "Copier le code MAD"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="border-b border-blue-200 pb-3 text-[12px] text-blue-800/80">
                          Pas de forfait MAD en location courte durée pour ce dispositif (
                          {device.code}) : le forfait MAD LCD est réservé aux FRM et FRE (Titre I).
                        </p>
                      )
                    ) : madForfait ? (
                      <div className="border-b border-blue-200 pb-3">
                        <label className="flex cursor-pointer items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={addMad}
                            onChange={(e) => setAddMad(e.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-blue-600"
                          />
                          <span className="text-sm">
                            <b className="text-blue-900">
                              Ajouter le forfait de mise à disposition — MAD
                              {answers.mad === "renouv_id" ? "2" : "1"} niveau {madForfait.niveau}
                            </b>
                            <span className="mt-0.5 block text-[12px] text-blue-800/80">
                              {answers.mad === "renouv_id"
                                ? "Renouvellement à l'identique"
                                : answers.mad === "renouv_cat"
                                  ? "Renouvellement avec changement de catégorie (relève de MAD1)"
                                  : "Première mise à disposition"}{" "}
                              — niveau déterminé par la catégorie retenue ({device.code}).
                            </span>
                          </span>
                        </label>
                        <div className="mt-2.5 flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2">
                            <span className="rounded bg-blue-200/70 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-blue-900">
                              {madForfait.code}
                            </span>
                            <span className="font-mono text-sm font-semibold text-blue-900">
                              {eur(madForfait.price)}
                            </span>
                          </span>
                          <button
                            onClick={copyMad}
                            className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            {copiedMad ? "✓ Copié" : "Copier le code MAD"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="border-b border-blue-200 pb-3 text-[12px] text-blue-800/80">
                        {answers.mad
                          ? `Pas de forfait MAD pour ce dispositif (${device.code} : hors niveaux MAD de la nomenclature).`
                          : "Contexte de mise à disposition non renseigné (question « Mise à disposition » de l'évaluation)."}
                      </p>
                    )}

                    {/* Option d'achat LCD de la catégorie — facturable au terme de la location. */}
                    {pec === "lcd" && lcdOption && (
                      <div className="mt-3 border-b border-blue-200 pb-3">
                        <label className="flex cursor-pointer items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={addOptionAchat}
                            onChange={(e) => setAddOptionAchat(e.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-blue-600"
                          />
                          <span className="text-sm">
                            <b className="text-blue-900">
                              Ajouter l&apos;option d&apos;achat LCD ({device.code})
                            </b>
                            <span className="mt-0.5 block text-[12px] text-blue-800/80">
                              Achat du fauteuil au terme de la location courte durée (Titre I).
                            </span>
                          </span>
                        </label>
                        <div className="mt-2.5 flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2">
                            <span className="rounded bg-blue-200/70 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-blue-900">
                              {lcdOption.code}
                            </span>
                            <span className="font-mono text-sm font-semibold text-blue-900">
                              {eur(lcdOption.price)}
                            </span>
                          </span>
                          <button
                            onClick={copyOption}
                            className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            {copiedOption ? "✓ Copié" : "Copier le code option d'achat"}
                          </button>
                        </div>
                      </div>
                    )}

                    <label className="mt-3 flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={addLivraison}
                        onChange={(e) => setAddLivraison(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-blue-600"
                      />
                      <span className="text-sm">
                        <b className="text-blue-900">Ajouter le forfait de livraison</b>
                        <span className="mt-0.5 block text-[12px] text-blue-800/80">
                          {meta.livraison.label}
                        </span>
                      </span>
                    </label>
                    <div className="mt-2.5 flex items-center justify-between gap-3">
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
                        {copiedLiv ? "✓ Copié" : "Copier le code livraison"}
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

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  className={`${primary} w-full justify-center py-2.5 sm:flex-1`}
                  onClick={() => go("adj")}
                >
                  Modifier les adjonctions
                </button>
                <button
                  className="inline-flex w-full items-center justify-center rounded-lg border border-line bg-card px-4 py-2.5 font-semibold hover:border-petrol hover:text-petrol-deep sm:flex-1"
                  onClick={() => dispatch({ type: "RESET" })}
                >
                  Nouvelle évaluation
                </button>
                <button
                  className={`${finish} w-full justify-center py-2.5 disabled:cursor-wait disabled:opacity-70 sm:flex-1`}
                  onClick={exportPdf}
                  disabled={pdfBusy}
                >
                  {pdfBusy ? "Génération…" : "Aperçu PDF ↗"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <RechercheLpp />

      <ModuleCumul />

      <RechercheVph />

      <footer className="mt-6 border-t border-line pt-4 text-[11.5px] leading-relaxed text-ink-soft/90">
        <b className="text-ink-soft">{meta.disclaimer}</b> Source : {meta.source}. Dernière mise à
        jour : {meta.lastUpdated}.
      </footer>

      {connSource && <InfoConnector source={connSource} />}
    </div>
  );
}

/* ---------------- petits composants utilitaires ---------------- */

/** Ligne SVG animée du bouton survolé (dispositif ou PAP) vers l'encart d'information orange.
 *  L'encart est en position fixe à droite (grand écran) ; on relie sa gauche au bord droit du bouton. */
function InfoConnector({ source }: { source: DOMRect }) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const x1 = source.right; // bord droit exact du bouton
  const y1 = source.top + source.height / 2;
  const x2 = vw / 2 + 401; // bord gauche de l'encart : lg:left-[calc(50%+399px)]
  const y2 = 96; // sous le haut de l'encart : lg:top-16
  const mx = (x1 + x2) / 2;
  const d = `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
  return (
    <svg aria-hidden className="pointer-events-none fixed inset-0 z-[45] h-full w-full">
      <path
        d={d}
        fill="none"
        stroke="#F59E42"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeDasharray="640"
        strokeDashoffset="640"
      >
        <animate attributeName="stroke-dashoffset" from="640" to="0" dur="0.4s" fill="freeze" />
      </path>
    </svg>
  );
}

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
  acquisition,
  dispatch,
  onEnter,
  onLeave,
}: {
  title: string;
  list: Device[];
  duree: Answers["duree"];
  acquisition: Answers["acquisition"];
  dispatch: ReturnType<typeof useWalker>["dispatch"];
  onEnter?: (e: React.MouseEvent<HTMLElement>) => void;
  onLeave?: () => void;
}) {
  const allowed = modesForDuree(duree, acquisition);
  const restriction =
    duree === "temp"
      ? " Seuls les VPH louables en courte durée (LCD) sont proposés."
      : acquisition === "lld"
        ? " Seuls les VPH éligibles à la location longue durée (LLD) sont proposés."
        : "";
  return (
    <Step
      title={title}
      hint={`Choisissez le dispositif correspondant au besoin dominant.${restriction}`}
    >
      {list.length === 0 && (
        <p className="rounded-lg bg-petrol-tint/40 px-3 py-2 text-sm text-ink-soft">
          Aucun dispositif disponible pour ce mode de prise en charge.
        </p>
      )}
      {list.map((d) => {
        const modes = d.modes.filter((m) => allowed.includes(m));
        const ind = deviceIndicationsByCode[d.code] ?? {};
        const entries = modes.map((m) => [m, ind[m]] as const).filter(([, t]) => t);
        return (
          <div
            key={d.code}
            className="group relative"
            onMouseEnter={entries.length > 0 ? onEnter : undefined}
            onMouseLeave={entries.length > 0 ? onLeave : undefined}
          >
            <button
              className={btn}
              onClick={() => {
                onLeave?.();
                dispatch({ type: "CHOOSE_DEVICE", code: d.code });
              }}
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

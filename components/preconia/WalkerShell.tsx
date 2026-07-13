"use client";

/* Shell minimal du walker (session « socle »).
   But : prouver que la machine à états, la navigation et les invariants fonctionnent
   de bout en bout. Le rendu riche par étape (QuestionStep, BesoinsForm, AdjonctionsPanel,
   PapPanel, ResultCard, synthèse copiable) est volontairement reporté à la session UI. */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  adjBrandMap,
  adjGroups,
  besoins,
  classes,
  classesSco,
  deviceModelsByType,
  deviceOptionSheetByToken,
  deviceIndicationsByCode,
  deviceLppByType,
  devices,
  ficheTechniqueByCode,
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
  evaluators,
} from "@/lib/data";
import {
  adaptedCode,
  brandsForBases,
  computeSubtotal,
  deviceAllowedForDuree,
  deviceHasClasses,
  deviceBrandsForToken,
  deviceLpp,
  deviceModelGeneric,
  deviceModelsForBrand,
  hasBrandVariant,
  hasDeviceBrandVariant,
  hasOpenItems,
  lcdForfaitFor,
  lcdOptionAchatFor,
  lldForfaitFor,
  madForfaitFor,
  madLcdFor,
  modesForDuree,
  optionSheetFor,
  prescriberFor,
  type CumulVerdict,
} from "@/lib/rules";
import { eur } from "@/lib/format";
import { RechercheLpp } from "@/components/preconia/RechercheLpp";
import { ModuleCumul } from "@/components/preconia/ModuleCumul";
import { RechercheVph } from "@/components/preconia/RechercheVph";
import { SpecificitesPrescription } from "@/components/preconia/SpecificitesPrescription";
import { ContactToast } from "@/components/preconia/ContactToast";
import { SiteHeader } from "@/components/preconia/SiteHeader";
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
  "block w-full text-left rounded-xl border border-line bg-white/70 px-4 py-3 mb-2 transition-all hover:border-petrol hover:bg-white hover:shadow-[0_8px_20px_-12px_rgba(7,63,60,0.35)]";
/** Bouton de choix : l'état sélectionné remplace le hover (sinon le bouton cliqué restait
    blanc tant que la souris ne quittait pas le bouton — le hover l'emportait sur la sélection). */
const choice = (on: boolean, extra = "") =>
  `block w-full text-left rounded-xl border px-4 py-3 mb-2 transition-all ${extra} ${
    on
      ? "border-petrol bg-petrol-tint/80 shadow-[inset_0_0_0_1px_rgba(12,107,102,0.35),0_8px_20px_-12px_rgba(7,63,60,0.3)]"
      : "border-line bg-white/70 hover:border-petrol hover:bg-white hover:shadow-[0_8px_20px_-12px_rgba(7,63,60,0.35)]"
  }`;
const link = "text-ink-soft hover:text-petrol-deep text-sm";
const navBtn =
  "inline-flex items-center gap-1.5 rounded-xl border border-petrol/40 bg-white/60 px-4 py-2 text-sm font-semibold text-petrol-deep backdrop-blur transition-colors hover:border-petrol hover:bg-petrol-tint/70";
const primary =
  "pc-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white";
const finish =
  "pc-btn-accent inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-white";

function priceLabel(a: Adjonction): string {
  if (a.devis) return "Sur devis";
  if (a.tbd) return "Tarif à préciser";
  return eur(a.price ?? 0);
}

// Propulsion manuelle / podale : fauteuils manuels + cycle (propulsion podale).
const MAN_FAMILIES = ["Manuel non modulaire", "Manuel modulaire", "Cycle"];

/** Supplément appui-tête réglable — non cumulable avec le forfait PAP A (arrêté 06/02/2025, §7). */
const APPUI_TETE_CODE = "4954630";

/* Encarts réglementaires (arrêté du 6 février 2025) — partagés entre le walker et la fiche PDF. */
const CARENCE_LCD =
  "Location courte durée : 26 forfaits hebdomadaires consécutifs au maximum par année glissante. " +
  "Après le dernier forfait facturé, délai de carence d'un an avant tout autre VPH à l'achat neuf " +
  "(hors option d'achat), en LLD ou en nouvelle LCD — sauf épisode de soin dans une indication " +
  "différente, objectivé par une nouvelle prescription (Titre I, 9.6).";
const CARENCE_LLD =
  "Une LLD après une location courte durée n'est possible qu'un an après le dernier forfait LCD " +
  "facturé, sauf épisode de soin dans une indication différente, objectivé par une nouvelle " +
  "prescription (Titre IV, 3.3.2). Prise en charge LLD pour 5 ans (3 ans avant 16 ans), " +
  "renouvelable sur prescription.";
const RENOUV_ANTICIPE =
  "Renouvellement anticipé dérogatoire (art. R. 165-24) : possible avant le terme des 5 ans " +
  "(3 ans avant 16 ans) si le VPH est reconnu irréparable, ou en cas d'évolution rapide de la " +
  "pathologie ou de la morphologie nécessitant une nouvelle catégorie de VPH — sur nouvelle " +
  "prescription ; relève du forfait MAD1.";
const SUR_DEVIS_NOTE =
  "Adjonction « sur devis » (ligne 4550001) : demande d'accord préalable au service médical, " +
  "mention manuscrite obligatoire du prescripteur sur l'ordonnance, essai en conditions réelles " +
  "(7 jours, 48 h minimum à la demande expresse du patient) et confirmation écrite du patient " +
  "(arrêté du 06/02/2025, §7).";
const COUSSINS_NOTE =
  "Les coussins anti-escarres adaptables sur VPH relèvent du Titre I, chapitre 2, section 2 de la " +
  "LPPR (hors nomenclature VPH) — à prescrire séparément.";
const EHPAD_NOTE =
  "Lieu de vie en EHPAD : produits dont le financement est intégré au forfait de soins de " +
  "l'établissement (arrêté du 30 mai 2008) exclus de la prise en charge LPPR individuelle.";

const SCO_PATHOLOGIE_EVOLUTIVE =
  "Pathologie évolutive : la prescription du scooter doit préciser qu'un recours à un fauteuil " +
  "roulant électrique n'est pas envisagé dans l'année qui suit (Titre IV, 4.2).";

/** Note d'éclairage code de la route selon la classe d'usage du scooter (Titre IV, 2.4.2.4). */
function scoEclairageNote(classe: string): string {
  return classe === "C"
    ? "Classe C : le scooter est équipé d'office d'un dispositif d'éclairage conforme au code de la route."
    : `Classe ${classe === "A" ? "A+" : classe} : le bon de commande doit proposer un dispositif d'éclairage conforme au code de la route (Titre IV, 2.4.2.4).`;
}

/** Documents conditionnant le remboursement (achat d'un VPH modulaire / LLD — Titre IV, 3.3.6). */
const DOCUMENTS_CPAM = [
  "Fiche d'évaluation des besoins (4 critères, prise de mesures du patient obligatoire)",
  "Fiche de préconisation (modèle opposable publié par le ministère de la santé)",
  "Certificat de validation des essais (dans les situations requises)",
  "Bon de commande / devis du distributeur au détail (3 exemplaires)",
  "Prescription définitive (consultation post-évaluation, après la phase d'essai)",
];

/** Parcours d'essais requis avant prise en charge, selon le mode et le dispositif. */
function essaisNotes(device: Device, pec: Pec, selectedAdj: Adjonction[]): string[] {
  const notes: string[] = [];
  if (pec === "lcd") {
    notes.push(
      "Essais LCD (2 étapes) : proposition de 4 modèles sur catalogue conformes à la prescription, puis essai pratique comparatif d'au moins 2 modèles (point de vente ou domicile) avec réglages par le distributeur (Titre I, 9.7).",
    );
    if (!device.modular)
      notes.push(
        "FMP / FMPR : essais comparatifs optionnels en cas de prise en charge urgente, sous réserve d'une mention explicite sur l'ordonnance et d'une information au bénéficiaire.",
      );
    if (device.code === "FRE")
      notes.push(
        "FRE : essai préalable pratique en présence d'une équipe pluridisciplinaire, puis certificat d'aptitude à la conduite transmis à la CPAM — condition du déclenchement du remboursement (Titre I, 9.5). Refait au moment de l'option d'achat le cas échéant.",
      );
  } else {
    notes.push(
      "Essais (achat / LLD) : 1) proposition de 4 modèles sur catalogue ; 2) essai pratique comparatif d'au moins 2 modèles réglés par le distributeur (Titre IV, 3.1.4.2).",
    );
    if (device.fiche)
      notes.push(
        "3) Essai en conditions réelles d'utilisation de 7 jours du modèle pré-choisi (réductible à 48 h minimum à la demande expresse du patient) — aucune facturation du fauteuil avant la fin de cette période d'essai (3.1.4.2.3).",
      );
    if (device.electric || device.code === "SCO")
      notes.push(
        "Fauteuil électrique / scooter : essai préalable pratique en présence d'une équipe pluridisciplinaire (aptitude à la conduite, attestée par certificat) avant ces étapes ; remise au patient d'une fiche cosignée rappelant les règles d'utilisation, d'assurance, de vitesse et d'entretien.",
      );
  }
  if (selectedAdj.some((a) => a.group === "aap"))
    notes.push(
      "AAP : essai pratique préalable par une équipe pluridisciplinaire + certificat d'adéquation ; prescription par un médecin MPR, un titulaire d'un DU Appareillage, un médecin spécialiste (hors médecine générale) d'un établissement ou service, ou un ergothérapeute en équipe pluridisciplinaire (§7.1.1.1).",
    );
  return notes;
}

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

/** Sections de la page d'accueil, pour la barre d'ancrage sous le titre. */
export function WalkerShell() {
  const { state, dispatch } = useWalker();
  const { stage, answers } = state;
  const device = selectDevice(state);

  const go = (s: Stage) => dispatch({ type: "GO", stage: s });

  // Entrée dans le parcours : balayage de « / » verts sous la barre d'ancrage,
  // le changement d'étape se fait à couvert, au cœur du passage des barres.
  const [wiping, setWiping] = useState(false);
  const startWalk = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return go("age");
    setWiping(true);
    window.setTimeout(() => go("age"), 700);
    window.setTimeout(() => setWiping(false), 1700);
  };

  // Mode parcours : masque le contenu éditorial rendu hors du walker (FAQ, footer)
  // via body[data-walker="on"] (les modules, eux, sont conditionnés par stage).
  useEffect(() => {
    if (stage !== "home") document.body.setAttribute("data-walker", "on");
    else document.body.removeAttribute("data-walker");
    return () => document.body.removeAttribute("data-walker");
  }, [stage]);

  // À chaque changement d'étape, on remonte en haut de page.
  const prevStage = useRef(stage);
  useEffect(() => {
    if (prevStage.current === stage) return;
    prevStage.current = stage;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [stage]);
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
  const [cumulVerdict, setCumulVerdict] = useState<CumulVerdict | null>(null);

  // En LCD, adjonctions et PAP ne sont JAMAIS facturés à part : ils sont couverts par le
  // forfait hebdomadaire de location (arrêté du 06/02/2025, §7 et 9.3). On les laisse
  // cochables pour documenter le besoin sur la fiche, sans code ni tarif.
  const billAdj = pec !== "lcd";
  // Appui-tête réglable et forfait PAP A (membre supérieur) non cumulables (§7) :
  // si le forfait A est déclenché, l'appui-tête sort de la facturation.
  const forfaitAActive = forfaits.includes("A");
  const selectedAdjBill = forfaitAActive
    ? selectedAdj.filter((a) => a.code !== APPUI_TETE_CODE)
    : selectedAdj;
  const appuiTeteDropped =
    billAdj && forfaitAActive && selectedAdj.some((a) => a.code === APPUI_TETE_CODE);
  const subtotalBill = billAdj ? computeSubtotal(selectedAdjBill, forfaits, papForfaits) : 0;
  const hasOpenBill = billAdj && hasOpenItems(selectedAdjBill);
  const costsBill = { ...costs, subtotal: subtotalBill, hasOpen: hasOpenBill };
  // Sélections à documenter « incluses au forfait » (LCD) : adjonctions + PAP cochés.
  const papChecked = Object.keys(state.pap).filter((k) => state.pap[k]);
  const incluses =
    pec === "lcd" ? [...selectedAdj.map((a) => a.name), ...papChecked] : [];

  // Palier de prescripteur selon le mode (LCD manuelle : + kinésithérapeute ; LCD FRE :
  // palier restreint + certificat ; renouvellement à l'identique : généraliste ou ergo).
  const prescLine = device ? prescriberFor(device, pec, answers.mad, prescribers) : "";

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
  // En LCD, adjonctions et PAP sont inclus au forfait hebdomadaire : aucun code facturable.
  const lpprCodes = [
    ...(deviceLine ? [deviceLine] : []),
    ...(billAdj
      ? forfaits.map((f) => ({
          code: adaptedCode(papForfaits[f].code, brand, adjBrandMap),
          label: papForfaits[f].label,
        }))
      : []),
    ...(billAdj ? selectedAdjBill : []).map((a) => ({
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
  // Encart d'information au survol (indication officielle d'un dispositif, définition
  // d'un PAP) : hissé hors du panneau en verre — backdrop-filter fait du panneau le
  // conteneur des position:fixed, qui seraient sinon projetés hors cadre et rognés.
  const [hoverInfo, setHoverInfo] = useState<{ title: string; body: React.ReactNode } | null>(
    null,
  );

  // ---- Export PDF de la fiche récapitulative ----
  // Construit un objet purement sérialisable depuis l'état courant (aucune logique dans le PDF).
  const buildFicheData = (): FicheData => {
    const dev = device!;
    const allowedModes = modesForDuree(answers.duree, answers.acquisition);

    const profile: { k: string; v: string }[] = facets(answers)
      .filter((f) => f.v)
      .map((f) => ({ k: f.k, v: f.v as string }));
    if (deviceHasClasses(dev) && answers.classe)
      profile.push({
        k: "Classe",
        v:
          (dev.code === "SCO" ? classesSco : classes).find((c) => c.value === answers.classe)
            ?.label ?? `Classe ${answers.classe}`,
      });
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
    if (dev.code === "SCO") {
      if (answers.aptitude === "non")
        flags.push(
          "SCOOTER NON INDIQUÉ : la maîtrise de la conduite par l'utilisateur est une condition de l'indication (3.1.3.5) et le certificat d'aptitude conditionne le remboursement (3.1.5) — pas d'exception « commande accompagnant ». Orienter vers un FREP/FREV le cas échéant.",
        );
      flags.push(SCO_PATHOLOGIE_EVOLUTIVE);
      if (answers.classe) flags.push(scoEclairageNote(answers.classe));
    }
    if (dev.electric || dev.code === "SCO")
      flags.push(
        `Le lieu de vie doit permettre le stockage et la recharge du ${dev.code === "SCO" ? "scooter" : "fauteuil électrique"} (Titre IV, 3.1.5).`,
      );
    if (pec === "lcd") flags.push(CARENCE_LCD);
    if (pec === "lld") flags.push(CARENCE_LLD);
    if (addOptionAchat && lcdOption)
      flags.push(
        "Option d'achat LCD : possible uniquement au terme des 26 semaines de location consécutives, sur décision du prescripteur (Titre I, 9.3). Garantie pièces et main-d'œuvre, assistance technique et dépannage inclus pendant 2 ans à compter du premier forfait de LCD (6.1.1) ; renouvellement du fauteuil acquis possible 5 ans après le début de la location, période de LCD incluse (3.1.6)." +
          (dev.code === "FRE"
            ? " FRE : nouvel essai préalable et certificat d'aptitude à la conduite requis au moment de l'option d'achat (9.5)."
            : ""),
      );
    if (appuiTeteDropped)
      flags.push(
        "Supplément appui-tête réglable retiré de la facturation : non cumulable avec le forfait PAP A — le positionnement cervico-céphalique y est déjà couvert (§7).",
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

    // En LCD : adjonctions/PAP inclus au forfait hebdomadaire, aucune ligne facturable.
    // Chaque ligne porte le code générique (ligne mère de la nomenclature) ET, si la marque
    // choisie a une variante inscrite, son code constructeur (le code facturé).
    const forfaitsData = billAdj
      ? forfaits.map((f) => {
          const gen = papForfaits[f].code;
          const hit = hasBrandVariant(gen, brand, adjBrandMap);
          return {
            code: hit ? adaptedCode(gen, brand, adjBrandMap) : gen,
            codeGenerique: gen,
            codeMarque: hit ? adaptedCode(gen, brand, adjBrandMap) : null,
            forfait: f,
            label: papForfaits[f].label,
            price: papForfaits[f].price,
          };
        })
      : [];

    const adjData = (billAdj ? selectedAdjBill : []).map((a) => {
      const hit = hasBrandVariant(a.code, brand, adjBrandMap);
      return {
        code: hit ? adaptedCode(a.code, brand, adjBrandMap) : a.code,
        codeGenerique: a.code,
        codeMarque: hit ? adaptedCode(a.code, brand, adjBrandMap) : null,
        name: a.name,
        price: priceLabel(a),
        open: !!(a.devis || a.tbd),
      };
    });

    const papData = billAdj
      ? papRegions.flatMap((r) =>
          r.items
            .filter((it) => state.pap[it.name])
            .map((it) => ({
              name: it.name,
              forfait: r.forfait,
              code: adaptedCode(papForfaits[r.forfait].code, brand, adjBrandMap),
              info: it.info,
            })),
        )
      : [];

    const extras =
      (addLivraison ? meta.livraison.price : 0) +
      (addMad && effMad ? effMad.price : 0) +
      (addOptionAchat && lcdOption ? lcdOption.price : 0);
    // Achat : total avec le fauteuil. Location : total des seuls éléments ponctuels, le forfait
    // de location (périodique) restant affiché à part — jamais mélangé au total.
    const total =
      pec === "achat"
        ? devLpp?.tarif != null
          ? devLpp.tarif + subtotalBill + extras
          : null
        : subtotalBill + extras > 0
          ? subtotalBill + extras
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
        presc: prescLine,
        evaluation: evaluators[dev.eval],
        fiche: dev.fiche,
        dap: dev.dap,
      },
      profile,
      flags,
      vph,
      marque: brand,
      technique: ficheTechniqueByCode[dev.code]?.rows ?? [],
      forfaits: forfaitsData,
      adjonctions: adjData,
      pap: papData,
      incluses,
      essais: essaisNotes(dev, pec, selectedAdj),
      documents:
        pec === "lld" || (pec === "achat" && dev.fiche) ? DOCUMENTS_CPAM : [],
      optionAchat:
        addOptionAchat && lcdOption
          ? { code: lcdOption.code, label: lcdOption.label, price: lcdOption.price }
          : null,
      livraison: addLivraison
        ? { code: meta.livraison.code, label: meta.livraison.label, price: meta.livraison.price }
        : null,
      mad: addMad && effMad ? { code: effMad.code, label: effMad.label, price: effMad.price } : null,
      totals: {
        subtotal: subtotalBill,
        hasOpen: hasOpenBill,
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
      win.document.title = `Récapitulatif ${device.code}`;
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
    <>
    <SiteHeader />
    <div className="relative z-10 mx-auto max-w-[790px] px-5 pb-16 pt-7">
      {/* Hero éditorial — accueil uniquement : identité, promesse, preuves d'officialité.
          En cours de parcours, l'écran reste compact (header fixe + fil des réponses). */}
      {stage === "home" && (
        <section className="pc-wordmark-rise pb-9 pt-4">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-petrol">
            ▸ Nomenclature VPH 2025 — arrêté du 6 février 2025
          </div>
          <h1 className="mt-3 text-[28px] font-bold leading-[1.12] tracking-tight sm:text-[38px]">
            La prescription des fauteuils roulants,
            <br />
            <span className="pc-accent-breathe inline-block text-petrol">
              de l&apos;évaluation à la facturation.
            </span>
          </h1>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
            Du patient au dispositif : catégorie et classe, prescripteur habilité, codes LPP et
            tarifs, adjonctions et positionnement, forfaits de mise à disposition et de
            livraison — jusqu&apos;à la fiche récapitulative exportable en PDF.
          </p>
        </section>
      )}

      {stage !== "home" &&
        (() => {
          const steps = facets(answers);
          const done = steps.filter((f) => f.v).length;
          const currentIdx = steps.findIndex((f) => !f.v);
          return (
            <div
              className="my-5"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={done}
              aria-label="Progression du parcours"
            >
              <div className="pc-progress-track">
                <div
                  className="pc-progress-fill"
                  style={{ width: `${Math.max(6, (done / steps.length) * 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                {steps.map((f, i) => (
                  <div
                    key={f.k}
                    className={`rounded-lg px-2 py-1.5 text-center ${
                      f.v
                        ? "pc-band text-white"
                        : i === currentIdx
                          ? "pc-progress-current border border-petrol/60 bg-white/70"
                          : "border border-dashed border-line bg-white/40"
                    }`}
                  >
                    <span
                      className={`block truncate font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em] ${
                        f.v ? "text-white/65" : "text-ink-soft/70"
                      }`}
                    >
                      {f.k}
                    </span>
                    <span
                      className={`block truncate text-[11.5px] font-semibold leading-tight ${
                        f.v ? "text-white" : i === currentIdx ? "text-petrol-deep" : "text-ink-soft/50"
                      }`}
                      title={f.v ?? undefined}
                    >
                      {f.v ?? "…"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      {/* wrapper relatif : l'encart « Sources officielles » (absolu à droite) s'aligne
          sur le sommet du panneau du walker et défile avec la page. */}
      <div className="relative">
      <div
        id="preconisation"
        className="scroll-mt-4 overflow-hidden pc-panel"
      >
        <div className="h-[3px] bg-gradient-to-r from-petrol-deep via-petrol to-orange-500" />
        <div key={stage} className="pc-step-in px-6 py-6">
          {/* ---------------- HOME ---------------- */}
          {stage === "home" && (
            <>
              <div className="pc-band -mx-6 -mt-6 mb-5 px-6 py-4">
                <h1 className="text-lg font-semibold text-white">
                  <span className="mr-2 font-mono text-[13px] font-semibold text-white/55">01</span>
                  Prescription &amp; préconisation d&apos;un fauteuil roulant (VPH)
                </h1>
                <p className="mt-1 text-sm leading-relaxed text-petrol-tint">
                  Un parcours guidé pour la sélection d&apos;un VPH, étape par étape.
                </p>
              </div>
              <button className={`${primary} pc-btn-sweep w-full justify-center`} onClick={startWalk}>
                Débuter le parcours guidé
              </button>
              <div className="mt-4 rounded-xl border border-line bg-paper/40 p-3.5 text-[11.5px] leading-relaxed text-ink-soft">
                <b className="text-ink">Période transitoire (arrêté du 06/02/2025).</b> Les VPH
                conformes à l&apos;ancien Titre IV et prescrits avant le 01/12/2025 restent
                vendables ou louables jusqu&apos;au <b>01/12/2026</b> (art. 2) ; les anciens codes
                de location ≥ 52 semaines (1255682, 1232988, 1240976) restent facturables
                jusqu&apos;au <b>30/11/2027</b> ; les spécifications techniques des fauteuils à la
                location s&apos;appliquent au 01/12/2026 (art. 3). La prise en charge des VPH remis
                en bon état d&apos;usage (RBEU) est annoncée mais son arrêté d&apos;application
                n&apos;est pas encore publié.
              </div>
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

                  {cumulVerdict === "autorise" && (
                    <button
                      className={`${primary} mt-3 w-full justify-center`}
                      onClick={() => go("duree")}
                    >
                      Cumul autorisé — poursuivre l&apos;évaluation →
                    </button>
                  )}
                  {cumulVerdict === "derogation" && (
                    <button
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700"
                      onClick={() => go("duree")}
                    >
                      Poursuivre au titre de la dérogation (Titre IV, 4.1) →
                    </button>
                  )}
                  {cumulVerdict === "interdit" && (
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
            <Step
              title="Âge du patient"
              hint="Seuil réglementaire de la nomenclature : conditionne l'accès aux poussettes (moins de 16 ans) et les durées de prise en charge — renouvellement, MAD1, livraison : 5 ans, ramenés à 3 ans avant 16 ans."
            >
              <button
                className={choice(answers.age === "adulte")}
                onClick={() => {
                  setAnswer("age", "adulte");
                  go("mad");
                }}
              >
                16 ans et plus
              </button>
              <button
                className={choice(answers.age === "enfant")}
                onClick={() => {
                  setAnswer("age", "enfant");
                  go("mad");
                }}
              >
                Moins de 16 ans
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
              <Flag>{CARENCE_LCD}</Flag>
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
              <Flag>{CARENCE_LLD}</Flag>
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
              <Flag>{RENOUV_ANTICIPE}</Flag>
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
              onInfo={setHoverInfo}
            />
          )}
          {stage === "cfg_elec" && (
            <DeviceChoice
              title="Configuration électrique"
              list={devices
                // scooters modulaires (SCO) : propulsion électrique, achat uniquement —
                // le filtre par mode les retire de lui-même des parcours LCD et LLD.
                .filter((d) => d.family === "Électrique" || d.family === "Scooter")
                .filter((d) => deviceAllowedForDuree(d, answers.duree, answers.acquisition))}
              duree={answers.duree}
              acquisition={answers.acquisition}
              dispatch={dispatch}
              onInfo={setHoverInfo}
            />
          )}

          {/* ---------------- BESOINS ---------------- */}
          {stage === "besoins" && device && (
            <Step
              title="Besoins & environnement"
              hint="D'après la fiche d'évaluation des besoins 2026."
            >
              {deviceHasClasses(device) && (
                <div className="mb-4">
                  <div className="mb-2 text-sm font-semibold">
                    {device.code === "SCO"
                      ? "Classe d'usage du scooter"
                      : "Classe du fauteuil électrique"}
                  </div>
                  {(device.code === "SCO" ? classesSco : classes).map((c) => (
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
                .filter((f) => !(device.code === "SCO" && f.id === "aptitude"))
                .map((f) => (
                  <BesoinFieldRow key={f.id} field={f} answers={answers} onSet={setAnswer} />
                ))}

              {/* Aptitude à la conduite — variante scooter : condition de l'indication
                  (3.1.3.5), pas d'exception « commande accompagnant ». */}
              {device.code === "SCO" && (
                <div className="mb-4">
                  <div className="mb-2 text-sm font-semibold">
                    Aptitude à conduire le scooter
                    <span className="ml-1.5 font-normal text-ink-soft">
                      · marche stable sur quelques mètres, équilibre assis sans aide à la posture,
                      transferts autonomes, membres supérieurs et cognition suffisants (3.1.3.5)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { v: "oui", t: "Apte à conduire" },
                        { v: "non", t: "Inapte à la conduite" },
                      ] as const
                    ).map((o) => (
                      <button
                        key={o.v}
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                          answers.aptitude === o.v
                            ? "border-petrol bg-petrol text-white"
                            : "border-line bg-card hover:border-petrol"
                        }`}
                        onClick={() => setAnswer("aptitude", o.v)}
                      >
                        {o.t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {answers.aptitude === "non" &&
                (device.code === "SCO" ? (
                  <div className="my-3 rounded-lg border-2 border-red-400 bg-red-50 px-3 py-3 text-sm leading-relaxed text-red-800">
                    <b>Scooter non indiqué.</b> La maîtrise de la conduite par l&apos;utilisateur
                    est une condition de l&apos;indication (3.1.3.5) et le certificat
                    d&apos;aptitude conditionne le remboursement (3.1.5) — il n&apos;existe pas
                    d&apos;exception « commande accompagnant » pour les scooters. Orienter vers un
                    FREP/FREV le cas échéant.
                  </div>
                ) : (
                  <Flag>
                    <b>Conduite par tierce personne.</b> Inaptitude à la conduite (sensorielle,
                    motrice ou cognitive) → commande pour l&apos;accompagnant (FREP/FREV, exception
                    nomenclature).
                  </Flag>
                ))}

              {(device.electric || device.code === "SCO") && (
                <p className="mb-1 mt-2 text-[11.5px] leading-relaxed text-ink-soft/90">
                  Le lieu de vie doit permettre le stockage et la recharge du{" "}
                  {device.code === "SCO" ? "scooter" : "fauteuil électrique"} — à intégrer à
                  l&apos;évaluation des besoins et à la préconisation (Titre IV, 3.1.5).
                </p>
              )}

              <p className="mb-1 mt-2 text-[11.5px] leading-relaxed text-ink-soft/90">{EHPAD_NOTE}</p>

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
                    className="w-full rounded-lg border-2 border-orange-300 bg-card px-3 py-2.5 text-sm font-medium text-petrol-deep outline-none transition-colors focus:border-orange-500"
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
                        className="w-full rounded-lg border-2 border-orange-300 bg-card px-3 py-2.5 text-sm font-medium text-petrol-deep outline-none transition-colors focus:border-orange-500"
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

              {pec === "lcd" && (
                <div className="mb-4 rounded-xl border-2 border-cyan-500 bg-cyan-100/60 p-3.5 text-[12px] leading-relaxed text-cyan-900">
                  <b>Adjonctions &amp; PAP en location courte durée :</b> ils sont inclus dans le
                  forfait hebdomadaire de location et ne peuvent pas être facturés séparément
                  (arrêté du 06/02/2025, §7 et 9.3). Cochez ci-dessous ce qui est nécessaire pour
                  le documenter sur la fiche — le prestataire doit le fournir dans le forfait.
                </div>
              )}

              <h3 className="mb-3 mt-1 text-lg font-semibold tracking-tight">
                {pec === "lcd" ? "Adjonctions à prévoir (incluses au forfait)" : "Adjonctions facturables"}
              </h3>

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
                    {items.map((item) => {
                      // Appui-tête ↔ forfait PAP A non cumulables (§7) : case désactivée
                      // tant que le forfait A est déclenché par une sélection PAP.
                      const blocked =
                        billAdj && item.code === APPUI_TETE_CODE && forfaitAActive;
                      const btn = (
                        <button
                          disabled={blocked}
                          className={
                            blocked
                              ? "mb-2 block w-full rounded-lg border border-line bg-paper/60 px-4 py-3 text-left opacity-60"
                              : choice(!!state.adj[item.code], "flex items-start justify-between gap-3")
                          }
                          onClick={blocked ? undefined : () => dispatch({ type: "TOGGLE_ADJ", item })}
                        >
                          <span>
                            <b className="block">{item.name}</b>
                            {billAdj ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className="rounded bg-petrol-tint px-1.5 py-0.5 font-mono text-[11px] font-semibold text-petrol-deep">
                                  {adaptedCode(item.code, brand, adjBrandMap)}
                                </span>
                                {brand && !hasBrandVariant(item.code, brand, adjBrandMap) && (
                                  <span className="text-[10px] text-ink-soft">générique</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[11px] text-cyan-800">
                                incluse au forfait hebdomadaire de location
                              </span>
                            )}
                            {blocked && (
                              <span className="mt-1 block text-[11px] text-amber">
                                Non cumulable avec le forfait PAP A : le positionnement
                                cervico-céphalique y est déjà couvert (§7).
                              </span>
                            )}
                          </span>
                          {billAdj && !blocked && (
                            <span
                              className={`whitespace-nowrap font-mono text-sm font-semibold ${
                                item.devis || item.tbd ? "text-amber" : "text-petrol-deep"
                              }`}
                            >
                              {priceLabel(item)}
                            </span>
                          )}
                        </button>
                      );
                      return <div key={item.code}>{btn}</div>;
                    })}
                  </div>
                ))}

              {billAdj && compatAdj.some((a) => a.devis) && (
                <p className="mb-3 mt-1 rounded-lg border border-amber/30 bg-amber-tint px-3 py-2 text-[11.5px] leading-relaxed text-[#5c3208]">
                  {SUR_DEVIS_NOTE}
                </p>
              )}
              {appuiTeteDropped && (
                <Flag>
                  <b>Appui-tête réglable retiré de la facturation.</b> Il n&apos;est pas cumulable
                  avec le forfait PAP A — le positionnement cervico-céphalique y est déjà couvert
                  (§7). Décochez les PAP du forfait A pour le facturer seul.
                </Flag>
              )}

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
                        className="border-t border-line-soft"
                        onMouseEnter={
                          it.info ? () => setHoverInfo({ title: it.name, body: it.info }) : undefined
                        }
                        onMouseLeave={it.info ? () => setHoverInfo(null) : undefined}
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
                      </div>
                    ))}
                  </details>
                ))
              ) : (
                <p className="rounded-lg bg-petrol-tint/40 px-3 py-2 text-sm text-ink-soft">
                  {device.code === "SCO"
                    ? "Scooter : les produits d'aide au positionnement ne s'appliquent pas — l'indication exige un équilibre suffisant pour maintenir la position assise sans aide technique à la posture (3.1.3.5). Un besoin de positionnement oriente vers un FREP/FREV."
                    : "Dispositif non modulaire : les PAP ne s'appliquent pas."}
                </p>
              )}

              <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft/90">{COUSSINS_NOTE}</p>

              {billAdj && (selectedAdjBill.length > 0 || forfaits.length > 0) && (
                <Subtotal costs={costsBill} />
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
                {deviceHasClasses(device) && answers.classe && (
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                    {(device.code === "SCO" ? classesSco : classes).find(
                      (c) => c.value === answers.classe,
                    )?.label ?? `Classe ${answers.classe}`}
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
                <Cell full label="Prescripteur (qui signe l'ordonnance)">{prescLine}</Cell>
                <Cell full label="Évaluation des besoins &amp; fiche de préconisation">
                  {evaluators[device.eval]}
                </Cell>
                <Cell full label="Accord préalable">
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
              {device.code === "SCO" && answers.aptitude === "non" && (
                <div className="my-3 rounded-lg border-2 border-red-400 bg-red-50 px-3 py-3 text-sm leading-relaxed text-red-800">
                  <b>Scooter non indiqué.</b> La maîtrise de la conduite par l&apos;utilisateur est
                  une condition de l&apos;indication (3.1.3.5) et le certificat d&apos;aptitude
                  conditionne le remboursement (3.1.5) — pas d&apos;exception « commande
                  accompagnant ». Orienter vers un FREP/FREV le cas échéant.
                </div>
              )}
              {device.code === "SCO" && (
                <>
                  <Flag>{SCO_PATHOLOGIE_EVOLUTIVE}</Flag>
                  {answers.classe && <Flag>{scoEclairageNote(answers.classe)}</Flag>}
                </>
              )}
              {(device.electric || device.code === "SCO") && (
                <Flag>
                  Le lieu de vie doit permettre le <b>stockage et la recharge</b> du{" "}
                  {device.code === "SCO" ? "scooter" : "fauteuil électrique"} — à intégrer à
                  l&apos;évaluation des besoins et à la préconisation (Titre IV, 3.1.5).
                </Flag>
              )}
              {pec === "lcd" && <Flag>{CARENCE_LCD}</Flag>}
              {pec === "lld" && <Flag>{CARENCE_LLD}</Flag>}

              {/* Parcours d'essais requis avant prise en charge (arrêté du 06/02/2025). */}
              <div className="my-4 rounded-xl border border-petrol/30 bg-petrol-tint/30 p-4">
                <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-petrol-deep">
                  Essais requis avant prise en charge
                </h4>
                <ul className="list-disc space-y-1 pl-4 text-[12.5px] leading-relaxed text-ink">
                  {essaisNotes(device, pec, selectedAdj).map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>

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
                  {billAdj &&
                    forfaits.map((f) => (
                      <Line
                        key={f}
                        code={adaptedCode(papForfaits[f].code, brand, adjBrandMap)}
                        label={papForfaits[f].label}
                        value={eur(papForfaits[f].price)}
                      />
                    ))}
                  {billAdj &&
                    selectedAdjBill.map((a) => (
                      <Line
                        key={a.code}
                        code={adaptedCode(a.code, brand, adjBrandMap)}
                        label={a.name}
                        value={priceLabel(a)}
                        open={!!(a.devis || a.tbd)}
                      />
                    ))}
                  {/* LCD : adjonctions & PAP documentés mais couverts par le forfait hebdo (§7). */}
                  {pec === "lcd" && incluses.length > 0 && (
                    <div className="my-2 rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2">
                      <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-cyan-800">
                        Inclus dans le forfait de location (non facturables séparément)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {incluses.map((n) => (
                          <span
                            key={n}
                            className="rounded border border-cyan-200 bg-white px-2 py-0.5 text-xs text-cyan-900"
                          >
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {appuiTeteDropped && (
                    <p className="my-2 rounded-lg border border-amber/30 bg-amber-tint px-3 py-2 text-[11.5px] leading-relaxed text-[#5c3208]">
                      Appui-tête réglable non facturé : non cumulable avec le forfait PAP A (§7).
                    </p>
                  )}
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
                  {billAdj && (selectedAdjBill.length > 0 || forfaits.length > 0) && (
                    <Subtotal costs={costsBill} />
                  )}
                  {(pec === "achat"
                    ? devLpp?.tarif != null
                    : subtotalBill +
                        (addLivraison ? meta.livraison.price : 0) +
                        (addMad && effMad ? effMad.price : 0) +
                        (addOptionAchat && lcdOption ? lcdOption.price : 0) >
                      0) && (
                    <div className="mt-2 flex items-center justify-between rounded-lg bg-ink/5 px-4 py-3">
                      <b className="text-sm text-ink">
                        Total indicatif
                        {pec !== "achat" ? " hors forfait de location" : ""}
                        {hasOpenBill ? " (hors devis / à préciser)" : ""}
                      </b>
                      <span className="font-mono text-base font-semibold text-ink">
                        {eur(
                          (pec === "achat" ? (devLpp?.tarif ?? 0) : 0) +
                            subtotalBill +
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
                            <span className="mt-0.5 block text-[12px] leading-relaxed text-blue-800/80">
                              Acquisition du fauteuil déjà loué, possible uniquement{" "}
                              <b>au terme des 26 semaines de location consécutives</b>, sur
                              décision du prescripteur (Titre I, 9.3). Inclut la garantie pièces
                              et main-d&apos;œuvre, l&apos;assistance technique et le dépannage
                              pendant <b>2 ans à compter du premier forfait de LCD</b> (6.1.1).
                              Renouvellement du fauteuil acquis possible 5 ans après le début de
                              la location, période de LCD incluse (3.1.6).
                              {device.code === "FRE" &&
                                " FRE : nouvel essai préalable et certificat d'aptitude à la conduite requis au moment de l'option d'achat (9.5)."}
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
                  {pdfBusy ? "Génération…" : "Fiche récapitulative (PDF) ↗"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Liens officiels (opposables) — visibles uniquement sur l'accueil : une fois le
          walker lancé, l'emplacement de droite est réservé aux indications officielles
          (encart orange animé). Sur mobile, l'encart s'insère sous le walker. */}
      {stage === "home" && (
        <aside
          aria-label="Sources officielles"
          className="mt-5 overflow-hidden pc-panel lg:absolute lg:left-[calc(100%+16px)] lg:top-0 lg:mt-0 lg:w-[min(26rem,calc((100vw-790px)/2-32px))]"
        >
          <div className="pc-band-accent px-5 py-3">
            <h2 className="text-base font-semibold text-white">Sources officielles</h2>
          </div>
          <div className="p-4">
            {[
              {
                href: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000051141909",
                title: "Arrêté du 6 février 2025",
              },
              {
                href: "https://nomenclature-fauteuil-roulant.fr",
                title: "Site officiel FEDEPSAD et UNPDM",
              },
              {
                href: "https://nomenclature-fauteuil-roulant.fr/Fiche-evaluation-des-besoins-VPH.pdf",
                title: "Fiche d'évaluation des besoins",
              },
              {
                href: "https://nomenclature-fauteuil-roulant.fr/Fiche-de-preconisation-VPH.pdf",
                title: "Fiche de préconisation",
              },
              {
                href: "https://nomenclature-fauteuil-roulant.fr/PDF_Nomenclature/Documents_Def/Formulaire-engagement-usagers-VPH.pdf",
                title: "Formulaire d'engagement de restitution",
              },
              {
                href: "https://mobile.cerahtec.fr/doc/lppr_nn.pdf",
                title: "Liste CERAH des VPH inscrits",
              },
              {
                href: "http://www.codage.ext.cnamts.fr/codif/tips//chapitre/index_chap.php?p_ref_menu_code=1&p_site=AMELI",
                title: "Base LPP — CNAMTS",
              },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 block rounded-lg border border-line bg-card px-4 py-3 transition-colors last:mb-0 hover:border-orange-500 hover:bg-orange-50"
              >
                <b className="block text-sm">{l.title}</b>
              </a>
            ))}
          </div>
        </aside>
      )}
      {hoverInfo && (
        <div
          aria-hidden
          className="pc-fade-side pointer-events-none hidden rounded-xl border-2 border-orange-400 bg-orange-50 p-4 text-[13px] leading-relaxed text-orange-900 shadow-xl lg:fixed lg:left-[calc(50%+411px)] lg:top-[128px] lg:z-40 lg:block lg:w-[min(26rem,calc((100vw-790px)/2-32px))]"
        >
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-orange-700">
            {hoverInfo.title}
          </div>
          {hoverInfo.body}
        </div>
      )}
      </div>

      {stage === "home" && (
      <>
      <div id="recherche-lppr" className="scroll-mt-4">
        <RechercheLpp />
      </div>

      <div id="cumul" className="scroll-mt-4">
        <ModuleCumul />
      </div>

      <div id="recherche-vph" className="scroll-mt-4">
        <RechercheVph />
      </div>

      <div id="specificites-prescription" className="scroll-mt-4">
        <SpecificitesPrescription />
      </div>
      </>
      )}


      <ContactToast />
    </div>
    {wiping && (
      <div className="pc-wipe" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            style={{ left: `${i * 16}%`, animationDelay: `${i * 75}ms`, opacity: 1 - i * 0.06 }}
          />
        ))}
      </div>
    )}
    </>
  );
}

/* ---------------- petits composants utilitaires ---------------- */


function Step({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <>
      {/* bandeau de titre vert pleine largeur (déborde du padding de la carte via -mx/-mt),
          cohérent avec les moteurs de recherche. */}
      <div className="pc-band -mx-6 -mt-6 mb-5 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {hint && <p className="mt-1 text-sm leading-relaxed text-petrol-tint">{hint}</p>}
      </div>
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
  onInfo,
}: {
  title: string;
  list: Device[];
  duree: Answers["duree"];
  acquisition: Answers["acquisition"];
  dispatch: ReturnType<typeof useWalker>["dispatch"];
  /** encart latéral « indication officielle » au survol (null = masquer). */
  onInfo: (info: { title: string; body: React.ReactNode } | null) => void;
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
        const info =
          entries.length > 0
            ? {
                title: "Indication officielle de prise en charge",
                body: (
                  <>
                    {entries.map(([m, t]) => (
                      <p key={m} className="mb-2 last:mb-0">
                        <span className="font-semibold">{m} — </span>
                        {t}
                      </p>
                    ))}
                  </>
                ),
              }
            : null;
        return (
          <div
            key={d.code}
            onMouseEnter={info ? () => onInfo(info) : undefined}
            onMouseLeave={info ? () => onInfo(null) : undefined}
          >
            <button
              className={btn}
              onClick={() => {
                onInfo(null);
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

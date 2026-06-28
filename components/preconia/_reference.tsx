import React, { useState, useMemo, useEffect } from "react";

/* PRECONIA v4 — Aide à la préconisation des VPH (MPR)
   Socle : nomenclature VPH 2025 + fiche d'évaluation des besoins + fiche de préconisation 2026.
   Aide à la décision NON opposable. Ne remplace ni l'essai réel ni l'évaluation ergothérapique. */

const MAJ = "28 juin 2026";

/* ---------------- GROUPES DE COMPATIBILITÉ ---------------- */
const MAN_MOD = ["FRM", "FRMA", "FRMC", "FRMP", "FRMV", "FRMS"];
const ELEC = ["FRE", "FREP", "FREV"];
const MODULAR = ["FRM", "FRMA", "FRMC", "FRMP", "FRMV", "FRMS", "FRE", "FREP", "FREV", "POU_MRE"];
const BROAD = [...MAN_MOD, ...ELEC, "POU_MRE"];
const FICHE = new Set(["FRM", "FRMC", "FRMA", "FRMS", "FRMP", "FRMV", "FRE", "FREP", "FREV", "POU_MRE", "CYC", "SCO"]);

/* ---------------- PRESCRIPTEURS (3 paliers, fiches 2026) ---------------- */
const PRESC = {
  large: "Tout médecin ou ergothérapeute (n'exerçant ni comme fournisseur, ni pour son compte)",
  spe: "Prescripteur compétent : médecin MPR, DU appareillage, ou médecin spécialiste (hors médecine générale) en établissement/service",
  pluri: "Équipe pluridisciplinaire constituée au minimum d'un médecin MPR",
};

/* ---------------- DISPOSITIFS ---------------- */
const DEV = {
  FMP: { code: "FMP", fam: "Manuel non modulaire", name: "Fauteuil manuel pliant",
    modes: ["ACHAT", "LCD"], presc: "large", dap: false, modular: false, fiche: false,
    indic: ["Incapacité de marche partielle ou totale", "Assise souple, usage standard", "Propulsion bilatérale par main courante ou à pousser"],
    ft: ["Châssis pliant, appui de bascule accompagnant", "Toile souple (siège et dossier), démontable", "Mains courantes section > 200 mm²"] },
  FMPR: { code: "FMPR", fam: "Manuel non modulaire", name: "Fauteuil manuel pliant rigide",
    modes: ["ACHAT", "LCD"], presc: "large", dap: false, modular: false, fiche: false,
    indic: ["Incapacité de marche partielle ou totale", "Besoin de maintien : structure d'assise et dossier rigides", "Soutien du corps inclinable (mécanique assisté)"],
    ft: ["Dossier et siège à structure rigide (coussin amovible)", "Soutien du corps inclinable (vérins)", "Repose-jambes réglables et pivotants"] },
  FRM: { code: "FRM", fam: "Manuel modulaire", name: "Fauteuil roulant manuel",
    modes: ["ACHAT", "LCD"], presc: "large", dap: false, modular: true, fiche: true,
    indic: ["Incapacité de marche partielle ou totale permanente", "Configuration modulaire standard, réglages de base", "À pousser ou autopropulser"],
    ft: ["Châssis modulaire, réglages de base", "Support compatible adjonctions", "Mains courantes démontables"] },
  FRMA: { code: "FRMA", fam: "Manuel modulaire", name: "Fauteuil roulant manuel actif", tarif: 6276,
    modes: ["ACHAT"], presc: "spe", dap: true, modular: true, fiche: true,
    indic: ["Utilisateur expérimenté, maniabilité autonome", "Transferts et franchissements, usage intérieur et extérieur", "Réglages supérieurs au FRM (dynamique)"],
    ft: ["Châssis non pliant à cadre rigide", "Réglages fins (centre de gravité, carrossage)", "Poids total ≤ 10 kg"] },
  FRMS: { code: "FRMS", fam: "Manuel modulaire", name: "Fauteuil roulant manuel sport", tarif: 2400,
    modes: ["ACHAT"], presc: "pluri", dap: true, modular: true, fiche: true,
    indic: ["Incapacité de marche", "Pratique confirmée d'une activité sportive (hors professionnelle)", "Réglages supérieurs au FRM dédiés à la discipline"],
    ft: ["Châssis non pliant dédié", "Repose-pieds fixes, carrossage prononcé", "Configuration selon la discipline"] },
  FRMC: { code: "FRMC", fam: "Manuel modulaire", name: "Fauteuil manuel multi-configurable", tarif: 3303.53,
    modes: ["ACHAT"], presc: "spe", dap: true, modular: true, fiche: true,
    indic: ["Incapacité de marche partielle ou totale permanente", "Efficience de propulsion et mobilité", "Réglages supérieurs au FRM, multi-configurable"],
    ft: ["Châssis pliant ou non, hautement réglable", "Optimisation du rendement de propulsion", "Compatible adjonctions"] },
  FRMP: { code: "FRMP", fam: "Manuel modulaire", name: "Fauteuil manuel de positionnement",
    modes: ["ACHAT", "LLD"], presc: "spe", dap: true, modular: true, fiche: true,
    indic: ["Pas ou peu de déficit des membres supérieurs, pas ou peu d'incapacité à l'effort", "Besoins d'installation et de changement de position", "Tenir compte de l'environnement et des habitudes de vie"],
    ft: ["Inclinaison d'assise / dossier (changements de position)", "Réglages supérieurs au FRM", "Compatible PAP"] },
  FRMV: { code: "FRMV", fam: "Manuel modulaire", name: "Fauteuil manuel verticalisateur",
    modes: ["ACHAT", "LLD"], presc: "pluri", dap: true, modular: true, fiche: true,
    indic: ["Besoin de verticalisation régulière", "Capacités fonctionnelles ne permettant pas de se verticaliser seul", "Prévention des complications de l'immobilité"],
    ft: ["Passage assis → debout, soutien postérieur du corps", "Réglages supérieurs au FRM", "Favorise la participation sociale"] },
  FRE: { code: "FRE", fam: "Électrique", name: "Fauteuil roulant électrique standard", elec: true,
    modes: ["ACHAT", "LCD"], presc: "pluri", dap: true, modular: true, fiche: true,
    indic: ["Impossibilité de propulser un VPH manuel ou podal (déficience ou environnement)", "Capacités cognitives et physiques de maîtrise du FRE", "Fonctionnement des membres supérieurs et capacités visuelles suffisants"],
    ft: ["Moteur(s) électrique(s), débrayage en cas de panne", "Boîtier de commande réglable, positionnable D/G", "Système(s) de maintien de la personne"] },
  FREP: { code: "FREP", fam: "Électrique", name: "Fauteuil électrique multi-position", elec: true,
    modes: ["ACHAT", "LLD"], presc: "pluri", dap: true, modular: true, fiche: true,
    indic: ["Impossibilité de propulser un VPH manuel ou podal", "Besoin de maintien et de positionnement (perte de tonus)", "Exception : commande pour l'accompagnant si capacités insuffisantes"],
    ft: ["Réglages de positionnement supérieurs au FRE", "Modules de maintien postural", "Commande accompagnant possible (exception)"] },
  FREV: { code: "FREV", fam: "Électrique", name: "Fauteuil électrique verticalisateur", elec: true,
    modes: ["ACHAT", "LLD"], presc: "pluri", dap: true, modular: true, fiche: true,
    indic: ["Verticalisation régulière, rétractions musculo-tendineuses des membres inférieurs", "Ne peut se verticaliser seul ni par système mécanique", "Mode assis/debout (± positions couchées intermédiaires)"],
    ft: ["Verticalisation motorisée, soutien postérieur", "Réglages supérieurs au FRE", "Commande accompagnant possible (exception)"] },
  POU_S: { code: "POU_S", fam: "Poussette", name: "Poussette standard",
    modes: ["ACHAT"], presc: "large", dap: false, modular: false, fiche: false, child: true,
    indic: ["Enfant de moins de 18 ans", "Incapacité de marche partielle ou totale, permanente ou longue (> 6 mois)"],
    ft: ["Dispositif de poussée pour l'accompagnant", "Toile souple, châssis pliant ou non", "Palette(s) repose-pieds"] },
  POU_MRE: { code: "POU_MRE", fam: "Poussette", name: "Poussette modulaire / évolutive",
    modes: ["ACHAT", "LLD"], presc: "pluri", dap: false, modular: true, fiche: true, child: true,
    indic: ["Enfant de moins de 18 ans", "Besoin de maintien et de positionnement (perte de tonus)", "Impossibilité d'utiliser un autre VPH ou contraintes environnementales"],
    ft: ["Assise évolutive suivant la croissance", "Modules de positionnement", "Compatible PAP"] },
  SCO: { code: "SCO", fam: "Scooter", name: "Scooter",
    modes: ["ACHAT"], presc: "pluri", dap: true, modular: false, fiche: true,
    indic: ["Limitation sévère et durable de la marche", "Marche possible sur quelques mètres, équilibre assis sans aide, transferts autonomes", "Membres supérieurs, cognition et perception suffisants"],
    ft: ["≥ 3 roues, plancher + assise rigide", "Moteur(s) électrique(s), colonne inclinable", "Classes A+/B avec éclairage code de la route"] },
  BASE: { code: "BASE", fam: "Base", name: "Base roulante",
    modes: ["ACHAT"], presc: "large", dap: false, modular: false, fiche: false,
    indic: ["Incapacité de marche partielle ou totale", "Uniquement si installation dans un système de soutien du corps sur moulage thermoformable haute température"],
    ft: ["Base manuelle (accompagnant/autopropulsion) ou support", "Reçoit un siège-coque moulé", "Dispositif réfléchissant"] },
  CYC: { code: "CYC", fam: "Cycle", name: "Cycle / tricycle adapté",
    modes: ["ACHAT"], presc: "pluri", dap: false, modular: false, fiche: true,
    indic: ["Déficience motrice acquise ou congénitale, autonomie de déplacement réduite", "Incapacité de marche partielle ou totale", "Tricycle adapté au tronc et aux membres inférieurs"],
    ft: ["Propulsion podale et/ou manuelle", "Dossier/siège selon configuration", "Fixations de pieds proposées"] },
};

/* ---------------- CLASSES ÉLECTRIQUES (A/B/C) ---------------- */
const CLASSES = [
  { v: "A", t: "Classe A", d: "Compact et manœuvrable. Usage essentiellement intérieur ; franchissement d'obstacles extérieurs non requis.", route: false },
  { v: "B", t: "Classe B", d: "Compact et manœuvrable au domicile, et capable de franchir certains obstacles extérieurs. Soumis au code de la route.", route: true },
  { v: "C", t: "Classe C", d: "Grande taille, longues distances et franchissement d'obstacles extérieurs ; usage non nécessairement domestique. Soumis au code de la route.", route: true },
];

/* ---------------- ADJONCTIONS FACTURABLES ---------------- */
const ADJ = [
  { code: "4925054", grp: "aap", name: "AAP — dispositif d'assistance électrique, commande accompagnant", price: 3500, compat: MAN_MOD, excl: "aap" },
  { code: "4929796", grp: "aap", name: "AAP — kit de propulsion électrique, commande utilisateur", price: 6000, compat: MAN_MOD, excl: "aap" },

  { code: "4978547", grp: "conduite", name: "Système de conduite à double main courante", price: 271.23, compat: MAN_MOD },
  { code: "4928928", grp: "conduite", name: "Système de conduite à levier latéral", price: 1345, compat: MAN_MOD },
  { code: "4938766", grp: "conduite", name: "Levier de basculement", price: 25, compat: MAN_MOD },
  { code: "4904626", grp: "conduite", name: "DREEFT — paire de roues avec freinage intégré", tbd: true, compat: MAN_MOD },

  { code: "4954630", grp: "option", name: "Supplément appui-tête réglable", price: 160, compat: BROAD },
  { code: "4970497", grp: "option", name: "Tablette complète", price: 132, compat: BROAD },
  { code: "4987500", grp: "option", name: "Support d'oxygénothérapie / ventilation assistée", price: 500, compat: [...MAN_MOD, ...ELEC] },
  { code: "4965183", grp: "option", name: "Boîtier de commande personnalisé", price: 1500, compat: ELEC },
  { code: "4941700", grp: "option", name: "Supplément élévation « électrique » (lift)", price: 1500, compat: ELEC },
  { code: "4937991", grp: "option", name: "Repose-jambe électrique (droit et gauche)", price: 1250, compat: ELEC },
  { code: "4902165", grp: "option", name: "Supplément fauteuil bariatrique (électrique / scooter)", price: 700, compat: [...ELEC, "SCO"] },
  { code: "4922720", grp: "option", name: "Supplément fauteuil bariatrique (FRM)", tbd: true, compat: ["FRM"] },
  { code: "4936922", grp: "option", name: "Harnais 4 points ou plus", tbd: true, compat: ["POU_MRE"] },
  { code: "4960062", grp: "option", name: "Supplément spécifique sur devis", devis: true, compat: ["FRM", "FRMC", "FRMA", "FRMP", "FRMV", "FRE", "FREP", "FREV"] },
  { code: "4938720", grp: "option", name: "Supplément sur devis (fauteuil sportif)", devis: true, compat: ["FRMS"] },
];
const GRP_LABEL = {
  aap: "Aide à la propulsion (AAP) — non cumulable avec un électrique",
  conduite: "Conduite, basculement & roues",
  option: "Confort, sécurité & options",
};

/* ---------------- PAP (positionnement) + mapping forfaits A/B ---------------- */
const PAP_FORFAIT = { A: { code: "4954096", price: 600, label: "Forfait A — dossier & membres supérieurs" },
  B: { code: "4947601", price: 600, label: "Forfait B — siège & membres inférieurs" } };
const PAP = {
  "Cervico-céphalique": { f: "A", items: [
    ["Base d'appui cervico-céphalique", "Appui-tête simple, réglable, escamotable/amovible."],
    ["Appuis cervico-céphaliques latéraux", "Inclinaison latérale du rachis cervical."],
    ["Appui cervico-céphalique antérieur", "Flexion antérieure ; appui frontal ou sous-maxillaire."]] },
  "Thoraco-lombaire": { f: "A", items: [
    ["Dossier de base rigide", "Soutien sagittal du rachis, réglable."],
    ["Dossier de positionnement souple", "Sangles réglables, matériau de confort."],
    ["Appuis thoraciques latéraux", "Inclinaison latérale du tronc."],
    ["Ceinture de maintien thoracique", "Plastron / harnais / brassière (hors contention)."],
    ["Biseaux dorso-lombaire / thoracique / sacro-lombaire", "Rotation, cyphose ou lordose."]] },
  "Épaule": { f: "A", items: [
    ["Accoudoir de positionnement (gouttière d'avant-bras)", "Abduction et rétropulsion d'épaule."],
    ["Butée latérale du coude", "Abduction-adduction de l'épaule."],
    ["Butée postérieure du coude", "Rétropulsion de l'épaule."]] },
  "Poignet": { f: "A", items: [
    ["Sangle de poignet", "Flexion, escamotable."],
    ["Pommeau ergonomique", "Prono-supination, première commissure."]] },
  "Bassin": { f: "B", items: [
    ["Biseau pelvien", "Obliquité pelvienne."],
    ["Stabilisateurs pelviens latéraux", "Déviation latérale du bassin."],
    ["Ceinture pelvienne", "Rétro- ou antéversion (hors contention)."],
    ["Butée tibiale (bassin)", "Rotation pelvienne."]] },
  "Hanches": { f: "B", items: [
    ["Butée d'abduction", "Correction d'une adduction."],
    ["Butée d'adduction", "Correction d'une abduction."],
    ["Biseau / butée crurale", "Flexion-extension des hanches."],
    ["Cale talonnière latérale", "Rotation interne ou externe."]] },
  "Genou": { f: "B", items: [
    ["Butée talonnière postérieure", "Correction d'une flexion."],
    ["Butée tibiale (appui-mollet)", "Correction d'une extension."],
    ["Sangle de coup de pied", "Souple, réglable."]] },
  "Base de siège": { f: "B", items: [
    ["Coussin de base de positionnement", "Support des éléments de posture."],
    ["Base rigide de positionnement", "Non cumulable avec la base rigide du VPH."],
    ["Insert anti-escarre", "Régions sacro-ischiatiques (titre I)."]] },
};
const ITEM_FORFAIT = {};
Object.values(PAP).forEach(({ f, items }) => items.forEach(([n]) => (ITEM_FORFAIT[n] = f)));

const MODE_LABEL = {
  ACHAT: { t: "Achat", d: "Incapacité permanente ou longue (> 6 mois)." },
  LCD: { t: "Location courte durée", d: "Handicap temporaire estimé < 3 mois. Max 6 mois sur 12 mois glissants." },
  LLD: { t: "Location longue durée", d: "Location pour les besoins de positionnement / verticalisation." },
};
const eur = (n) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

/* ---------------- STYLES ---------------- */
const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
.pc-root{--ink:#16212B;--ink-soft:#4C5C68;--paper:#EAEEEF;--card:#FFFFFF;--line:#D3DBDD;--line-soft:#E3E9EA;
  --petrol:#0C6B66;--petrol-deep:#073F3C;--petrol-tint:#E0EFED;--amber:#9C4A06;--amber-tint:#F6EADC;
  font-family:'Hanken Grotesk',system-ui,sans-serif;color:var(--ink);
  background:linear-gradient(180deg,#EFF3F3,#E6ECED);min-height:100%;-webkit-font-smoothing:antialiased;}
.pc-wrap{max-width:790px;margin:0 auto;padding:32px 22px 56px;}
.pc-mono{font-family:'JetBrains Mono',monospace;}
.pc-eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--petrol);font-weight:600;}
.pc-wordmark{font-size:30px;font-weight:700;letter-spacing:-.02em;margin:4px 0 2px;}
.pc-wordmark span{color:var(--petrol);}
.pc-sub{font-size:13.5px;color:var(--ink-soft);line-height:1.5;max-width:60ch;}
.pc-thread{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:24px 0 18px;}
.pc-facet{display:inline-flex;align-items:center;gap:6px;background:var(--card);border:1px solid var(--line);
  border-radius:999px;padding:5px 11px 5px 8px;font-size:12px;color:var(--ink-soft);}
.pc-facet b{color:var(--ink);font-weight:600;}
.pc-facet .tk{width:14px;height:14px;border-radius:50%;background:var(--petrol-tint);color:var(--petrol-deep);
  display:inline-flex;align-items:center;justify-content:center;}
.pc-facet.em{color:#9AA7AD;border-style:dashed;background:transparent;}
.pc-tl{flex:1;height:1px;background:var(--line);min-width:10px;}
.pc-card{background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 14px 34px -26px rgba(22,33,43,.5);overflow:hidden;}
.pc-pad{padding:24px 26px 22px;}
.pc-acc{height:3px;background:linear-gradient(90deg,var(--petrol),var(--petrol-deep));}
.pc-step{font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-soft);font-weight:600;}
.pc-q{font-size:20px;font-weight:600;letter-spacing:-.01em;margin:6px 0 3px;line-height:1.25;}
.pc-qh{font-size:13px;color:var(--ink-soft);margin-bottom:16px;line-height:1.5;}
.pc-opt{display:flex;width:100%;text-align:left;gap:13px;align-items:flex-start;background:var(--card);border:1px solid var(--line);
  border-radius:12px;padding:13px 15px;margin-bottom:9px;cursor:pointer;transition:border-color .15s,background .15s,transform .1s;}
.pc-opt:hover{border-color:var(--petrol);background:#FAFDFC;}
.pc-opt:active{transform:translateY(1px);}
.pc-opt:focus-visible{outline:2px solid var(--petrol);outline-offset:2px;}
.pc-opt.on{border-color:var(--petrol);background:#F5FBFA;}
.pc-key{flex:0 0 auto;margin-top:1px;min-width:26px;height:24px;padding:0 5px;border-radius:7px;background:var(--paper);border:1px solid var(--line-soft);
  display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--ink-soft);font-family:'JetBrains Mono',monospace;}
.pc-opt:hover .pc-key{background:var(--petrol-tint);color:var(--petrol-deep);border-color:var(--petrol-tint);}
.pc-ob b{display:block;font-size:14.5px;font-weight:600;line-height:1.3;}
.pc-ob span{display:block;font-size:12.5px;color:var(--ink-soft);margin-top:3px;line-height:1.45;}
.pc-start{display:inline-flex;align-items:center;gap:9px;border:0;background:var(--petrol);color:#fff;font-family:inherit;
  font-weight:600;font-size:15px;padding:14px 24px;border-radius:11px;cursor:pointer;margin-top:6px;}
.pc-start:hover{background:var(--petrol-deep);}
.pc-intro-li{display:flex;gap:10px;font-size:13px;color:var(--ink-soft);margin-top:9px;line-height:1.5;}
.pc-intro-li .d{flex:0 0 auto;width:6px;height:6px;border-radius:50%;background:var(--petrol);margin-top:6px;}
.pc-nav{display:flex;justify-content:space-between;align-items:center;margin-top:16px;}
.pc-link{background:none;border:0;color:var(--ink-soft);font-size:13px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:5px;padding:6px 2px;}
.pc-link:hover{color:var(--petrol-deep);}
/* champs besoins (form segmenté) */
.pc-field{margin-bottom:15px;}
.pc-flabel{font-size:13.5px;font-weight:600;margin-bottom:7px;}
.pc-fhint{font-weight:400;color:var(--ink-soft);font-size:12.5px;margin-left:6px;}
.pc-seg{display:flex;gap:7px;flex-wrap:wrap;}
.pc-pill{border:1px solid var(--line);background:var(--card);color:var(--ink);font-family:inherit;font-size:13px;
  padding:8px 13px;border-radius:9px;cursor:pointer;transition:.12s;}
.pc-pill:hover{border-color:var(--petrol);}
.pc-pill.on{background:var(--petrol);color:#fff;border-color:var(--petrol);}
/* adjonctions */
.pc-glabel{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-soft);font-weight:600;margin:16px 0 8px;}
.pc-adj{display:flex;gap:11px;align-items:flex-start;border:1px solid var(--line);border-radius:11px;padding:11px 13px;margin-bottom:8px;cursor:pointer;transition:.12s;}
.pc-adj:hover{border-color:var(--petrol);background:#FAFDFC;}
.pc-adj.on{border-color:var(--petrol);background:#F5FBFA;}
.pc-box{flex:0 0 auto;width:17px;height:17px;border-radius:5px;border:1.5px solid var(--line);margin-top:2px;display:flex;align-items:center;justify-content:center;color:#fff;transition:.12s;}
.pc-box.on{background:var(--petrol);border-color:var(--petrol);}
.pc-adj-body{flex:1;min-width:0;}
.pc-adj-body b{font-size:13.5px;font-weight:600;display:block;line-height:1.3;}
.pc-adj-meta{display:flex;align-items:center;gap:8px;margin-top:4px;}
.pc-codebadge{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink-soft);background:var(--paper);border:1px solid var(--line-soft);border-radius:5px;padding:1px 6px;}
.pc-price{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:var(--petrol-deep);white-space:nowrap;margin-left:auto;}
.pc-price.devis,.pc-price.tbd{color:var(--amber);}
.pc-grp{border:1px solid var(--line-soft);border-radius:11px;margin-bottom:9px;overflow:hidden;}
.pc-grp summary{cursor:pointer;padding:11px 14px;font-size:14px;font-weight:600;display:flex;justify-content:space-between;align-items:center;list-style:none;}
.pc-grp summary::-webkit-details-marker{display:none;}
.pc-grp[open] summary{border-bottom:1px solid var(--line-soft);color:var(--petrol-deep);}
.pc-grp .cnt{font-size:11px;color:var(--ink-soft);background:var(--paper);border-radius:999px;padding:2px 8px;font-weight:600;}
.pc-grp .ff{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--petrol-deep);background:var(--petrol-tint);border-radius:5px;padding:1px 6px;margin-left:7px;}
.pc-it{display:flex;gap:11px;padding:10px 14px;align-items:flex-start;border-top:1px solid #EEF2F3;cursor:pointer;}
.pc-it:first-of-type{border-top:0;}
.pc-it:hover{background:#FAFDFC;}
.pc-it b{font-size:13.5px;font-weight:600;display:block;line-height:1.3;}
.pc-it span{font-size:12px;color:var(--ink-soft);display:block;margin-top:2px;line-height:1.4;}
.pc-note{font-size:12.5px;color:var(--ink-soft);background:#F1F6F5;border:1px solid var(--line-soft);border-radius:9px;padding:10px 13px;line-height:1.5;margin:6px 0 14px;}
.pc-cost{display:flex;justify-content:space-between;align-items:center;background:var(--petrol-tint);border-radius:10px;padding:11px 14px;margin-top:6px;}
.pc-cost b{font-size:13px;color:var(--petrol-deep);}
.pc-cost .amt{font-family:'JetBrains Mono',monospace;font-weight:600;font-size:15px;color:var(--petrol-deep);}
/* résultat */
.pc-rescode{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:6px;}
.pc-catchip{font-family:'JetBrains Mono',monospace;font-weight:600;font-size:19px;background:var(--petrol-deep);color:#EAF3F1;padding:8px 13px;border-radius:9px;}
.pc-fam{font-size:12px;font-weight:600;color:var(--petrol-deep);background:var(--petrol-tint);padding:5px 11px;border-radius:999px;}
.pc-resname{font-size:17px;font-weight:600;margin:13px 0 0;line-height:1.3;}
.pc-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--line-soft);border:1px solid var(--line-soft);border-radius:12px;overflow:hidden;margin:18px 0;}
.pc-cell{background:var(--card);padding:12px 14px;}
.pc-cell.full{grid-column:1/-1;}
.pc-cell .k{font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);font-weight:600;}
.pc-cell .v{font-size:13.5px;margin-top:4px;line-height:1.45;}
.pc-modepill{display:inline-block;font-size:12px;font-weight:600;color:var(--petrol-deep);background:var(--petrol-tint);border-radius:6px;padding:2px 8px;margin:0 5px 5px 0;}
.pc-dap{display:inline-flex;align-items:center;gap:7px;font-weight:600;}
.pc-dap.on{color:var(--amber);}
.pc-dot{width:8px;height:8px;border-radius:50%;background:currentColor;display:inline-block;}
.pc-sec{margin:18px 0 4px;}
.pc-sec h4{font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);font-weight:600;margin:0 0 9px;}
.pc-sec li{font-size:13.5px;line-height:1.5;list-style:none;padding-left:17px;position:relative;margin-bottom:7px;}
.pc-sec li:before{content:"";position:absolute;left:0;top:8px;width:6px;height:6px;border-radius:50%;background:var(--petrol);}
.pc-sec.fiche li:before{background:var(--line);}
.pc-line{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:13.5px;padding:7px 0;border-bottom:1px solid var(--line-soft);}
.pc-line:last-child{border-bottom:0;}
.pc-line .lbl{display:flex;gap:8px;align-items:baseline;min-width:0;}
.pc-flag{display:flex;gap:11px;background:var(--amber-tint);border:1px solid #E8D6BF;border-radius:11px;padding:12px 14px;margin:12px 0;font-size:13px;color:#5C3208;line-height:1.5;}
.pc-flag b{color:var(--amber);}
.pc-flag .ic{flex:0 0 auto;color:var(--amber);margin-top:1px;}
.pc-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}
.pc-tag{font-size:12px;background:#EEF4F3;border:1px solid var(--line-soft);border-radius:7px;padding:4px 9px;color:var(--ink);}
.pc-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:20px;}
.pc-btn{border:0;font-family:inherit;font-weight:600;font-size:14px;padding:11px 18px;border-radius:10px;cursor:pointer;}
.pc-bp{background:var(--petrol);color:#fff;}.pc-bp:hover{background:var(--petrol-deep);}
.pc-bg{background:var(--card);color:var(--ink);border:1px solid var(--line);}.pc-bg:hover{border-color:var(--petrol);color:var(--petrol-deep);}
.pc-summary{margin-top:16px;border:1px dashed var(--line);border-radius:11px;background:#FAFBFB;}
.pc-summary summary{cursor:pointer;padding:12px 15px;font-size:13px;font-weight:600;color:var(--ink-soft);}
.pc-summary[open] summary{color:var(--petrol-deep);}
.pc-summary pre{font-family:'JetBrains Mono',monospace;font-size:11.5px;line-height:1.55;white-space:pre-wrap;padding:0 15px 15px;margin:0;}
.pc-foot{margin-top:24px;font-size:11.5px;color:#7E8C92;line-height:1.6;border-top:1px solid var(--line);padding-top:15px;}
.pc-foot b{color:var(--ink-soft);font-weight:600;}
.pc-fade{animation:pcf .26s ease;}@keyframes pcf{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
@media (prefers-reduced-motion:reduce){.pc-fade{animation:none;}}
@media (max-width:560px){.pc-grid{grid-template-columns:1fr;}.pc-wordmark{font-size:25px;}.pc-q{font-size:18px;}}
`;

/* ---------------- ICONS ---------------- */
const Tk = () => (<svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3.2 3.2L13 4.5" /></svg>);
const Ar = ({ d = "r" }) => (<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: d === "l" ? "scaleX(-1)" : "none" }}><path d="M6 3l5 5-5 5" /></svg>);
const Wn = () => (<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3l7.5 13H2.5L10 3z" /><path d="M10 8.5v3.2" /><circle cx="10" cy="14" r=".5" fill="currentColor" /></svg>);

/* ---------------- COMPOSANT ---------------- */
export default function Preconia() {
  const [stage, setStage] = useState("home");
  const [hist, setHist] = useState([]);
  const [a, setA] = useState({ age: null, duree: null, mob: null, device: null, conduite: false,
    classe: null, depl: null, cotes: null, cognition: null, projet: null });
  const [pap, setPap] = useState({});
  const [adj, setAdj] = useState({});
  const [copied, setCopied] = useState(false);
  useEffect(() => { setCopied(false); }, [stage]);

  const go = (next) => { setHist((h) => [...h, stage]); setStage(next); };
  const back = () => { setHist((h) => { if (!h.length) return h; const p = [...h]; setStage(p.pop()); return p; }); };
  const reset = () => { setA({ age: null, duree: null, mob: null, device: null, conduite: false, classe: null, depl: null, cotes: null, cognition: null, projet: null }); setPap({}); setAdj({}); setHist([]); setStage("home"); };
  const chooseDevice = (id, mob) => { setA((p) => ({ ...p, device: id, mob: mob || p.mob })); setAdj({}); setPap({}); go(FICHE.has(id) ? "besoins" : "adj"); };
  const setB = (field, val) => setA((p) => ({ ...p, [field]: val, ...(field === "conduiteAuto" ? { conduite: val === "oui" } : {}) }));

  const facets = [
    { k: "Âge", v: a.age && (a.age === "enfant" ? "Enfant" : "Adulte") },
    { k: "Durée", v: a.duree && (a.duree === "temp" ? "Temporaire" : "Durable") },
    { k: "Mobilité", v: a.mob && ({ manuel: "Manuel", elec: "Électrique", scooter: "Scooter", poussette: "Poussette", base: "Base", cycle: "Cycle" }[a.mob]) },
    { k: "Dispositif", v: a.device && DEV[a.device].code },
  ];

  const dev = a.device ? DEV[a.device] : null;
  const compatAdj = useMemo(() => (dev ? ADJ.filter((x) => x.compat.includes(dev.code)) : []), [dev]);
  const adjByGrp = useMemo(() => { const g = {}; compatAdj.forEach((x) => { (g[x.grp] = g[x.grp] || []).push(x); }); return g; }, [compatAdj]);

  const toggleAdj = (item) => setAdj((prev) => {
    const n = { ...prev };
    if (n[item.code]) { delete n[item.code]; return n; }
    if (item.excl) compatAdj.filter((x) => x.excl === item.excl).forEach((x) => delete n[x.code]);
    n[item.code] = true; return n;
  });

  const selectedAdj = useMemo(() => ADJ.filter((x) => adj[x.code]), [adj]);
  // forfaits PAP déduits des PAP cochés
  const forfaits = useMemo(() => {
    const f = new Set();
    Object.keys(pap).forEach((n) => { if (pap[n] && ITEM_FORFAIT[n]) f.add(ITEM_FORFAIT[n]); });
    return [...f].sort();
  }, [pap]);
  const papCost = forfaits.reduce((s, f) => s + PAP_FORFAIT[f].price, 0);
  const adjCost = selectedAdj.filter((x) => !x.devis && !x.tbd).reduce((s, x) => s + x.price, 0);
  const subtotal = adjCost + papCost;
  const hasOpen = selectedAdj.some((x) => x.devis || x.tbd);

  const summary = useMemo(() => {
    if (!dev) return "";
    const papList = Object.keys(pap).filter((k) => pap[k]);
    const cls = dev.elec && a.classe ? CLASSES.find((c) => c.v === a.classe) : null;
    const L = [
      "PRECONIA — Fiche de préconisation VPH (aide à la décision, non opposable)",
      "————",
      "À compléter : identification du bénéficiaire ; mesures anthropométriques (taille, poids, latéralité).",
      "",
      `Catégorie : ${dev.code} — ${dev.name} (${dev.fam})`,
      cls ? `Classe : ${cls.t} — ${cls.route ? "soumis au code de la route (ceinture, éclairage, bandes réfléchissantes inclus)" : "usage intérieur"}` : null,
      dev.tarif ? `Tarif de base indicatif : ${eur(dev.tarif)} (achat neuf)` : null,
      `Mode de prise en charge : ${dev.modes.map((m) => MODE_LABEL[m].t).join(" / ")}`,
      `Prescripteur / attestation : ${PRESC[dev.presc]}`,
      `Fiche d'évaluation + préconisation : ${dev.fiche ? "REQUISES" : "non concerné (FMP, FMPR, BASE, POU_S)"}`,
      `Demande d'accord préalable (DAP) : ${dev.dap ? "REQUISE" : "non requise"}`,
      "",
      "Indications / mots-clés de prescription :",
      ...dev.indic.map((i) => `  - ${i}`),
      dev.fiche ? "\nÉvaluation des besoins :" : "",
      dev.fiche && a.depl ? `  - Déplacements : ${({ int: "intérieur", mixte: "intérieur + extérieur", ext: "extérieur / tout-terrain" }[a.depl])}` : "",
      dev.fiche && a.cotes ? `  - Côtes / terrains accidentés : ${a.cotes === "oui" ? "oui" : "non"}` : "",
      dev.fiche && a.cognition ? `  - Capacités cognitives de conduite : ${a.cognition === "oui" ? "oui" : "non"}` : "",
      dev.fiche && a.projet ? `  - Projet : ${a.projet === "premiere" ? "première acquisition" : "renouvellement / cumul"}` : "",
      a.conduite ? "  - Conduite d'un véhicule motorisé par l'usager : oui → coordonner avec l'évaluation véhicule aménagé (assise basse / Low Rider, ISO 7176-19, arrimage)." : "",
      "\nCaractéristiques à préciser pour l'essai : mode de propulsion, châssis, dossier, repose-pieds, accoudoirs, siège, roues, système de conduite.",
      papList.length ? "\nProduits d'aide à la posture (PAP) :" : "",
      ...papList.map((p) => `  - ${p} (forfait ${ITEM_FORFAIT[p]})`),
      forfaits.length ? `  Forfaits PAP : ${forfaits.map((f) => `${PAP_FORFAIT[f].label} [${PAP_FORFAIT[f].code}] ${eur(PAP_FORFAIT[f].price)}`).join(" ; ")}` : "",
      selectedAdj.length ? "\nAdjonctions facturables :" : "",
      ...selectedAdj.map((x) => `  - [${x.code}] ${x.name} — ${x.devis ? "sur devis" : x.tbd ? "tarif à préciser" : eur(x.price)}`),
      (selectedAdj.length || forfaits.length) ? `  Sous-total : ${eur(subtotal)}${hasOpen ? " (+ éléments sur devis / à préciser)" : ""}` : "",
      "————",
      "Forfait de livraison [1266390] : 50,00 €. À confirmer par un essai réel et une évaluation ergothérapique.",
      `Source : nomenclature VPH 2025 + fiches 2026. MAJ ${MAJ}.`,
    ].filter((x) => x !== null && x !== "");
    return L.join("\n");
  }, [dev, pap, selectedAdj, forfaits, subtotal, hasOpen, a]);

  const copy = () => { try { const ta = document.createElement("textarea"); ta.value = summary; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); setCopied(true); } catch (e) {} };

  const Opt = ({ k, t, s, on, active }) => (
    <button className={"pc-opt" + (active ? " on" : "")} onClick={on}><span className="pc-key">{k}</span>
      <span className="pc-ob"><b>{t}</b>{s && <span>{s}</span>}</span></button>
  );
  const Field = ({ label, hint, field, options }) => (
    <div className="pc-field">
      <div className="pc-flabel">{label}{hint && <span className="pc-fhint">{hint}</span>}</div>
      <div className="pc-seg">{options.map((o) => (
        <button key={o.v} className={"pc-pill" + (a[field] === o.v ? " on" : "")} onClick={() => setB(field, o.v)}>{o.t}</button>))}</div>
    </div>
  );

  return (
    <div className="pc-root">
      <style>{STYLE}</style>
      <div className="pc-wrap">
        <header>
          <div className="pc-eyebrow">Aide à la préconisation VPH · Médecine physique &amp; réadaptation</div>
          <div className="pc-wordmark">PRECON<span>IA</span></div>
          <p className="pc-sub">Du profil fonctionnel au dispositif, à sa classe, ses adjonctions facturables (codes LPPR)
            et son positionnement — d'après la nomenclature VPH 2025 et les fiches d'évaluation et de préconisation 2026.</p>
        </header>

        {stage !== "home" && (
          <div className="pc-thread">
            {facets.map((f, i) => (
              <React.Fragment key={f.k}>
                {i > 0 && <span className="pc-tl" />}
                <span className={"pc-facet" + (f.v ? "" : " em")}>
                  {f.v && <span className="tk"><Tk /></span>}<span>{f.k}{f.v ? " : " : ""}</span>{f.v && <b>{f.v}</b>}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="pc-card"><div className="pc-acc" /><div className="pc-pad pc-fade" key={stage}>

          {stage === "home" && (<>
            <div className="pc-step">Évaluation guidée</div>
            <h2 className="pc-q">Préconisation d'un véhicule pour personne handicapée</h2>
            <p className="pc-qh">Un parcours algorithmique de questions à choix multiples mène du profil fonctionnel
              à la catégorie LPPR, sa classe, son circuit de prise en charge et ses adjonctions.</p>
            <div className="pc-intro-li"><span className="d" /><span>Profil patient, durée du besoin et capacités de propulsion.</span></div>
            <div className="pc-intro-li"><span className="d" /><span>Évaluation des besoins environnementaux (fiche officielle).</span></div>
            <div className="pc-intro-li"><span className="d" /><span>Adjonctions facturables, positionnement (PAP) et synthèse pour l'essai.</span></div>
            <div style={{ marginTop: 18 }}>
              <button className="pc-start" onClick={() => go("age")}>Commencer l'évaluation <Ar /></button>
            </div>
          </>)}

          {stage === "age" && (<>
            <div className="pc-step">Étape 1 — Patient</div>
            <h2 className="pc-q">Âge du patient</h2>
            <p className="pc-qh">Conditionne l'accès aux poussettes (réservées aux moins de 18 ans).</p>
            <Opt k="1" t="Adulte (18 ans et plus)" active={a.age === "adulte"} on={() => { setA((p) => ({ ...p, age: "adulte" })); go("duree"); }} />
            <Opt k="2" t="Enfant (moins de 18 ans)" active={a.age === "enfant"} on={() => { setA((p) => ({ ...p, age: "enfant" })); go("duree"); }} />
            <div className="pc-nav"><button className="pc-link" onClick={back}><Ar d="l" /> Retour</button><span /></div>
          </>)}

          {stage === "duree" && (<>
            <div className="pc-step">Étape 2 — Temporalité</div>
            <h2 className="pc-q">Durée prévisible du besoin</h2>
            <p className="pc-qh">Détermine le mode : location courte durée (handicap temporaire) ou achat / location longue durée.</p>
            <Opt k="1" t="Temporaire — moins de 3 mois estimés" s="Situation de handicap provisoire ; ouvre la location courte durée." active={a.duree === "temp"} on={() => { setA((p) => ({ ...p, duree: "temp" })); go("mob"); }} />
            <Opt k="2" t="Durable — permanent ou supérieur à 6 mois" s="Parcours d'achat (ou location longue durée pour le positionnement)." active={a.duree === "durable"} on={() => { setA((p) => ({ ...p, duree: "durable" })); go("mob"); }} />
            <div className="pc-nav"><button className="pc-link" onClick={back}><Ar d="l" /> Retour</button><span /></div>
          </>)}

          {stage === "mob" && (<>
            <div className="pc-step">Étape 3 — Mobilité</div>
            <h2 className="pc-q">Capacité de marche et de propulsion</h2>
            <p className="pc-qh">Détermine la grande famille de dispositif.</p>
            <Opt k="A" t="Marche possible sur quelques mètres" s="Limitation sévère et durable, équilibre assis, transferts autonomes → scooter."
              on={() => chooseDevice("SCO", "scooter")} />
            <Opt k="B" t="Incapacité de marche — propulsion manuelle possible" s="Membres supérieurs et tronc fonctionnels, ou présence d'un aidant."
              on={() => { setA((p) => ({ ...p, mob: "manuel" })); go("cfg_man"); }} />
            <Opt k="C" t="Incapacité de marche — propulsion manuelle impossible" s="Pilotage électrique possible (cognition, membres supérieurs, vision)."
              on={() => { setA((p) => ({ ...p, mob: "elec" })); go("cfg_elec"); }} />
            {a.age === "enfant" && (
              <Opt k="D" t="Enfant ne pouvant utiliser un autre VPH" s="Contraintes environnementales ou besoin de maintien → poussette."
                on={() => { setA((p) => ({ ...p, mob: "poussette" })); go("cfg_pou"); }} />)}
            <Opt k="E" t="Installation sur moulage thermoformable" s="Siège-coque de soutien du corps → base roulante."
              on={() => chooseDevice("BASE", "base")} />
            <Opt k="F" t="Déficience motrice, déplacement par tricycle adapté" s="Cycle adapté au tronc et aux membres inférieurs."
              on={() => chooseDevice("CYC", "cycle")} />
            <div className="pc-nav"><button className="pc-link" onClick={back}><Ar d="l" /> Retour</button><span /></div>
          </>)}

          {stage === "cfg_man" && (<>
            <div className="pc-step">Étape 4 — Configuration manuelle</div>
            <h2 className="pc-q">Besoin dominant</h2>
            <p className="pc-qh">FRMA / FRMC / FRMP relèvent d'un prescripteur compétent ; FRMS / FRMV d'une équipe pluridisciplinaire. Tous soumis à DAP sauf FRM.</p>
            <Opt k="FMP" t="Usage standard, assise souple" s="Non modulaire, pas d'adjonction." on={() => chooseDevice("FMP")} />
            <Opt k="FMPR" t="Maintien : assise et dossier rigides" s="Non modulaire, soutien du corps inclinable." on={() => chooseDevice("FMPR")} />
            <Opt k="FRM" t="Modulaire standard" s="Réglages de base, adjonctions, à pousser ou autopropulser." on={() => chooseDevice("FRM")} />
            <Opt k="FRMA" t="Utilisateur actif expérimenté" s="Maniabilité autonome, transferts, franchissements." on={() => chooseDevice("FRMA")} />
            <Opt k="FRMC" t="Efficience de propulsion maximale" s="Multi-configurable, optimisation du rendement." on={() => chooseDevice("FRMC")} />
            <Opt k="FRMP" t="Installation et changements de position" s="Peu de déficit des membres supérieurs ; positionnement." on={() => chooseDevice("FRMP")} />
            <Opt k="FRMV" t="Verticalisation régulière" s="Ne peut se verticaliser seul." on={() => chooseDevice("FRMV")} />
            <Opt k="FRMS" t="Pratique sportive" s="Châssis dédié à une discipline." on={() => chooseDevice("FRMS")} />
            <div className="pc-nav"><button className="pc-link" onClick={back}><Ar d="l" /> Retour</button><span /></div>
          </>)}

          {stage === "cfg_elec" && (<>
            <div className="pc-step">Étape 4 — Configuration électrique</div>
            <h2 className="pc-q">Caractéristiques requises</h2>
            <p className="pc-qh">Toutes soumises à DAP et à une équipe pluridisciplinaire (min. MPR). La classe A/B/C sera précisée à l'étape suivante.</p>
            <Opt k="FRE" t="Électrique standard" s="Pilotage autonome ; modulaire, compatible PAP." on={() => chooseDevice("FRE")} />
            <Opt k="FREP" t="Maintien et positionnement" s="Perte de tonus ; modules de positionnement. Commande accompagnant possible." on={() => chooseDevice("FREP")} />
            <Opt k="FREV" t="Verticalisation électrique" s="Rétractions des membres inférieurs ; mode assis/debout." on={() => chooseDevice("FREV")} />
            <div className="pc-nav"><button className="pc-link" onClick={back}><Ar d="l" /> Retour</button><span /></div>
          </>)}

          {stage === "cfg_pou" && (<>
            <div className="pc-step">Étape 4 — Poussette</div>
            <h2 className="pc-q">Type de poussette</h2>
            <p className="pc-qh">Réservé aux moins de 18 ans.</p>
            <Opt k="POU" t="Poussette standard" s="Incapacité de marche, sans besoin de positionnement particulier." on={() => chooseDevice("POU_S")} />
            <Opt k="POU+" t="Poussette modulaire / évolutive" s="Besoin de maintien et de positionnement (perte de tonus)." on={() => chooseDevice("POU_MRE")} />
            <div className="pc-nav"><button className="pc-link" onClick={back}><Ar d="l" /> Retour</button><span /></div>
          </>)}

          {stage === "besoins" && dev && (<>
            <div className="pc-step">Étape 5 — Évaluation des besoins</div>
            <h2 className="pc-q">Besoins &amp; environnement</h2>
            <p className="pc-qh">D'après la fiche d'évaluation des besoins 2026. Ces éléments orientent la classe, les options et le circuit.</p>

            {dev.elec && (<>
              <div className="pc-flabel" style={{ marginBottom: 8 }}>Classe du fauteuil électrique</div>
              {CLASSES.map((c) => (
                <Opt key={c.v} k={c.v} t={c.t} s={c.d} active={a.classe === c.v} on={() => setA((p) => ({ ...p, classe: c.v }))} />
              ))}
              {a.classe && CLASSES.find((c) => c.v === a.classe).route && (
                <div className="pc-flag"><span className="ic"><Wn /></span>
                  <span><b>Soumis au code de la route.</b> Ceinture, dispositif d'éclairage et bandes réfléchissantes
                    sont obligatoires, inclus et <b>non facturables en sus</b>.</span></div>
              )}
              <div style={{ height: 8 }} />
            </>)}

            {!dev.elec && (
              <Field label="Types de déplacements" field="depl" options={[
                { v: "int", t: "Intérieur" }, { v: "mixte", t: "Intérieur + extérieur" }, { v: "ext", t: "Extérieur / tout-terrain" }]} />
            )}
            <Field label="Côtes ou terrains accidentés fréquents" field="cotes" options={[{ v: "oui", t: "Oui" }, { v: "non", t: "Non" }]} />
            <Field label="Capacités cognitives permettant la conduite du VPH" field="cognition" options={[{ v: "oui", t: "Oui" }, { v: "non", t: "Non" }]} />
            <Field label="Conduite d'un véhicule motorisé par l'usager" hint="active le volet véhicule aménagé" field="conduiteAuto" options={[{ v: "oui", t: "Oui" }, { v: "non", t: "Non" }]} />
            <Field label="Projet" field="projet" options={[{ v: "premiere", t: "Première acquisition" }, { v: "renouv", t: "Renouvellement / cumul" }]} />

            {dev.elec && a.cognition === "non" && (
              <div className="pc-flag"><span className="ic"><Wn /></span>
                <span><b>Capacités de conduite insuffisantes.</b> Envisager une commande pour l'accompagnant (FREP/FREV — exception prévue par la nomenclature).</span></div>
            )}

            <div className="pc-nav">
              <button className="pc-link" onClick={back}><Ar d="l" /> Retour</button>
              <button className="pc-link" onClick={() => go("adj")}>Adjonctions <Ar /></button>
            </div>
          </>)}

          {stage === "adj" && dev && (<>
            <div className="pc-step">Étape 6 — Adjonctions &amp; positionnement</div>
            <h2 className="pc-q">Adjonctions facturables</h2>
            <p className="pc-qh">Sélection compatible avec le {dev.code}. Codes LPPR et tarifs TTC indicatifs.</p>

            {compatAdj.length === 0 && <div className="pc-note">Aucune adjonction facturable répertoriée pour ce dispositif.</div>}

            {["aap", "conduite", "option"].filter((g) => adjByGrp[g]).map((g) => (
              <div key={g}>
                <div className="pc-glabel">{GRP_LABEL[g]}</div>
                {adjByGrp[g].map((item) => (
                  <div key={item.code} className={"pc-adj" + (adj[item.code] ? " on" : "")} onClick={() => toggleAdj(item)} role="checkbox" aria-checked={!!adj[item.code]} tabIndex={0}>
                    <span className={"pc-box" + (adj[item.code] ? " on" : "")}>{adj[item.code] && <Tk />}</span>
                    <div className="pc-adj-body"><b>{item.name}</b>
                      <div className="pc-adj-meta"><span className="pc-codebadge">{item.code}</span>
                        <span className={"pc-price" + (item.devis ? " devis" : item.tbd ? " tbd" : "")}>{item.devis ? "Sur devis" : item.tbd ? "Tarif à préciser" : eur(item.price)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* PAP */}
            <div className="pc-glabel" style={{ marginTop: 20 }}>Produits d'aide au positionnement (PAP)</div>
            <div className="pc-note">
              {dev.modular
                ? "Catalogue clinique du positionnement. Les forfaits A (dossier & membres supérieurs) et B (siège & membres inférieurs) se déduisent automatiquement des PAP cochés."
                : "Dispositif non modulaire : les PAP ne s'appliquent pas."}
            </div>
            {dev.modular && Object.entries(PAP).map(([region, { f, items }]) => {
              const sel = items.filter(([n]) => pap[n]).length;
              return (
                <details className="pc-grp" key={region}>
                  <summary><span>{region}<span className="ff">Forfait {f}</span></span>
                    <span className="cnt">{sel ? `${sel} sél.` : `${items.length} options`}</span></summary>
                  {items.map(([n, d]) => (
                    <div className="pc-it" key={n} onClick={() => setPap((p) => ({ ...p, [n]: !p[n] }))} role="checkbox" aria-checked={!!pap[n]} tabIndex={0}>
                      <span className={"pc-box" + (pap[n] ? " on" : "")}>{pap[n] && <Tk />}</span>
                      <span><b>{n}</b><span>{d}</span></span>
                    </div>
                  ))}
                </details>
              );
            })}

            {(selectedAdj.length > 0 || forfaits.length > 0) && (
              <div className="pc-cost"><b>Sous-total{hasOpen ? " (hors devis / à préciser)" : ""}</b><span className="amt">{eur(subtotal)}</span></div>
            )}

            <div className="pc-nav">
              <button className="pc-link" onClick={back}><Ar d="l" /> Retour</button>
              <button className="pc-link" onClick={() => go("result")}>Voir la préconisation <Ar /></button>
            </div>
          </>)}

          {stage === "result" && dev && (<>
            <div className="pc-step">Préconisation</div>
            <div className="pc-rescode">
              <span className="pc-catchip">{dev.code}</span>
              <span className="pc-fam">{dev.fam}</span>
              {dev.elec && a.classe && <span className="pc-fam">Classe {a.classe}</span>}
              {dev.tarif && <span className="pc-price" style={{ marginLeft: 0 }}>{eur(dev.tarif)} <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>base</span></span>}
            </div>
            <div className="pc-resname">{dev.name}</div>

            <div className="pc-grid">
              <div className="pc-cell full">
                <div className="k">Mode de prise en charge</div>
                <div className="v" style={{ marginTop: 6 }}>
                  {dev.modes.map((m) => <span key={m} className="pc-modepill">{MODE_LABEL[m].t}</span>)}
                  <div style={{ color: "var(--ink-soft)", fontSize: 12.5, marginTop: 4, lineHeight: 1.45 }}>{dev.modes.map((m) => MODE_LABEL[m].d).join(" ")}</div>
                </div>
              </div>
              <div className="pc-cell full"><div className="k">Prescripteur / attestation</div><div className="v">{PRESC[dev.presc]}</div></div>
              <div className="pc-cell"><div className="k">Fiche évaluation + préconisation</div><div className="v">{dev.fiche ? "Requises" : "Non concerné"}</div></div>
              <div className="pc-cell"><div className="k">Accord préalable</div>
                <div className="v"><span className={"pc-dap" + (dev.dap ? " on" : "")}><span className="pc-dot" />{dev.dap ? "DAP requise" : "Non requise"}</span></div></div>
            </div>

            <div className="pc-sec"><h4>Indications · mots-clés de prescription</h4>
              <ul>{dev.indic.map((i, k) => <li key={k}>{i}</li>)}</ul></div>

            {dev.elec && a.classe && CLASSES.find((c) => c.v === a.classe).route && (
              <div className="pc-flag"><span className="ic"><Wn /></span>
                <span><b>Classe {a.classe} — code de la route.</b> Ceinture, éclairage et bandes réfléchissantes inclus et non facturables en sus.</span></div>
            )}
            {a.conduite && (
              <div className="pc-flag"><span className="ic"><Wn /></span>
                <span><b>Conduite depuis le fauteuil.</b> Assise basse (type Low Rider), homologation ISO 7176-19 et arrimage. À coordonner avec l'évaluation du véhicule aménagé.</span></div>
            )}

            {(selectedAdj.length > 0 || forfaits.length > 0) && (
              <div className="pc-sec"><h4>Adjonctions &amp; forfaits PAP</h4>
                {forfaits.map((f) => (
                  <div className="pc-line" key={f}>
                    <span className="lbl"><span className="pc-codebadge">{PAP_FORFAIT[f].code}</span><span>{PAP_FORFAIT[f].label}</span></span>
                    <span className="pc-price" style={{ marginLeft: 0 }}>{eur(PAP_FORFAIT[f].price)}</span>
                  </div>
                ))}
                {selectedAdj.map((x) => (
                  <div className="pc-line" key={x.code}>
                    <span className="lbl"><span className="pc-codebadge">{x.code}</span><span>{x.name}</span></span>
                    <span className={"pc-price" + (x.devis ? " devis" : x.tbd ? " tbd" : "")} style={{ marginLeft: 0 }}>{x.devis ? "Sur devis" : x.tbd ? "À préciser" : eur(x.price)}</span>
                  </div>
                ))}
                <div className="pc-cost" style={{ marginTop: 10 }}><b>Sous-total{hasOpen ? " (hors devis / à préciser)" : ""}</b><span className="amt">{eur(subtotal)}</span></div>
              </div>
            )}

            {Object.values(pap).some(Boolean) && (
              <div className="pc-sec"><h4>Positionnement (PAP) retenu</h4>
                <div className="pc-tags">{Object.keys(pap).filter((k) => pap[k]).map((k) => <span key={k} className="pc-tag">{k} · {ITEM_FORFAIT[k]}</span>)}</div></div>
            )}

            <div className="pc-sec fiche"><h4>Fiche technique · repères</h4>
              <ul>{dev.ft.map((f, k) => <li key={k}>{f}</li>)}</ul></div>

            <div className="pc-note" style={{ marginTop: 14 }}>À compléter pour l'essai : identification du bénéficiaire, mesures anthropométriques
              (taille, poids, latéralité) et caractéristiques du fauteuil (propulsion, châssis, dossier, repose-pieds, accoudoirs, siège, roues, conduite).</div>

            <details className="pc-summary">
              <summary>Synthèse à reporter sur la fiche de préconisation {copied && "· copiée"}</summary>
              <pre>{summary}</pre>
            </details>

            <div className="pc-actions">
              <button className="pc-btn pc-bp" onClick={copy}>{copied ? "Copié" : "Copier la synthèse"}</button>
              <button className="pc-btn pc-bg" onClick={() => go("adj")}>Modifier les adjonctions</button>
              <button className="pc-btn pc-bg" onClick={reset}>Nouvelle évaluation</button>
            </div>
          </>)}

        </div></div>

        <div className="pc-foot">
          <b>Aide à la décision — non opposable.</b> Tarifs TTC indicatifs (nomenclature VPH 2025, LPPR) ; forfait de livraison
          1266390 : 50 €. PRECONIA n'évalue pas l'aptitude et ne remplace ni l'essai réel ni l'évaluation ergothérapique.
          Codes, paliers de prescripteur, classes et cumuls à confirmer dans la nomenclature et les fiches en vigueur. Dernière mise à jour : {MAJ}.
        </div>
      </div>
    </div>
  );
}

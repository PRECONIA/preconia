#!/usr/bin/env node
/* Vérificateur d'intégrité de la base PRECONIA contre la base LPP officielle (CNAMTS).
 *
 * Preuve reproductible : ce script télécharge la base tarifaire publique LPPTOT depuis le
 * site du codage de l'Assurance maladie (http://www.codage.ext.cnamts.fr), la parse, puis
 * confronte CHAQUE code LPP, tarif et libellé porté par les fichiers `data/*.json` de
 * PRECONIA à l'enregistrement officiel correspondant. Toute personne peut l'exécuter :
 *
 *   node scripts/verifier-lpptot.mjs                 # base courante téléchargée
 *   node scripts/verifier-lpptot.mjs --fichier CHEMIN # base locale (LPPTOT brut ou .zip)
 *
 * Sortie : rapport détaillé par fichier + synthèse. Code de sortie 0 si aucun écart
 * (code absent/radié ou tarif divergent) ; 1 sinon. Les libellés reformulés pour la
 * lisibilité (abréviations LPPTOT développées) sont signalés en avertissement, pas en écart.
 *
 * Format LPPTOT (fichier à enregistrements de largeur fixe, latin-1, sans fins de ligne) :
 *   - « 1010101 » + code(7) + désignation : fiche produit ;
 *   - « 1100101 » + début(8) + fin(8) + 4 lettres + 16 chiffres + montant(11, 2 décimales) :
 *     ligne tarifaire ; fin = 00000000 → tarif en vigueur ;
 *   - montant sentinelle 100 000 000,00 € → prise en charge « sur devis ».
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGE_TELECHARGEMENT =
  "http://www.codage.ext.cnamts.fr/codif/tips/telecharge/index_tele.php?p_site=AMELI";
const HOTE_CNAMTS = "http://www.codage.ext.cnamts.fr";
const SENTINELLE_DEVIS = 100000000;

/** Codes « VPH » de la base officielle volontairement NON portés par PRECONIA — chaque
 *  exclusion est justifiée. Tout autre code VPH en vigueur absent du catalogue est signalé
 *  en écart (détection des nouveautés : nouvelle ligne inscrite par la CNAMTS, RBEU…). */
const HORS_PERIMETRE = {
  // Monte-escaliers transportables : famille « VPH » du Titre IV mais hors fauteuils
  // roulants / poussettes / scooters / cycles — hors périmètre fonctionnel de PRECONIA.
  4302057: "monte-escalier transportable (Alber Scalamobil S35)",
  4320552: "monte-escalier transportable (Alber Scalamobil S38)",
  4335298: "monte-escalier transportable — prestation initiale",
  4353787: "monte-escalier transportable — kit de fixation",
  4371160: "monte-escalier transportable — prestation kit",
  // Anciens fauteuils électriques inscrits en nom de marque (ancienne nomenclature),
  // encore en vigueur au titre des dispositions transitoires (arrêté 06/02/2025, art. 2).
  4144173: "ancienne nomenclature — Lazelec Mobile Dream MD S (transitoire)",
  4154830: "ancienne nomenclature — Lazelec Mobile Dream MD TT (transitoire)",
};

/* ---------------------------------- utilitaires ---------------------------------- */

const lireJson = (rel) => JSON.parse(readFileSync(join(RACINE, "data", rel), "utf-8"));

async function telecharger(url) {
  const rep = await fetch(url, { headers: { "User-Agent": "PRECONIA-verificateur" } });
  if (!rep.ok) throw new Error(`HTTP ${rep.status} sur ${url}`);
  return Buffer.from(await rep.arrayBuffer());
}

/** Extrait la première entrée d'un ZIP dont le nom matche `nomRe` (lecture du répertoire
 *  central — suffisant pour l'archive mono-fichier de la CNAMTS). */
function dezipper(buf, nomRe) {
  const eocd = buf.lastIndexOf(Buffer.from("PK\x05\x06", "binary"));
  if (eocd < 0) throw new Error("ZIP invalide (EOCD introuvable)");
  const nb = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < nb; k++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error("répertoire central corrompu");
    const methode = buf.readUInt16LE(off + 10);
    const tailleComp = buf.readUInt32LE(off + 20);
    const lNom = buf.readUInt16LE(off + 28);
    const lExtra = buf.readUInt16LE(off + 30);
    const lComm = buf.readUInt16LE(off + 32);
    const offLocal = buf.readUInt32LE(off + 42);
    const nom = buf.toString("latin1", off + 46, off + 46 + lNom);
    if (nomRe.test(nom)) {
      const lNomL = buf.readUInt16LE(offLocal + 26);
      const lExtraL = buf.readUInt16LE(offLocal + 28);
      const debut = offLocal + 30 + lNomL + lExtraL;
      const comp = buf.subarray(debut, debut + tailleComp);
      if (methode === 0) return { nom, contenu: comp };
      if (methode === 8) return { nom, contenu: inflateRawSync(comp) };
      throw new Error(`méthode de compression ${methode} non gérée`);
    }
    off += 46 + lNom + lExtra + lComm;
  }
  throw new Error(`aucune entrée ${nomRe} dans le ZIP`);
}

/** Normalisation pour comparer nos libellés aux désignations LPPTOT (majuscules sans
 *  accent, ponctuation et espaces repliés). */
const normaliser = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[.,;:'’()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/* ------------------------------- lecture de la base ------------------------------- */

async function obtenirBase() {
  const arg = process.argv.indexOf("--fichier");
  if (arg >= 0) {
    const chemin = process.argv[arg + 1];
    if (!chemin) throw new Error("--fichier attend un chemin");
    const brut = readFileSync(chemin);
    const contenu = brut.subarray(0, 2).toString("binary") === "PK"
      ? dezipper(brut, /^LPPTOT/i).contenu
      : brut;
    return { texte: contenu.toString("latin1"), version: chemin, sha256: sha(contenu) };
  }
  console.log(`Téléchargement de la page officielle : ${PAGE_TELECHARGEMENT}`);
  const page = (await telecharger(PAGE_TELECHARGEMENT)).toString("latin1");
  const m = page.match(/([^\s"']*download_file\.php\?filename=tips\/(LPPTOT\d+)\.zip)/);
  if (!m) throw new Error("lien LPPTOT introuvable sur la page de téléchargement CNAMTS");
  const url = m[1].startsWith("http") ? m[1] : `${HOTE_CNAMTS}${m[1]}`;
  console.log(`Base courante publiée : ${m[2]} — téléchargement de ${url}`);
  const zip = await telecharger(url);
  const { contenu } = dezipper(zip, /^LPPTOT/i);
  return { texte: contenu.toString("latin1"), version: m[2], sha256: sha(contenu) };
}

const sha = (buf) => createHash("sha256").update(buf).digest("hex");

/* --------------------------------- parseur LPPTOT --------------------------------- */

function faireLookup(DATA) {
  const reTarif = /1100101(\d{8})(\d{8})[A-Z]{4}\d{16}(\d{11})/g;
  return function lookup(code) {
    const i = DATA.indexOf("1010101" + code);
    if (i < 0) return null;
    const designation = DATA.slice(i + 14, i + 144).split("101020")[0].trim();
    const j = DATA.indexOf("1010101", i + 7);
    const zone = DATA.slice(i, j > 0 ? j : i + 4000);
    let meilleur = null;
    reTarif.lastIndex = 0;
    for (const m of zone.matchAll(reTarif)) {
      if (m[2] === "00000000" && (meilleur === null || m[1] > meilleur.debut))
        meilleur = { debut: m[1], tarif: Number(m[3]) / 100 };
    }
    return { designation, tarif: meilleur ? meilleur.tarif : null };
  };
}

/* ---------------------------------- vérifications --------------------------------- */

const ecarts = [];
const avertissements = [];
const codesConnus = new Set();
let nbCodes = 0;
let nbTarifs = 0;
let nbLibellesExacts = 0;
let nbLibellesReformules = 0;

function verifier(lookup, code, { tarif, libelle, devis, marque, contexte }) {
  nbCodes++;
  codesConnus.add(code);
  const fiche = lookup(code);
  if (!fiche) {
    ecarts.push(`CODE ABSENT       ${code}  (${contexte})`);
    return;
  }
  if (fiche.tarif === null) {
    ecarts.push(`SANS TARIF ACTIF  ${code}  (${contexte}) — radié ou hors vigueur ?`);
    return;
  }
  if (devis) {
    nbTarifs++;
    if (fiche.tarif < SENTINELLE_DEVIS)
      ecarts.push(
        `DEVIS ATTENDU     ${code}  (${contexte}) — tarif officiel ${fiche.tarif} au lieu de la sentinelle « sur devis »`,
      );
  } else if (tarif !== undefined && tarif !== null) {
    nbTarifs++;
    if (Math.abs(fiche.tarif - tarif) > 0.005)
      ecarts.push(
        `TARIF DIVERGENT   ${code}  (${contexte}) — base PRECONIA ${tarif} € / officiel ${fiche.tarif} €`,
      );
  }
  if (libelle !== undefined) {
    if (normaliser(libelle) === normaliser(fiche.designation)) nbLibellesExacts++;
    else {
      nbLibellesReformules++;
      avertissements.push(
        `libellé reformulé ${code} : « ${fiche.designation.slice(0, 70)} » → « ${libelle.slice(0, 70)} »`,
      );
    }
  }
  if (marque !== undefined && !normaliser(fiche.designation).includes(normaliser(marque)))
    avertissements.push(
      `marque non retrouvée dans la désignation ${code} : « ${marque} » vs « ${fiche.designation.slice(0, 70)} »`,
    );
}

function section(titre, fn) {
  const avantE = ecarts.length;
  const avantC = nbCodes;
  fn();
  const statut = ecarts.length === avantE ? "OK " : "ÉCART";
  console.log(`  [${statut}] ${titre} — ${nbCodes - avantC} code(s) contrôlé(s)`);
}

/** Balayage inverse (couverture) : énumère TOUS les codes de la base officielle dont la
 *  désignation commence par « VPH » et signale ceux, en vigueur, absents du catalogue
 *  PRECONIA et de la liste d'exclusions documentée — c'est la détection des nouveautés
 *  (nouvelle ligne inscrite, RBEU à venir…). Les codes sans tarif en vigueur (radiés /
 *  éteints) sont ignorés. NB : deux codes du catalogue (variantes LOGOSILVER 4918568 et
 *  4998768) ont une désignation officielle commençant par « ADJONCTION, » et non « VPH, »
 *  (nommage CNAM irrégulier) — ils échappent à ce balayage mais restent couverts par le
 *  contrôle direct, d'où un « portés » inférieur de 2 au total du catalogue. */
function verifierCouverture(DATA, lookup) {
  const codesBase = new Set();
  for (const m of DATA.matchAll(/1010101(\d{7}) +VPH\b/g)) codesBase.add(m[1]);
  let horsPerimetre = 0;
  let eteints = 0;
  let nouveautes = 0;
  for (const code of codesBase) {
    if (codesConnus.has(code)) continue;
    if (code in HORS_PERIMETRE) {
      horsPerimetre++;
      continue;
    }
    const fiche = lookup(code);
    if (!fiche || fiche.tarif === null) {
      eteints++;
      continue;
    }
    nouveautes++;
    ecarts.push(
      `CODE NON RÉPERTORIÉ ${code} — « ${fiche.designation.slice(0, 80)} » : en vigueur dans la base officielle mais absent du catalogue PRECONIA (nouveauté ?)`,
    );
  }
  return { total: codesBase.size, horsPerimetre, eteints, nouveautes };
}

async function principal() {
  const base = await obtenirBase();
  const lookup = faireLookup(base.texte);
  console.log(`\nBase officielle : ${base.version}`);
  console.log(`SHA-256 (contenu LPPTOT) : ${base.sha256}`);
  console.log(`Date d'exécution : ${new Date().toISOString()}\n`);

  section("device-lpp.json — codes mères d'achat neuf par type/classe", () => {
    const d = lireJson("device-lpp.json");
    for (const [tok, e] of Object.entries(d.byType))
      verifier(lookup, e.code, { tarif: e.tarif, contexte: `achat ${tok}` });
  });

  section("lppr-prestations.json — forfaits LLD, LCD, SAV, MAD, livraison", () => {
    const d = lireJson("lppr-prestations.json");
    for (const p of d.products)
      verifier(lookup, p.code, { tarif: p.tarif, libelle: p.label, contexte: p.category });
  });

  section("location-forfaits.json — forfaits hebdo LCD, option d'achat, MAD LCD, LLD", () => {
    const d = lireJson("location-forfaits.json");
    for (const [cat, e] of Object.entries(d.lcd))
      for (const champ of ["s13", "s26", "optionAchat"])
        verifier(lookup, e[champ], { contexte: `LCD ${cat} ${champ}` });
    verifier(lookup, d.madLcd.code, { contexte: "MAD LCD" });
    for (const [tok, code] of Object.entries(d.lld))
      verifier(lookup, code, { contexte: `LLD ${tok}` });
  });

  section("mad-forfaits.json — MAD1 / MAD2 par niveau", () => {
    const d = lireJson("mad-forfaits.json");
    for (const n of d.niveaux) {
      verifier(lookup, n.premiere, { contexte: `MAD1 niveau ${n.niveau}` });
      verifier(lookup, n.renouvellement, { contexte: `MAD2 niveau ${n.niveau}` });
    }
  });

  section("adjonctions.json — adjonctions facturables du walker (tarifs)", () => {
    const d = lireJson("adjonctions.json");
    for (const a of d.items) {
      if (a.tbd) continue; // tarif « à préciser » : pas d'assertion tarifaire
      verifier(lookup, a.code, {
        tarif: a.devis ? undefined : a.price,
        devis: !!a.devis,
        contexte: `adjonction ${a.name.slice(0, 40)}`,
      });
    }
  });

  section("pap.json — forfaits de positionnement A et B", () => {
    const d = lireJson("pap.json");
    for (const [k, f] of Object.entries(d.forfaits))
      verifier(lookup, f.code, { tarif: f.price, contexte: `PAP ${k}` });
  });

  section("meta.json — forfait de livraison", () => {
    const d = lireJson("meta.json");
    verifier(lookup, d.livraison.code, { tarif: d.livraison.price, contexte: "livraison" });
  });

  section("lppr.json — nomenclature achat neuf (moteur de recherche)", () => {
    const d = lireJson("lppr.json");
    for (const p of d.products)
      verifier(lookup, p.code, { libelle: p.label, contexte: p.category });
  });

  section("lppr-adjonctions.json — adjonctions & PAP (moteur de recherche)", () => {
    const d = lireJson("lppr-adjonctions.json");
    for (const p of d.products)
      verifier(lookup, p.code, { libelle: p.label, contexte: p.category });
  });

  section("adjonction-brands.json — variantes de marque des adjonctions", () => {
    const d = lireJson("adjonction-brands.json");
    for (const g of d.groups)
      for (const [marque, code] of Object.entries(g.byBrand))
        verifier(lookup, code, { marque, contexte: `variante ${marque}` });
  });

  section("device-models.json — modèles du catalogue (codes marque et modèle)", () => {
    const d = lireJson("device-models.json");
    for (const [tok, parMarque] of Object.entries(d.byToken))
      for (const [marque, e] of Object.entries(parMarque)) {
        verifier(lookup, e.code, { marque, contexte: `modèles ${tok} ${marque}` });
        for (const mo of e.models)
          if (mo.code) verifier(lookup, mo.code, { contexte: `modèle ${tok} ${mo.name}` });
      }
  });

  let couverture = { total: 0, horsPerimetre: 0, eteints: 0, nouveautes: 0 };
  section("couverture — codes « VPH » de la base officielle absents du catalogue", () => {
    couverture = verifierCouverture(base.texte, lookup);
  });

  /* ----------------------------------- synthèse ----------------------------------- */
  console.log(`\n================================ SYNTHÈSE ================================`);
  console.log(`Base officielle          : ${base.version} (SHA-256 ${base.sha256.slice(0, 16)}…)`);
  console.log(`Codes LPP contrôlés      : ${nbCodes}`);
  console.log(
    `Couverture inverse       : ${couverture.total} codes « VPH » recensés dans la base — ${couverture.total - couverture.horsPerimetre - couverture.eteints - couverture.nouveautes} portés, ${couverture.horsPerimetre} hors périmètre documentés, ${couverture.eteints} éteints ignorés, ${couverture.nouveautes} nouveauté(s) non couverte(s)`,
  );
  console.log(`Tarifs confrontés        : ${nbTarifs}`);
  console.log(
    `Libellés confrontés      : ${nbLibellesExacts + nbLibellesReformules} (${nbLibellesExacts} identiques, ${nbLibellesReformules} reformulés pour lisibilité)`,
  );
  console.log(`Écarts                   : ${ecarts.length}`);
  if (ecarts.length) {
    console.log(`\nÉCARTS :`);
    for (const e of ecarts) console.log(`  ${e}`);
  }
  if (process.argv.includes("--avertissements") && avertissements.length) {
    console.log(`\nAVERTISSEMENTS (${avertissements.length}) :`);
    for (const a of avertissements) console.log(`  ${a}`);
  } else if (avertissements.length) {
    console.log(
      `Avertissements           : ${avertissements.length} (libellés reformulés — détail avec --avertissements)`,
    );
  }
  console.log(
    ecarts.length === 0
      ? `\nVERDICT : base PRECONIA conforme à la base officielle ${base.version}.`
      : `\nVERDICT : ${ecarts.length} écart(s) — la base PRECONIA doit être mise à jour.`,
  );
  process.exit(ecarts.length === 0 ? 0 : 1);
}

principal().catch((e) => {
  console.error(`Erreur du vérificateur : ${e.message}`);
  process.exit(2);
});

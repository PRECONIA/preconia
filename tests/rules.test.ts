import { describe, expect, it } from "vitest";
import {
  adjBrandMap,
  adjonctions,
  deviceModelsByType,
  deviceOptionSheetByToken,
  cumulCategories,
  cumulIncompatible,
  deviceByCode,
  lcdForfaits,
  lldForfaits,
  madLcd,
  classesSco,
  madNiveaux,
  prescribers,
  evaluators,
  prestationByCode,
  deviceLppByType,
  papForfaits,
  papRegions,
} from "@/lib/data";
import {
  adaptedCode,
  brandsForBases,
  computeSubtotal,
  deriveForfaits,
  deviceAllowedForDuree,
  deviceBrandsForToken,
  deviceLpp,
  deviceModelGeneric,
  modesForDuree,
  deviceModelsForBrand,
  optionSheetFor,
  isCumulAllowed,
  cumulVerdict,
  prescriberFor,
  lcdForfaitFor,
  lcdOptionAchatFor,
  lldForfaitFor,
  madForfaitFor,
  madLcdFor,
  filterAdjonctions,
  hasBrandVariant,
  hasDeviceBrandVariant,
  hasOpenItems,
  needsBesoins,
  selectedAdjonctions,
  toggleAdjonction,
} from "@/lib/rules";

describe("filterAdjonctions (INV. 3)", () => {
  it("ne garde que les adjonctions compatibles avec le dispositif", () => {
    const frm = filterAdjonctions(deviceByCode.FRM, adjonctions);
    expect(frm.every((a) => a.compat.includes("FRM"))).toBe(true);

    const fmp = filterAdjonctions(deviceByCode.FMP, adjonctions);
    expect(fmp).toHaveLength(0); // FMP non modulaire : aucune adjonction

    const fre = filterAdjonctions(deviceByCode.FRE, adjonctions);
    expect(fre.some((a) => a.group === "aap")).toBe(false); // AAP non cumulable avec électrique
  });
});

describe("toggleAdjonction (INV. 1 — exclusivité AAP)", () => {
  const frm = deviceByCode.FRM;
  const compat = filterAdjonctions(frm, adjonctions);
  const aapAcc = adjonctions.find((a) => a.code === "4925054")!; // commande accompagnant
  const aapUti = adjonctions.find((a) => a.code === "4929796")!; // commande utilisateur

  it("cocher le second AAP décoche le premier", () => {
    let sel = toggleAdjonction({}, aapAcc, compat);
    expect(sel["4925054"]).toBe(true);
    sel = toggleAdjonction(sel, aapUti, compat);
    expect(sel["4929796"]).toBe(true);
    expect(sel["4925054"]).toBeUndefined();
  });

  it("recliquer une adjonction la décoche", () => {
    const sel = toggleAdjonction({ "4938766": true }, adjonctions.find((a) => a.code === "4938766")!, compat);
    expect(sel["4938766"]).toBeUndefined();
  });

  it("ne touche pas les adjonctions hors groupe exclusif", () => {
    let sel = toggleAdjonction({}, aapAcc, compat);
    const levier = adjonctions.find((a) => a.code === "4938766")!;
    sel = toggleAdjonction(sel, levier, compat);
    expect(sel["4925054"]).toBe(true);
    expect(sel["4938766"]).toBe(true);
  });
});

describe("deriveForfaits (INV. 2)", () => {
  const aItem = papRegions.find((r) => r.forfait === "A")!.items[0].name;
  const bItem = papRegions.find((r) => r.forfait === "B")!.items[0].name;

  it("aucun PAP → aucun forfait", () => {
    expect(deriveForfaits({}, papRegions)).toEqual([]);
  });
  it("un item A → forfait A", () => {
    expect(deriveForfaits({ [aItem]: true }, papRegions)).toEqual(["A"]);
  });
  it("items A et B → forfaits A et B, triés", () => {
    expect(deriveForfaits({ [bItem]: true, [aItem]: true }, papRegions)).toEqual(["A", "B"]);
  });
  it("un item décoché ne déclenche pas de forfait", () => {
    expect(deriveForfaits({ [aItem]: false }, papRegions)).toEqual([]);
  });
});

describe("computeSubtotal (INV. 7 — devis/tbd exclus)", () => {
  it("additionne adjonctions chiffrées + forfaits, ignore devis et tbd", () => {
    const levier = adjonctions.find((a) => a.code === "4938766")!; // 25 €
    const tablette = adjonctions.find((a) => a.code === "4970497")!; // 132 €
    const devis = adjonctions.find((a) => a.devis)!;
    // plus aucun item `tbd` dans la donnée réelle (tous les tarifs sont officiels
    // depuis la v890) : fixture synthétique pour continuer à verrouiller l'invariant.
    const tbd = { ...levier, code: "0000000", price: null, tbd: true as const };
    const total = computeSubtotal([levier, tablette, devis, tbd], ["A"], papForfaits);
    expect(total).toBe(25 + 132 + papForfaits.A.price);
    expect(hasOpenItems([devis, tbd])).toBe(true);
    expect(hasOpenItems([levier])).toBe(false);
  });

  it("les 3 anciens « tarif à préciser » portent leur tarif officiel (LPP v890)", () => {
    const expected: Record<string, number> = {
      "4904626": 1940, // DREEFT — paire de roues avec freinage intégré
      "4922720": 700, // supplément bariatrique FRM
      "4936922": 230, // harnais 4 points ou plus (POU_MRE)
    };
    for (const [code, price] of Object.entries(expected)) {
      const a = adjonctions.find((x) => x.code === code)!;
      expect(a.price).toBe(price);
      expect(a.tbd).toBeUndefined();
    }
  });
});

describe("temporalité → modes (LCD si temporaire ; ACHAT/LLD si durable)", () => {
  it("modesForDuree", () => {
    expect(modesForDuree("temp")).toEqual(["LCD"]);
    expect(modesForDuree("durable")).toEqual(["ACHAT", "LLD"]);
    expect(modesForDuree(null)).toEqual(["ACHAT", "LCD", "LLD"]);
  });

  it("temporaire (≤3 mois) : seuls les types avec LCD (FMP/FMPR/FRM/FRE)", () => {
    for (const code of ["FMP", "FMPR", "FRM", "FRE"]) {
      expect(deviceAllowedForDuree(deviceByCode[code], "temp")).toBe(true);
    }
    for (const code of ["FRMA", "FRMS", "FREP", "FREV", "POU_S", "POU_MRE", "SCO"]) {
      expect(deviceAllowedForDuree(deviceByCode[code], "temp")).toBe(false);
    }
  });

  it("durable (≥6 mois) : tous les types (tous ont ACHAT)", () => {
    for (const code of ["FMP", "FRMA", "FREP", "FREV", "POU_S", "POU_MRE", "SCO", "BASE", "CYC"]) {
      expect(deviceAllowedForDuree(deviceByCode[code], "durable")).toBe(true);
    }
  });

  it("durable + acquisition : achat → ACHAT seul ; lld → LLD seul", () => {
    expect(modesForDuree("durable", "achat")).toEqual(["ACHAT"]);
    expect(modesForDuree("durable", "lld")).toEqual(["LLD"]);
    expect(modesForDuree("durable", null)).toEqual(["ACHAT", "LLD"]);
    expect(modesForDuree("temp", "lld")).toEqual(["LCD"]); // temporaire : l'acquisition est sans objet
  });

  it("LLD : seuls FRMP, FRMV, FREP, FREV et POU_MRE sont éligibles", () => {
    for (const code of ["FRMP", "FRMV", "FREP", "FREV", "POU_MRE"]) {
      expect(deviceAllowedForDuree(deviceByCode[code], "durable", "lld")).toBe(true);
    }
    for (const code of ["FMP", "FMPR", "FRM", "FRMA", "FRMS", "FRMC", "FRE", "POU_S", "SCO", "BASE", "CYC"]) {
      expect(deviceAllowedForDuree(deviceByCode[code], "durable", "lld")).toBe(false);
    }
  });
});

describe("forfaits de location (codes LPPR LCD hebdo / option d'achat / LLD trimestriel / MAD LCD)", () => {
  it("lcdForfaitFor : forfait hebdo officiel selon la catégorie et la durée", () => {
    expect(lcdForfaitFor("FRM", "s13", lcdForfaits, prestationByCode)).toMatchObject({
      code: "1290922",
      price: 4.7,
      unit: "semaine",
    });
    expect(lcdForfaitFor("FRE", "s26", lcdForfaits, prestationByCode)).toMatchObject({
      code: "1225178",
      price: 74.47,
      unit: "semaine",
    });
    expect(lcdForfaitFor("FMP", "s13", lcdForfaits, prestationByCode)).toMatchObject({
      code: "1268182",
      price: 3.82,
    });
    expect(lcdForfaitFor("FMPR", "s26", lcdForfaits, prestationByCode)).toMatchObject({
      code: "1277376",
      price: 6.43,
    });
  });

  it("lcdForfaitFor : null sans durée ou pour une catégorie non louable en LCD", () => {
    expect(lcdForfaitFor("FRM", null, lcdForfaits, prestationByCode)).toBeNull();
    expect(lcdForfaitFor("FREP", "s13", lcdForfaits, prestationByCode)).toBeNull();
  });

  it("lcdOptionAchatFor : option d'achat officielle de la catégorie", () => {
    expect(lcdOptionAchatFor("FRM", lcdForfaits, prestationByCode)).toMatchObject({
      code: "1215560",
      price: 133.09,
    });
    expect(lcdOptionAchatFor("FRE", lcdForfaits, prestationByCode)).toMatchObject({
      code: "1273020",
      price: 948.36,
    });
    expect(lcdOptionAchatFor("FREP", lcdForfaits, prestationByCode)).toBeNull();
  });

  it("lldForfaitFor : forfait trimestriel officiel (FREP par classe)", () => {
    expect(lldForfaitFor(deviceByCode.FREP, "B", lldForfaits, prestationByCode)).toMatchObject({
      code: "4762238",
      price: 1021.13,
      unit: "trimestre",
    });
    expect(lldForfaitFor(deviceByCode.FREP, "A", lldForfaits, prestationByCode)).toMatchObject({
      code: "4706211",
      price: 755.64,
    });
    expect(lldForfaitFor(deviceByCode.FRMV, null, lldForfaits, prestationByCode)).toMatchObject({
      code: "4776720",
      price: 856.86,
    });
    expect(lldForfaitFor(deviceByCode.FREV, "C", lldForfaits, prestationByCode)).toMatchObject({
      code: "4780118",
      price: 1725.29,
    });
  });

  it("lldForfaitFor : null si la classe requise manque ou catégorie non éligible", () => {
    expect(lldForfaitFor(deviceByCode.FREP, null, lldForfaits, prestationByCode)).toBeNull();
    expect(lldForfaitFor(deviceByCode.FRM, null, lldForfaits, prestationByCode)).toBeNull();
    expect(lldForfaitFor(deviceByCode.FRE, "B", lldForfaits, prestationByCode)).toBeNull();
  });

  it("madLcdFor : forfait MAD LCD (1213650, 20 €) réservé aux FRM et FRE", () => {
    expect(madLcdFor("FRM", madLcd, prestationByCode)).toMatchObject({
      code: "1213650",
      price: 20,
    });
    expect(madLcdFor("FRE", madLcd, prestationByCode)).toMatchObject({ code: "1213650" });
    expect(madLcdFor("FMP", madLcd, prestationByCode)).toBeNull();
    expect(madLcdFor("FMPR", madLcd, prestationByCode)).toBeNull();
  });
});

describe("needsBesoins (gating = dispositifs électriques et scooters)", () => {
  it("true pour FRE/FREP/FREV et SCO ; false pour les manuels et autres", () => {
    for (const code of ["FRE", "FREP", "FREV", "SCO"]) {
      expect(needsBesoins(deviceByCode[code])).toBe(true);
    }
    for (const code of ["FMP", "FRM", "FRMA", "BASE", "POU_S", "CYC"]) {
      expect(needsBesoins(deviceByCode[code])).toBe(false);
    }
  });
});

describe("scooter (SCO) dans le parcours — arrêté du 06/02/2025", () => {
  const sco = deviceByCode.SCO;

  it("achat uniquement : exclu des parcours LCD et LLD", () => {
    expect(deviceAllowedForDuree(sco, "temp", null)).toBe(false);
    expect(deviceAllowedForDuree(sco, "durable", "lld")).toBe(false);
    expect(deviceAllowedForDuree(sco, "durable", "achat")).toBe(true);
  });

  it("codes d'achat neuf par classe d'usage (jetons SCO-A/B/C, base LPP)", () => {
    expect(deviceLpp(sco, "A", deviceLppByType)).toMatchObject({ code: "4541193", tarif: 1300 });
    expect(deviceLpp(sco, "B", deviceLppByType)).toMatchObject({ code: "4515072", tarif: 2100 });
    expect(deviceLpp(sco, "C", deviceLppByType)).toMatchObject({ code: "4568000", tarif: 3800 });
    expect(deviceLpp(sco, null, deviceLppByType)).toBeNull(); // classe requise
  });

  it("MAD niveau 1 : MAD1 4841966 (première) / MAD2 4811876 (renouvellement identique)", () => {
    expect(madForfaitFor("SCO", "premiere", madNiveaux, prestationByCode)).toMatchObject({
      code: "4841966",
      niveau: 1,
    });
    expect(madForfaitFor("SCO", "renouv_id", madNiveaux, prestationByCode)).toMatchObject({
      code: "4811876",
      niveau: 1,
    });
  });

  it("adjonctions : seul le supplément bariatrique électrique est compatible", () => {
    const compat = filterAdjonctions(sco, adjonctions);
    expect(compat.map((a) => a.code)).toEqual(["4902165"]);
  });

  it("prescription : équipe pluridisciplinaire + DAP ; classes d'usage A+/B/C", () => {
    expect(sco.presc).toBe("pluri");
    expect(sco.dap).toBe(true);
    expect(classesSco.map((c) => c.label)).toEqual(["Classe A+", "Classe B", "Classe C"]);
    expect(classesSco.map((c) => c.value)).toEqual(["A", "B", "C"]);
  });
});

describe("selectedAdjonctions", () => {
  it("retourne les adjonctions cochées", () => {
    const sel = selectedAdjonctions({ "4938766": true }, adjonctions);
    expect(sel.map((a) => a.code)).toEqual(["4938766"]);
  });
});

describe("adaptation du code LPP à la marque", () => {
  const base = "4954630"; // supplément appui-tête réglable — possède des variantes de marque
  const brands = brandsForBases([base], adjBrandMap);

  it("le code mère expose des marques disponibles", () => {
    expect(brands.length).toBeGreaterThan(0);
  });

  it("renvoie la variante de marque si elle existe, sinon le code mère (jamais inventé)", () => {
    const b = brands[0];
    const variant = adaptedCode(base, b, adjBrandMap);
    expect(variant).toBe(adjBrandMap.get(base)![b]);
    expect(variant).not.toBe(base);
    expect(adaptedCode(base, "MARQUE_INEXISTANTE", adjBrandMap)).toBe(base);
    expect(adaptedCode(base, null, adjBrandMap)).toBe(base);
  });

  it("hasBrandVariant : vrai si variante, faux sinon (ex. DREEFT sans variante)", () => {
    expect(hasBrandVariant(base, brands[0], adjBrandMap)).toBe(true);
    expect(hasBrandVariant(base, null, adjBrandMap)).toBe(false);
    expect(hasBrandVariant("4904626", brands[0], adjBrandMap)).toBe(false);
  });
});

describe("deviceLpp (code LPP + tarif du fauteuil)", () => {
  it("manuel : token = code, tarif présent (FRM/FRMA validés)", () => {
    const frm = deviceLpp(deviceByCode.FRM, null, deviceLppByType);
    expect(frm?.code).toBeTruthy();
    expect(typeof frm?.tarif).toBe("number");
    expect(deviceLpp(deviceByCode.FRMA, null, deviceLppByType)?.tarif).toBe(6276);
  });

  it("électrique FRE : dépend de la classe (FRE-A ≠ FRE-C)", () => {
    const a = deviceLpp(deviceByCode.FRE, "A", deviceLppByType);
    const c = deviceLpp(deviceByCode.FRE, "C", deviceLppByType);
    expect(a?.code).toBeTruthy();
    expect(c?.code).toBeTruthy();
    expect(a?.code).not.toBe(c?.code);
  });

  it("FRE sans classe → null", () => {
    expect(deviceLpp(deviceByCode.FRE, null, deviceLppByType)).toBeNull();
  });

  it("FREV : pas de classe requise", () => {
    expect(deviceLpp(deviceByCode.FREV, null, deviceLppByType)?.code).toBeTruthy();
  });

  it("codes mères officiels non marqués (CERAH/AMELI) : FREP-B=4521010, FREV=4563467", () => {
    // garde-fou : 9527944 (FREP-B) et 9557595 (FREV) sont des variantes SKS ROLTEC, pas les mères.
    expect(deviceLpp(deviceByCode.FREP, "B", deviceLppByType)?.code).toBe("4521010");
    expect(deviceLpp(deviceByCode.FREV, null, deviceLppByType)?.code).toBe("4563467");
  });
});

describe("deviceLpp — code par marque (catalogue CERAH, code propre, jamais inventé)", () => {
  const mereFrepB = deviceLpp(deviceByCode.FREP, "B", deviceLppByType)!;

  it("FREP-B + OTTO BOCK → code propre de la marque (≠ code mère)", () => {
    const v = deviceLpp(deviceByCode.FREP, "B", deviceLppByType, deviceModelsByType, "OTTO BOCK")!;
    expect(v.code).toBe("9535725");
    expect(v.code).not.toBe(mereFrepB.code);
    expect(hasDeviceBrandVariant(deviceByCode.FREP, "B", "OTTO BOCK", deviceModelsByType)).toBe(true);
  });

  it("le tarif reste celui de la ligne (pas de tarif par modèle)", () => {
    const v = deviceLpp(deviceByCode.FREP, "B", deviceLppByType, deviceModelsByType, "OTTO BOCK")!;
    expect(v.tarif).toBe(mereFrepB.tarif);
  });

  it("marque inconnue ou nulle → repli sur le code mère", () => {
    expect(deviceLpp(deviceByCode.FREP, "B", deviceLppByType, deviceModelsByType, "MARQUE_X")!.code).toBe(
      mereFrepB.code,
    );
    expect(deviceLpp(deviceByCode.FREP, "B", deviceLppByType, deviceModelsByType, null)!.code).toBe(
      mereFrepB.code,
    );
    expect(hasDeviceBrandVariant(deviceByCode.FREP, "B", null, deviceModelsByType)).toBe(false);
  });

  it("deviceModelsForBrand : modèles OTTO BOCK (OTTO Juvo Bx), triés ; vide si pas de marque", () => {
    const models = deviceModelsForBrand(deviceByCode.FREP, "B", "OTTO BOCK", deviceModelsByType);
    expect(models.length).toBeGreaterThan(1);
    expect(models.some((m) => m.includes("Juvo"))).toBe(true);
    expect([...models].sort((a, b) => a.localeCompare(b))).toEqual(models);
    expect(deviceModelsForBrand(deviceByCode.FREP, "B", null, deviceModelsByType)).toEqual([]);
  });

  it("optionSheetFor : null sans marque/modèle ; entrée valide si répertoriée", () => {
    const dev = deviceByCode.FREP;
    expect(optionSheetFor(dev, "A", null, "Q300 M Mini Sedeo Pro", deviceOptionSheetByToken)).toBeNull();
    expect(optionSheetFor(dev, "A", "SUNRISE MED", null, deviceOptionSheetByToken)).toBeNull();
    // modèle inconnu → pas de fiche
    expect(
      optionSheetFor(dev, "A", "SUNRISE MED", "Modèle inexistant", deviceOptionSheetByToken),
    ).toBeNull();
    // toute entrée présente doit être une URL http(s) avec un kind connu
    for (const byBrand of Object.values(deviceOptionSheetByToken)) {
      for (const models of Object.values(byBrand)) {
        for (const s of Object.values(models)) {
          expect(s.url).toMatch(/^https?:\/\//);
          expect(["pdf", "page"]).toContain(s.kind);
        }
      }
    }
  });

  it("optionSheetFor : Q300 M Mini Sedeo Pro a des fiches distinctes en FREP-A et FREP-B", () => {
    const dev = deviceByCode.FREP;
    const a = optionSheetFor(dev, "A", "SUNRISE MED", "Q300 M Mini Sedeo Pro", deviceOptionSheetByToken);
    const b = optionSheetFor(dev, "B", "SUNRISE MED", "Q300 M Mini Sedeo Pro", deviceOptionSheetByToken);
    expect(a?.url).toBeTruthy();
    expect(b?.url).toBeTruthy();
    expect(a?.url).not.toBe(b?.url);
  });

  it("deviceBrandsForToken : trié et inclut OTTO BOCK", () => {
    const brands = deviceBrandsForToken(deviceByCode.FREP, "B", deviceModelsByType);
    expect(brands).toContain("OTTO BOCK");
    expect([...brands].sort((a, b) => a.localeCompare(b))).toEqual(brands);
  });

  it("modèle codé → code de la marque ; modèle sans code → repli code générique (mère) + drapeau", () => {
    const models = deviceModelsByType["FREP-B"]["SUNRISE MED"].models;
    const coded = models.find((m) => m.code)!;
    const codeless = models.find((m) => !m.code)!;
    expect(coded).toBeTruthy();
    expect(codeless).toBeTruthy(); // SUNRISE FREP-B a des modèles sans code (ex. Frontier V6)

    const codedLpp = deviceLpp(
      deviceByCode.FREP, "B", deviceLppByType, deviceModelsByType, "SUNRISE MED", coded.name,
    )!;
    expect(codedLpp.code).toBe(coded.code);
    expect(deviceModelGeneric(deviceByCode.FREP, "B", "SUNRISE MED", coded.name, deviceModelsByType)).toBe(false);

    const genericLpp = deviceLpp(
      deviceByCode.FREP, "B", deviceLppByType, deviceModelsByType, "SUNRISE MED", codeless.name,
    )!;
    expect(genericLpp.code).toBe(mereFrepB.code); // code générique (mère)
    expect(deviceModelGeneric(deviceByCode.FREP, "B", "SUNRISE MED", codeless.name, deviceModelsByType)).toBe(true);
  });
});

describe("madForfaitFor (forfaits MAD1/MAD2 par niveau)", () => {
  it("niveau selon la catégorie, code selon le contexte, tarifs officiels", () => {
    // FREP = niveau 3 : MAD1 375 €, MAD2 187,50 €
    const p3 = madForfaitFor("FREP", "premiere", madNiveaux, prestationByCode)!;
    expect(p3).toMatchObject({ code: "4865487", price: 375, niveau: 3 });
    const r3 = madForfaitFor("FREP", "renouv_id", madNiveaux, prestationByCode)!;
    expect(r3).toMatchObject({ code: "4891059", price: 187.5, niveau: 3 });
    // renouvellement avec changement de catégorie → MAD1 (pas « à l'identique »)
    expect(madForfaitFor("FREP", "renouv_cat", madNiveaux, prestationByCode)).toMatchObject({
      code: "4865487",
      price: 375,
      niveau: 3,
    });
    // FRE = niveau 2 ; SCO = niveau 1
    expect(madForfaitFor("FRE", "renouv_id", madNiveaux, prestationByCode)).toMatchObject({
      code: "4836273",
      price: 125,
      niveau: 2,
    });
    expect(madForfaitFor("SCO", "premiere", madNiveaux, prestationByCode)).toMatchObject({
      code: "4841966",
      price: 100,
      niveau: 1,
    });
  });

  it("null si contexte absent ou dispositif hors niveaux (FMP, FMPR)", () => {
    expect(madForfaitFor("FREP", null, madNiveaux, prestationByCode)).toBeNull();
    expect(madForfaitFor("FMP", "premiere", madNiveaux, prestationByCode)).toBeNull();
    expect(madForfaitFor("FMPR", "renouv_id", madNiveaux, prestationByCode)).toBeNull();
  });

  it("tout device des niveaux existe et chaque device apparaît dans au plus un niveau", () => {
    const seen = new Set<string>();
    for (const n of madNiveaux) {
      for (const dc of n.devices) {
        expect(deviceByCode[dc], dc).toBeDefined();
        expect(seen.has(dc)).toBe(false);
        seen.add(dc);
      }
    }
  });
});

describe("isCumulAllowed (module cumul VPH)", () => {
  const I = cumulIncompatible;

  it("null tant qu'un choix manque", () => {
    expect(isCumulAllowed(null, "FRM", I)).toBeNull();
    expect(isCumulAllowed("FRM", null, I)).toBeNull();
  });

  it("cumuls interdits (incompatibilités du document)", () => {
    expect(isCumulAllowed("FMP", "FMPR", I)).toBe(false);
    expect(isCumulAllowed("FRM", "FRMA", I)).toBe(false);
    expect(isCumulAllowed("FRMC", "FRMP", I)).toBe(false);
    expect(isCumulAllowed("FRE", "AAP", I)).toBe(false); // AAP figure dans FRE
    expect(isCumulAllowed("SCO", "FREP", I)).toBe(false);
    expect(isCumulAllowed("POU_S", "POU_MRE", I)).toBe(false);
    expect(isCumulAllowed("FRM", "FRM", I)).toBe(false); // deux fois la même catégorie
  });

  it("cumuls interdits — tableau gouvernemental + arrêté (Titre IV 4.2)", () => {
    expect(isCumulAllowed("FRM", "FRMV", I)).toBe(false); // deux manuels modulaires
    expect(isCumulAllowed("FRMP", "FRMV", I)).toBe(false);
    expect(isCumulAllowed("FRM", "FRMC", I)).toBe(false);
    expect(isCumulAllowed("FRE", "FREP", I)).toBe(false); // deux électriques modulaires
    expect(isCumulAllowed("FREP", "FREV", I)).toBe(false);
    expect(isCumulAllowed("SCO", "FREP", I)).toBe(false); // scooter + électrique
    expect(isCumulAllowed("CYC", "FRM", I)).toBe(false); // cycle + manuel modulaire (inchangé)
  });

  it("cumuls manuel modulaire ↔ électrique modulaire : AUTORISÉS (tableau gouvernemental)", () => {
    for (const m of ["FRM", "FRMC", "FRMA", "FRMP", "FRMV"]) {
      for (const e of ["FRE", "FREP", "FREV"]) {
        expect(isCumulAllowed(m, e, I), `${m}×${e}`).toBe(true);
      }
    }
  });

  it("AAP ↔ scooter : INTERDIT (l'AAP s'apparente à une propulsion électrique)", () => {
    expect(isCumulAllowed("AAP", "SCO", I)).toBe(false);
    expect(isCumulAllowed("SCO", "AAP", I)).toBe(false);
  });

  it("siège coquille : incompatible avec tout", () => {
    for (const c of cumulCategories) {
      expect(isCumulAllowed("SIEGE_COQUILLE", c.code, I)).toBe(false);
    }
  });

  it("cumuls autorisés", () => {
    expect(isCumulAllowed("FMP", "FRE", I)).toBe(true); // non modulaire + électrique
    expect(isCumulAllowed("FRMS", "FRM", I)).toBe(true); // exception sport (4.2)
    expect(isCumulAllowed("FRMS", "FRE", I)).toBe(true); // exception sport, y compris électrique
    expect(isCumulAllowed("BASE", "FRE", I)).toBe(true);
    expect(isCumulAllowed("SCO", "FRM", I)).toBe(true); // scooter + manuel (tableau gouvernemental)
  });

  it("relation symétrique", () => {
    for (const a of cumulCategories) {
      for (const b of cumulCategories) {
        expect(isCumulAllowed(a.code, b.code, I)).toBe(isCumulAllowed(b.code, a.code, I));
      }
    }
  });
});

describe("cumulVerdict (modes ACHAT/LLD/LCD — Titre IV 4.1)", () => {
  const I = cumulIncompatible;

  it("null tant qu'un choix manque", () => {
    expect(cumulVerdict(null, "ACHAT", "FRE", "LCD", I)).toBeNull();
    expect(cumulVerdict("FRM", "LCD", null, "ACHAT", I)).toBeNull();
  });

  it("hors LCD : délègue à la matrice d'incompatibilités", () => {
    expect(cumulVerdict("FRE", "ACHAT", "FREP", "LLD", I)).toBe("interdit"); // deux électriques
    expect(cumulVerdict("FRM", "ACHAT", "FRE", "LLD", I)).toBe("autorise"); // manuel + électrique
    expect(cumulVerdict("FRMS", "ACHAT", "FRE", "ACHAT", I)).toBe("autorise");
    expect(cumulVerdict("BASE", "ACHAT", "FRE", "LLD", I)).toBe("autorise");
  });

  it("toute prise en charge LCD est exclusive", () => {
    expect(cumulVerdict("FRM", "LCD", "FMP", "ACHAT", I)).toBe("interdit");
    expect(cumulVerdict("FMP", "ACHAT", "FRM", "LCD", I)).toBe("interdit");
    expect(cumulVerdict("FRM", "LCD", "FRE", "LCD", I)).toBe("interdit"); // deux LCD concomitantes
    // même des catégories cumulables hors location deviennent interdites en LCD
    expect(cumulVerdict("BASE", "ACHAT", "FRM", "LCD", I)).toBe("interdit");
  });

  it("dérogation : LCD d'un FRE malgré un manuel possédé sans AAP", () => {
    for (const owned of ["FMP", "FMPR", "FRM", "FRMV", "FRMC", "FRMP"]) {
      expect(cumulVerdict(owned, "ACHAT", "FRE", "LCD", I)).toBe("derogation");
    }
    expect(cumulVerdict("FRM", "LLD", "FRE", "LCD", I)).toBe("derogation");
    expect(cumulVerdict("AAP", "ACHAT", "FRE", "LCD", I)).toBe("interdit"); // AAP exclut la dérogation
    expect(cumulVerdict("FRMA", "ACHAT", "FRE", "LCD", I)).toBe("interdit"); // FRMA hors liste 4.1
    expect(cumulVerdict("FRE", "LCD", "FRM", "ACHAT", I)).toBe("interdit"); // sens inverse : épisode LCD en cours
  });
});

describe("prescriberFor (palier selon le mode — 9.5, 3.1.6)", () => {
  const P = prescribers;

  it("LCD manuelle : médecin, ergothérapeute ou kinésithérapeute (9.5.a)", () => {
    for (const code of ["FMP", "FMPR", "FRM"]) {
      const line = prescriberFor(deviceByCode[code], "lcd", "premiere", P);
      expect(line).toContain("kinésithérapeute");
    }
  });

  it("LCD FRE : palier restreint + certificat (9.5.b)", () => {
    const line = prescriberFor(deviceByCode.FRE, "lcd", "premiere", P);
    expect(line).toContain("équipe pluridisciplinaire");
    expect(line).toContain("certificat");
  });

  it("renouvellement à l'identique : généraliste ou ergothérapeute (3.1.6)", () => {
    const line = prescriberFor(deviceByCode.FREP, "achat", "renouv_id", P);
    expect(line).toContain("généraliste");
    const lld = prescriberFor(deviceByCode.FREP, "lld", "renouv_id", P);
    expect(lld).toContain("généraliste");
  });

  it("achat / LLD hors renouvellement à l'identique : palier de la catégorie", () => {
    expect(prescriberFor(deviceByCode.FRE, "achat", "premiere", P)).toBe(P.pluri);
    expect(prescriberFor(deviceByCode.FRMP, "lld", "renouv_cat", P)).toBe(P.spe);
    expect(prescriberFor(deviceByCode.FRM, "achat", null, P)).toBe(P.large);
    // le palier « spe » (§3.1.4.2.4.b) mentionne l'ergothérapeute
    expect(P.spe).toContain("ergothérapeute");
  });
});

describe("évaluation/préconisation distincte du prescripteur (§3.1.4.2.1)", () => {
  it("champ eval par catégorie : équipe / compétent / aucune", () => {
    for (const code of ["FRMS", "FRMV", "FRE", "FREP", "FREV", "POU_MRE", "CYC", "SCO"])
      expect(deviceByCode[code].eval, code).toBe("equipe");
    for (const code of ["FRM", "FRMC", "FRMA", "FRMP"])
      expect(deviceByCode[code].eval, code).toBe("competent");
    for (const code of ["FMP", "FMPR", "BASE", "POU_S"])
      expect(deviceByCode[code].eval, code).toBe("aucune");
  });

  it("cohérence eval « aucune » ⟺ pas de fiche", () => {
    for (const d of Object.values(deviceByCode))
      expect(d.eval === "aucune", d.code).toBe(d.fiche === false);
  });

  it("libellés d'évaluation présents pour chaque valeur", () => {
    for (const k of ["equipe", "competent", "aucune"] as const)
      expect(evaluators[k]).toBeTruthy();
  });
});

import { describe, expect, it } from "vitest";
import {
  adjBrandMap,
  adjonctions,
  deviceModelsByType,
  deviceOptionSheetByToken,
  deviceByCode,
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
    const tbd = adjonctions.find((a) => a.tbd)!;
    const total = computeSubtotal([levier, tablette, devis, tbd], ["A"], papForfaits);
    expect(total).toBe(25 + 132 + papForfaits.A.price);
    expect(hasOpenItems([devis, tbd])).toBe(true);
    expect(hasOpenItems([levier])).toBe(false);
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
});

describe("needsBesoins (gating = dispositifs électriques)", () => {
  it("true pour FRE/FREP/FREV ; false pour les manuels et autres", () => {
    for (const code of ["FRE", "FREP", "FREV"]) {
      expect(needsBesoins(deviceByCode[code])).toBe(true);
    }
    for (const code of ["FMP", "FRM", "FRMA", "BASE", "POU_S", "SCO", "CYC"]) {
      expect(needsBesoins(deviceByCode[code])).toBe(false);
    }
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

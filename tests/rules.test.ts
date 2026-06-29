import { describe, expect, it } from "vitest";
import { adjonctions, deviceByCode, papForfaits, papRegions } from "@/lib/data";
import {
  computeSubtotal,
  deriveForfaits,
  filterAdjonctions,
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

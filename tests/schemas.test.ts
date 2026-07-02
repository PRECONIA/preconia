import { describe, expect, it } from "vitest";
import {
  adjGroups,
  adjonctions,
  deviceByCode,
  meta,
  papForfaits,
  papRegions,
  prestationProducts,
} from "@/lib/data";

/* Le seul fait d'importer `@/lib/data` exécute la validation zod + les contrôles
   inter-fichiers : si un JSON est invalide, l'import lève et toute la suite échoue.
   Les tests ci-dessous verrouillent en plus les INVARIANTS portant sur la donnée. */

describe("intégrité de la donnée (data/*.json)", () => {
  it("charge la donnée sans lever (schémas zod + cohérence inter-fichiers)", () => {
    expect(adjonctions.length).toBeGreaterThan(0);
    expect(Object.keys(deviceByCode).length).toBeGreaterThan(0);
  });

  it("INV. 3 — tout code de compat existe dans devices", () => {
    for (const a of adjonctions) {
      for (const code of a.compat) {
        expect(deviceByCode[code], `${a.code} → ${code}`).toBeDefined();
      }
    }
  });

  it("tout group d'adjonction est défini dans groups", () => {
    for (const a of adjonctions) expect(a.group in adjGroups).toBe(true);
  });

  it("INV. 1 — les AAP portent exclusiveGroup 'aap' et ne ciblent que des manuels modulaires", () => {
    const aaps = adjonctions.filter((a) => a.group === "aap");
    expect(aaps.length).toBe(2);
    for (const a of aaps) {
      expect(a.exclusiveGroup).toBe("aap");
      for (const code of a.compat) {
        expect(deviceByCode[code].family).toMatch(/Manuel/);
        expect(deviceByCode[code].electric).toBe(false);
      }
    }
  });

  it("INV. 2 — chaque région PAP référence un forfait défini (A ou B)", () => {
    for (const region of papRegions) {
      expect(papForfaits[region.forfait]).toBeDefined();
    }
  });

  it("INV. 4 — prestations : codes uniques, tarifs > 0, livraison alignée sur meta", () => {
    const codes = prestationProducts.map((p) => p.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const p of prestationProducts) expect(p.tarif).toBeGreaterThan(0);
    const livraison = prestationProducts.find((p) => p.code === meta.livraison.code);
    expect(livraison?.tarif).toBe(meta.livraison.price);
    // les 4 familles de prestations sont présentes
    const cats = new Set(prestationProducts.map((p) => p.category));
    expect(cats.size).toBe(4);
  });
});

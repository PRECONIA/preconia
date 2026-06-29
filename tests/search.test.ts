import { describe, expect, it } from "vitest";
import { catalog, normalize, parseLpprBrand, searchCatalog } from "@/lib/search";

describe("catalogue de recherche", () => {
  it("indexe les VPH scrappés + adjonctions + forfaits PAP", () => {
    expect(catalog.length).toBeGreaterThan(150);
    expect(catalog.some((e) => e.kind === "vph")).toBe(true);
    expect(catalog.some((e) => e.kind === "adjonction")).toBe(true);
    expect(catalog.some((e) => e.kind === "pap")).toBe(true);
  });
});

describe("normalize", () => {
  it("minuscule + sans accents", () => {
    expect(normalize("ÉLECTRIQUE")).toBe("electrique");
    expect(normalize("Vermeiren")).toBe("vermeiren");
  });
});

describe("searchCatalog", () => {
  it("ignore les requêtes trop courtes", () => {
    expect(searchCatalog("a")).toEqual([]);
    expect(searchCatalog(" ")).toEqual([]);
  });

  it("trouve un produit par code LPP exact", () => {
    const r = searchCatalog("4551435");
    expect(r[0]?.code).toBe("4551435");
    expect(r[0]?.kind).toBe("vph");
  });

  it("trouve par dénomination, insensible aux accents/casse", () => {
    const r = searchCatalog("electrique");
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((e) => normalize(e.label).includes("electrique"))).toBe(true);
  });

  it("retrouve une adjonction par libellé", () => {
    const r = searchCatalog("appui-tête");
    expect(r.some((e) => e.kind === "adjonction")).toBe(true);
  });

  it("respecte la limite de résultats", () => {
    expect(searchCatalog("vph", 5).length).toBeLessThanOrEqual(5);
  });

  it("trouve par marque et expose la vignette marque", () => {
    const r = searchCatalog("invacare");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]?.brand).toBe("INVACARE");
  });
});

describe("parseLpprBrand", () => {
  it("extrait la marque collée (sans espace après la virgule)", () => {
    expect(
      parseLpprBrand("VPH, ACHAT NEUF, FMPR, NON-MODUL., MANUEL/POUSSER,INVACARE").brand,
    ).toBe("INVACARE");
  });
  it("extrait la marque précédée d'une virgule + espace", () => {
    expect(
      parseLpprBrand("VPH, ACHAT NEUF, FREV, MODULAIRE ÉLECTRIQUE DE VERTICALISATION, SKS ROLTEC")
        .brand,
    ).toBe("SKS ROLTEC");
  });
  it("ne confond pas une description avec une marque (code mère)", () => {
    const r = parseLpprBrand("VPH, ACHAT NEUF, FRE-C, MODULAIRE À PROPULSION PAR MOTEUR ÉLECTRIQUE - CLASSE C");
    expect(r.brand).toBeNull();
  });
});

describe("vignettes marque dans le catalogue", () => {
  it("au moins 100 produits VPH portent une marque", () => {
    const branded = catalog.filter((e) => e.kind === "vph" && e.brand);
    expect(branded.length).toBeGreaterThanOrEqual(100);
  });
});

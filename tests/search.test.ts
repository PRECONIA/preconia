import { describe, expect, it } from "vitest";
import { catalog, normalize, parseLpprBrand, searchCatalog } from "@/lib/search";

describe("catalogue de recherche", () => {
  it("indexe les VPH scrappés + adjonctions + forfaits PAP + prestations", () => {
    expect(catalog.length).toBeGreaterThan(150);
    expect(catalog.some((e) => e.kind === "vph")).toBe(true);
    expect(catalog.some((e) => e.kind === "adjonction")).toBe(true);
    expect(catalog.some((e) => e.kind === "pap")).toBe(true);
    expect(catalog.some((e) => e.kind === "prestation")).toBe(true);
  });

  it("prestations : LLD par token, MAD/livraison/batterie trouvables", () => {
    // « frep-b lld » → le forfait trimestriel LLD FREP-B (4762238)
    const lld = searchCatalog("frep-b lld");
    expect(lld.some((e) => e.code === "4762238" && e.kind === "prestation")).toBe(true);
    // filtre catégorie prestation (chips MAD de l'UI)
    const mad = searchCatalog(
      "",
      { kind: "prestation", category: "Mise à disposition & livraison (MAD)" },
      50,
    );
    expect(mad.length).toBeGreaterThanOrEqual(8);
    expect(mad.every((e) => e.kind === "prestation")).toBe(true);
    // forfait de livraison indexé + batterie (SAV4)
    expect(searchCatalog("1266390").some((e) => e.code === "1266390")).toBe(true);
    expect(searchCatalog("batterie").some((e) => e.code === "4891384")).toBe(true);
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
    expect(searchCatalog("vph", {}, 5).length).toBeLessThanOrEqual(5);
  });

  it("trouve par marque et expose la vignette marque", () => {
    const r = searchCatalog("invacare");
    expect(r.length).toBeGreaterThan(0);
    expect(r[0]?.brand).toBe("INVACARE");
  });

  it("token souple : « FREP B », « FREP-B », « FREPB » donnent les mêmes FREP-B", () => {
    const a = searchCatalog("frep b").map((e) => e.code).sort();
    const b = searchCatalog("frep-b").map((e) => e.code).sort();
    const c = searchCatalog("frepb").map((e) => e.code).sort();
    expect(a.length).toBeGreaterThan(0);
    expect(a).toEqual(b);
    expect(a).toEqual(c);
    expect(searchCatalog("frep-b").every((e) => e.token === "FREP-B")).toBe(true);
  });

  it("type + marque : « frep b otto » → FREP-B de la marque OTTO BOCK", () => {
    const r = searchCatalog("frep b otto");
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.token === "FREP-B" && e.brand === "OTTO BOCK")).toBe(true);
  });

  it("nature + marque : « adjonction otto » → adjonctions OTTO BOCK uniquement", () => {
    const r = searchCatalog("adjonction otto");
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.kind === "adjonction" && e.brand === "OTTO BOCK")).toBe(true);
  });

  it("filtre PAP-A (bouton rapide) : que des forfaits PAP A", () => {
    const r = searchCatalog("", { kind: "pap", papForfait: "A" }, 50);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.kind === "pap" && e.papForfait === "A")).toBe(true);
  });

  it("filtre marque seul (sélecteur) : que des produits de la marque", () => {
    const r = searchCatalog("", { brand: "OTTO BOCK" }, 100);
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.brand === "OTTO BOCK")).toBe(true);
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

describe("indexation exhaustive & forfaits PAP de marque", () => {
  it("« forfait A » remonte le générique ET les variantes de marque (PAP)", () => {
    const r = searchCatalog("forfait A", {}, 100);
    const pa = r.filter((e) => e.kind === "pap" && e.papForfait === "A");
    expect(pa.length).toBeGreaterThan(5); // générique + de nombreuses marques
    expect(pa.some((e) => e.brand === null)).toBe(true); // le générique
    expect(pa.some((e) => e.brand)).toBe(true); // au moins une marque
    // aucun n'est classé « adjonction » (le bug de la virgule « PAP, FORFAIT A »)
    expect(r.some((e) => e.papForfait === "A" && e.kind === "adjonction")).toBe(false);
  });

  it("bouton PAP-A : filtre kind=pap papForfait=A → générique + marques", () => {
    const r = searchCatalog("", { kind: "pap", papForfait: "A" }, 100);
    expect(r.length).toBeGreaterThan(5);
    expect(r.every((e) => e.kind === "pap" && e.papForfait === "A")).toBe(true);
  });

  it("les 6 variantes LOGO SILVER (LPPTOT891) sont indexées", () => {
    for (const code of ["9902684", "9927721", "9962829", "9967169", "9974749", "9982795"]) {
      const r = searchCatalog(code, {}, 20);
      expect(r.some((e) => e.code === code), code).toBe(true);
    }
  });

  it("chaque code d'adjonction de marque (adjonction-brands) est trouvable par son code", () => {
    // échantillon : recherche par code exact renvoie l'entrée
    const echantillon = ["9974749", "9956697", "9535725"]; // LOGO SILVER appui-tête, SKS forfait A, OTTO FREP-B
    for (const c of echantillon) {
      expect(searchCatalog(c, {}, 10).some((e) => e.code === c), c).toBe(true);
    }
  });
});

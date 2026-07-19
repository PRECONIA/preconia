import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAliasMap, expandQuery, normIndex } from "@/components/preconia/codageAliases";
import { ngapSlug } from "@/lib/ngapSlug";

/* ------------------------------------------------------------------ bases */

interface AliasFile {
  groups: string[][];
  expansions: Record<string, string[]>;
}

const pub = (f: string) => JSON.parse(readFileSync(join(process.cwd(), "public", f), "utf8"));
const aliases = pub("medical-aliases.json") as AliasFile;
const cimLabels = (pub("cim10.json").acts as [string, string][]).map((a) => normIndex(a[1]));
const ccamLabels = (pub("ccam.json").acts as [string, string][]).map((a) => normIndex(a[1]));
const allLabels = [...cimLabels, ...ccamLabels];

/** Nombre de libellés contenant tous les jetons du terme (même logique que le moteur). */
function hits(base: string[], term: string): number {
  const tokens = normIndex(term).split(/\s+/).filter(Boolean);
  return base.filter((h) => tokens.every((t) => h.includes(t))).length;
}

/* ---------------------------------------------------- normalisation/racine */

describe("normIndex (norm + pluriels racinisés)", () => {
  it("racinise les pluriels réguliers, identiquement à l'index et à la requête", () => {
    expect(normIndex("genoux")).toBe("genou");
    expect(normIndex("canaux")).toBe("canal");
    expect(normIndex("vaisseaux")).toBe("vaisseau");
    expect(normIndex("articulations")).toBe("articulation");
  });
  it("ne touche ni les codes ni les mots courts", () => {
    expect(normIndex("NZLB001")).toBe("nzlb001");
    expect(normIndex("M545")).toBe("m545");
    expect(normIndex("bras")).toBe("bras"); // < 5 lettres : jamais racinisé
    expect(normIndex("stress")).toBe("stress"); // terminaison -ss préservée
  });
  it("reste insensible aux accents et ligatures", () => {
    expect(normIndex("Fémorotibiale")).toBe("femorotibiale");
    expect(normIndex("œil")).toBe("oeil");
  });
});

/* -------------------------------------------------------------- expansion */

describe("expandQuery (thésaurus : symétrique + dirigé + combinaisons)", () => {
  const map = buildAliasMap([["crise cardiaque", "infarctus"]], {
    infiltration: ["injection"],
    genou: ["articulation", "femorotibial"],
  });

  it("étend la requête entière via les groupes symétriques", () => {
    expect(expandQuery(normIndex("crise cardiaque"), map)).toContain("infarctu");
  });
  it("substitue un seul jeton", () => {
    const out = expandQuery(normIndex("infiltration genou"), map);
    expect(out).toContain("injection genou");
    expect(out).toContain("infiltration articulation");
  });
  it("substitue deux jetons à la fois (« infiltration genou » → « injection articulation »)", () => {
    expect(expandQuery(normIndex("infiltration genou"), map)).toContain("injection articulation");
  });
  it("les expansions sont dirigées : le vocabulaire officiel ne renvoie pas vers le courant", () => {
    expect(map.get("injection") ?? []).not.toContain("infiltration");
    expect(map.get("articulation") ?? []).not.toContain("genou");
  });
  it("n'enlève jamais la requête d'origine et reste plafonnée", () => {
    const out = expandQuery(normIndex("infiltration genou"), map);
    expect(out[0]).toBe("infiltration genou");
    expect(out.length).toBeLessThanOrEqual(14);
  });
});

/* ------------------------------------------- validation du thésaurus réel */

describe("medical-aliases.json : aucun alias mort (validé contre CIM-10 + CCAM)", () => {
  it("chaque groupe symétrique a au moins un terme présent dans les libellés", () => {
    const dead = aliases.groups.filter((g) => g.every((t) => hits(allLabels, t) === 0));
    expect(dead.map((g) => g[0])).toEqual([]);
  });
  it("chaque cible d'expansion dirigée existe dans les libellés", () => {
    const dead: string[] = [];
    for (const [from, tos] of Object.entries(aliases.expansions)) {
      for (const to of tos) if (hits(allLabels, to) === 0) dead.push(`${from} → ${to}`);
    }
    expect(dead).toEqual([]);
  });
});

/* ------------------------------------------------------- pages NGAP */

describe("ngapSlug : une page par article", () => {
  const ngap = pub("ngap.json") as { articles: [string, string, string, number][] };

  it("produit un slug unique pour chacun des 150 articles (numéros seuls dupliqués)", () => {
    const slugs = ngap.articles.map((a) => ngapSlug(a[0], a[1]));
    expect(slugs.length).toBe(150);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("produit des slugs propres aux URL (minuscules, sans accents, plafonnés)", () => {
    for (const a of ngap.articles) {
      const s = ngapSlug(a[0], a[1]);
      expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(s.split("-").length).toBeLessThanOrEqual(10);
    }
  });
});

/* ------------------------------------------------- requêtes emblématiques */

describe("recherches en langage courant (moteur simulé : jetons ET + thésaurus)", () => {
  const map = buildAliasMap(aliases.groups, aliases.expansions);
  const search = (base: string[], q: string) => {
    const queries = expandQuery(normIndex(q).trim(), map);
    return base.filter((h) => queries.some((qq) => qq.split(/\s+/).every((t) => h.includes(t))));
  };

  it("« infiltration genou » trouve l'injection intraarticulaire (CCAM)", () => {
    const r = search(ccamLabels, "infiltration genou");
    expect(r.some((h) => h.includes("injection") && h.includes("articulation"))).toBe(true);
  });
  it("« infiltration épaule » trouve une injection articulaire (CCAM)", () => {
    expect(search(ccamLabels, "infiltration épaule").length).toBeGreaterThan(0);
  });
  it("« botox » trouve la toxine botulique (CCAM)", () => {
    expect(search(ccamLabels, "botox").some((h) => h.includes("toxine botulique"))).toBe(true);
  });
  it("« prothèse genou » trouve l'arthroplastie fémorotibiale (CCAM)", () => {
    expect(search(ccamLabels, "prothèse genou").some((h) => h.includes("femorotibial"))).toBe(true);
  });
  it("« crise cardiaque » trouve l'infarctus (CIM-10)", () => {
    expect(search(cimLabels, "crise cardiaque").some((h) => h.includes("infarctu"))).toBe(true);
  });
  it("« mal de gorge » trouve la pharyngite (CIM-10)", () => {
    expect(search(cimLabels, "mal de gorge").some((h) => h.includes("pharyngite"))).toBe(true);
  });
  it("le pluriel trouve le singulier : « genoux » → « genou »", () => {
    expect(search(cimLabels, "arthrose genoux").length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import type { SlicePolygon } from "@/components/preconia/toxine/limbSlicer";
import {
  convexHull,
  inTarget,
  limbSection,
  nearestRisk,
  needleEchogenicity,
  needlePlan,
  pathStructures,
  pointInLoops,
  probeFrame,
  skinDepthAt,
  toProbe,
  toWorld,
  type Pt,
} from "@/components/preconia/toxine/probeGeom";

/** anneau de n points : disque de rayon r centré en c. */
const disc = (r: number, c: Pt = [0, 0], n = 64): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)] as Pt;
  });

const poly = (node: string, role: SlicePolygon["role"], loops: Pt[][]): SlicePolygon => ({
  node,
  role,
  loops,
  cx: loops[0].reduce((s, p) => s + p[0], 0) / loops[0].length,
  cy: loops[0].reduce((s, p) => s + p[1], 0) / loops[0].length,
  area: 1,
});

const FOOT = 0.038;
const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol;

describe("géométrie de base", () => {
  it("enveloppe convexe : ignore les points intérieurs", () => {
    const h = convexHull([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0.5, 0.5],
    ]);
    expect(h).toHaveLength(4);
  });

  it("point dans polygone, trous compris", () => {
    const loops = [disc(1), disc(0.4)]; // couronne (règle pair-impair)
    expect(pointInLoops(0.7, 0, loops)).toBe(true);
    expect(pointInLoops(0, 0, loops)).toBe(false);
    expect(pointInLoops(2, 0, loops)).toBe(false);
  });
});

describe("section du membre", () => {
  const target = poly("muscle__cible", "muscle", [disc(0.012, [0.01, 0])]);
  const bone = poly("bone__radius", "bone", [disc(0.008, [-0.012, 0.006])]);
  const far = poly("muscle__autre-segment", "muscle", [disc(0.02, [0.3, 0.3])]);

  it("isole le segment qui porte le muscle cible", () => {
    const sec = limbSection([target, bone, far], new Set(["muscle__cible"]))!;
    expect(sec.polys.map((p) => p.node).sort()).toEqual(["bone__radius", "muscle__cible"]);
  });

  it("la peau enveloppe le fascia (tissu sous-cutané)", () => {
    const sec = limbSection([target, bone], new Set(["muscle__cible"]), 0.004)!;
    for (const p of sec.fascia) expect(pointInLoops(p[0], p[1], [sec.skin])).toBe(true);
    const mean = (loop: Pt[]) =>
      loop.reduce((s, p) => s + Math.hypot(p[0] - sec.c[0], p[1] - sec.c[1]), 0) / loop.length;
    expect(sec.radius - mean(sec.fascia)).toBeGreaterThan(0.003); // ~4 mm de sous-cutané
  });
});

describe("placement de la sonde autour du membre", () => {
  const round = poly("muscle__cible", "muscle", [disc(0.03)]);
  const sec = limbSection([round], new Set(["muscle__cible"]))!;

  it("θ = 0 pose la sonde sur la face antérieure (−y)", () => {
    const f = probeFrame(sec, 0, FOOT);
    expect(f.contact[1]).toBeLessThan(0);
    expect(near(f.contact[0], 0, 1e-3)).toBe(true);
    expect(near(f.n[1], -1, 1e-3)).toBe(true); // normale sortante vers l'avant
    expect(near(f.u[0] * f.n[0] + f.u[1] * f.n[1], 0, 1e-9)).toBe(true); // semelle ⟂ normale
  });

  it("fait le tour complet du membre", () => {
    for (const [deg, ax, sign] of [
      [90, 0, 1], // médial : +x
      [180, 1, 1], // postérieur : +y
      [270, 0, -1], // latéral : −x
    ] as const) {
      const f = probeFrame(sec, (deg * Math.PI) / 180, FOOT);
      expect(Math.sign(f.contact[ax])).toBe(sign);
      expect(Math.abs(f.contact[1 - ax])).toBeLessThan(1e-3);
    }
  });

  it("la semelle s'appuie sur la peau (corde), jamais au-delà", () => {
    for (let deg = 0; deg < 360; deg += 37) {
      const f = probeFrame(sec, (deg * Math.PI) / 180, FOOT);
      const d = Math.hypot(f.o[0] - sec.c[0], f.o[1] - sec.c[1]);
      expect(d).toBeLessThan(sec.radius + 1e-9);
      expect(d).toBeGreaterThan(sec.radius * 0.8);
    }
  });

  it("aller-retour monde ↔ repère sonde", () => {
    const f = probeFrame(sec, 1.1, FOOT);
    const p: Pt = [0.007, -0.013];
    const back = toWorld(f, toProbe(f, p));
    expect(near(back[0], p[0], 1e-9)).toBe(true);
    expect(near(back[1], p[1], 1e-9)).toBe(true);
  });

  it("la profondeur croît en s'enfonçant vers le centre", () => {
    const f = probeFrame(sec, 0.6, FOOT);
    expect(toProbe(f, sec.c)[1]).toBeGreaterThan(0);
  });
});

describe("aiguille", () => {
  const round = poly("muscle__cible", "muscle", [disc(0.03)]);
  const sec = limbSection([round], new Set(["muscle__cible"]))!;
  const f = probeFrame(sec, 0, FOOT);
  const skinProbe = sec.skin.map((q) => toProbe(f, q));

  it("pique toujours au ras du bord latéral de la sonde", () => {
    for (const side of [-1, 1] as const) {
      const n = needlePlan(f, skinProbe, side, Math.PI / 6, 0.02, 0.003);
      expect(near(n.entry[0], side * (FOOT / 2 + 0.003), 1e-9)).toBe(true);
      expect(n.entry[1]).toBeGreaterThanOrEqual(0); // sur la peau, hors semelle donc plus profond
      expect(Math.abs(n.tip[0])).toBeLessThan(Math.abs(n.entry[0])); // chemine vers le champ
      expect(n.tip[1]).toBeGreaterThan(n.entry[1]);
    }
  });

  it("l'angulation règle la pente du trajet", () => {
    const flat = needlePlan(f, skinProbe, 1, (15 * Math.PI) / 180, 0.03);
    const steep = needlePlan(f, skinProbe, 1, (70 * Math.PI) / 180, 0.03);
    expect(steep.tip[1]).toBeGreaterThan(flat.tip[1]);
    expect(Math.abs(steep.tip[0])).toBeGreaterThan(Math.abs(flat.tip[0]));
  });

  it("la visibilité échographique chute quand l'aiguille se redresse", () => {
    expect(needleEchogenicity((15 * Math.PI) / 180)).toBe(1);
    expect(needleEchogenicity((45 * Math.PI) / 180)).toBeLessThan(0.8);
    expect(needleEchogenicity((80 * Math.PI) / 180)).toBeLessThan(0.2);
  });

  it("profondeur de peau : nulle sous la semelle, croissante sur les bords", () => {
    expect(skinDepthAt(skinProbe, 0)).toBeLessThan(0.001);
    expect(skinDepthAt(skinProbe, FOOT / 2 + 0.006)).toBeGreaterThan(skinDepthAt(skinProbe, 0));
  });
});

describe("contrôle du trajet", () => {
  const target = poly("muscle__cible", "muscle", [disc(0.012, [0, 0.012])]);
  const nerve = poly("nerve__median-nerve", "nerve", [disc(0.002, [0.02, 0.01])]);
  const sec = limbSection([target, nerve], new Set(["muscle__cible"]))!;
  const f = probeFrame(sec, 0, FOOT);
  const skinProbe = sec.skin.map((q) => toProbe(f, q));

  it("liste les structures traversées dans l'ordre", () => {
    const plan = needlePlan(f, skinProbe, 1, (30 * Math.PI) / 180, 0.045);
    const hits = pathStructures(sec.polys, f, plan);
    expect(hits.map((h) => h.node)).toContain("muscle__cible");
    for (let i = 1; i < hits.length; i++) expect(hits[i].from).toBeGreaterThanOrEqual(hits[i - 1].from);
  });

  it("détecte la pointe dans la cible et mesure la structure à risque", () => {
    const plan = needlePlan(f, skinProbe, 1, (30 * Math.PI) / 180, 0);
    const centre = toWorld(f, [0, toProbe(f, [0, 0.012])[1]]);
    expect(inTarget(sec.polys, new Set(["muscle__cible"]), centre)).toBe(true);
    expect(inTarget(sec.polys, new Set(["muscle__cible"]), [0.3, 0.3])).toBe(false);
    const r = nearestRisk(sec.polys, centre)!;
    expect(r.node).toBe("nerve__median-nerve");
    expect(r.d).toBeGreaterThan(0.01);
    expect(plan.inserted).toBe(0);
  });
});

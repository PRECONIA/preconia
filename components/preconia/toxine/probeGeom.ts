/* Géométrie de la sonde d'échographie et de l'aiguille, dans le plan de la coupe axiale
   (repère du modèle : x = médial +, y = postérieur +, z = proximal +, unités = mètres).

   La sonde est une barrette linéaire posée à plat sur la peau : on la fait tourner
   TOUT AUTOUR du membre (angle θ, 0° = face antérieure, sens horaire à l'écran) et
   la semelle s'appuie sur la corde du contour cutané — comme une sonde appuyée qui
   aplatit les tissus. L'image est ensuite exprimée dans le repère de la sonde :
   u = axe long de la semelle (latéral), v = profondeur (0 = plan de la semelle).

   L'aiguille arrive TOUJOURS par le côté de la sonde (technique « dans le plan ») :
   elle pique la peau à quelques millimètres du bord latéral choisi, avec une
   angulation réglable par rapport au plan cutané, et progresse dans le plan imagé. */

import type { Role, SlicePolygon } from "@/components/preconia/toxine/limbSlicer";

export type Pt = [number, number];

/** le modèle 3D est en mètres — facteur de conversion pour les affichages en mm. */
export const M2MM = 1000;

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
const norm = (a: Pt) => Math.hypot(a[0], a[1]);
const unit = (a: Pt): Pt => {
  const l = norm(a) || 1;
  return [a[0] / l, a[1] / l];
};
export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/* ------------------------------------------------------------------ polygones */

/** vrai si le point est dans le polygone (règle pair-impair, trous compris). */
export function pointInLoops(x: number, y: number, loops: Pt[][]): boolean {
  let inside = false;
  for (const loop of loops)
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
      const [xi, yi] = loop[i];
      const [xj, yj] = loop[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  return inside;
}

/** enveloppe convexe (parcours monotone d'Andrew). */
export function convexHull(pts: Pt[]): Pt[] {
  if (pts.length < 4) return pts.slice();
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (src: Pt[]) => {
    const h: Pt[] = [];
    for (const q of src) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop();
      h.push(q);
    }
    h.pop();
    return h;
  };
  const lower = half(p);
  const upper = half(p.slice().reverse());
  return [...lower, ...upper];
}

/** longueurs cumulées (fermées) : cum[i] = longueur du départ au sommet i, cum[n] = périmètre. */
export function cumLengths(loop: Pt[]): number[] {
  const cum = [0];
  for (let i = 0; i < loop.length; i++) cum.push(cum[i] + norm(sub(loop[(i + 1) % loop.length], loop[i])));
  return cum;
}

/** point du contour à l'abscisse curviligne s (repliée sur le périmètre). */
export function pointAtLen(loop: Pt[], cum: number[], s: number): Pt {
  const per = cum[cum.length - 1];
  let t = s % per;
  if (t < 0) t += per;
  let i = 0;
  while (i < loop.length - 1 && cum[i + 1] < t) i++;
  const a = loop[i];
  const b = loop[(i + 1) % loop.length];
  const seg = cum[i + 1] - cum[i] || 1;
  const f = (t - cum[i]) / seg;
  return [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])];
}

/** ré-échantillonne un contour fermé en n points équidistants. */
export function resampleLoop(loop: Pt[], n: number): Pt[] {
  if (loop.length < 3) return loop.slice();
  const cum = cumLengths(loop);
  const per = cum[cum.length - 1];
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) out.push(pointAtLen(loop, cum, (i * per) / n));
  return out;
}

/** dilate un contour fermé de d vers l'extérieur (c = point intérieur de référence). */
export function offsetLoop(loop: Pt[], d: number, c: Pt): Pt[] {
  const n = loop.length;
  return loop.map((p, i) => {
    const a = loop[(i - 1 + n) % n];
    const b = loop[(i + 1) % n];
    const n1 = unit([p[1] - a[1], -(p[0] - a[0])]);
    const n2 = unit([b[1] - p[1], -(b[0] - p[0])]);
    let m = unit([n1[0] + n2[0], n1[1] + n2[1]]);
    if (dot(m, sub(p, c)) < 0) m = [-m[0], -m[1]];
    const k = d / Math.max(0.5, Math.abs(dot(m, n1)));
    return [p[0] + m[0] * k, p[1] + m[1] * k] as Pt;
  });
}

/** première intersection du rayon (o, d) avec le contour ; s = abscisse curviligne. */
export function rayHitLoop(loop: Pt[], o: Pt, d: Pt): { p: Pt; s: number } | null {
  const cum = cumLengths(loop);
  let best: { p: Pt; s: number } | null = null;
  let bestT = Infinity;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const den = d[0] * ey - d[1] * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((a[0] - o[0]) * ey - (a[1] - o[1]) * ex) / den;
    const u = ((a[0] - o[0]) * d[1] - (a[1] - o[1]) * d[0]) / den;
    if (t <= 0 || u < 0 || u > 1) continue;
    if (t < bestT) {
      bestT = t;
      best = { p: [o[0] + t * d[0], o[1] + t * d[1]], s: cum[i] + u * (cum[i + 1] - cum[i]) };
    }
  }
  return best;
}

/* ------------------------------------------------- section du membre au niveau z */

export interface LimbSection {
  polys: SlicePolygon[]; // structures du segment de membre (les fragments lointains sont écartés)
  fascia: Pt[]; // contour profond (enveloppe des structures) — plan des fascias
  skin: Pt[]; // contour cutané (fascia dilaté du tissu sous-cutané)
  cum: number[]; // longueurs cumulées de `skin`
  c: Pt; // centre de la section
  radius: number; // rayon moyen (peau)
}

const bboxOf = (p: SlicePolygon) => {
  const b = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
  for (const lp of p.loops)
    for (const q of lp) {
      if (q[0] < b.minx) b.minx = q[0];
      if (q[0] > b.maxx) b.maxx = q[0];
      if (q[1] < b.miny) b.miny = q[1];
      if (q[1] > b.maxy) b.maxy = q[1];
    }
  return b;
};
type Box = ReturnType<typeof bboxOf>;
const boxGap = (a: Box, b: Box) =>
  Math.hypot(Math.max(0, a.minx - b.maxx, b.minx - a.maxx), Math.max(0, a.miny - b.maxy, b.miny - a.maxy));

/** Isole le segment de membre qui porte le muscle cible (à un même niveau z, le modèle
    peut contenir deux segments distincts) puis en déduit les contours fascia et peau. */
export function limbSection(all: SlicePolygon[], seed: Set<string>, subcut = 0.004, link = 0.008): LimbSection | null {
  if (!all.length) return null;
  const boxes = all.map(bboxOf);
  const parent = all.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++)
      if (boxGap(boxes[i], boxes[j]) < link) parent[find(i)] = find(j);

  const groups = new Map<number, number[]>();
  for (let i = 0; i < all.length; i++) {
    const r = find(i);
    (groups.get(r) ?? groups.set(r, []).get(r)!).push(i);
  }
  let chosen: number[] | null = null;
  for (const idx of groups.values()) if (idx.some((i) => seed.has(all[i].node))) chosen = idx;
  if (!chosen)
    for (const idx of groups.values())
      if (!chosen || idx.reduce((s, i) => s + all[i].area, 0) > chosen.reduce((s, i) => s + all[i].area, 0)) chosen = idx;
  if (!chosen) return null;

  const polys = chosen.map((i) => all[i]);
  const pts: Pt[] = [];
  for (const p of polys) for (const lp of p.loops) for (const q of lp) pts.push(q);
  if (pts.length < 8) return null;

  const fascia = resampleLoop(convexHull(pts), 168);
  const c: Pt = [
    fascia.reduce((s, p) => s + p[0], 0) / fascia.length,
    fascia.reduce((s, p) => s + p[1], 0) / fascia.length,
  ];
  const skin = offsetLoop(fascia, subcut, c);
  const radius = skin.reduce((s, p) => s + norm(sub(p, c)), 0) / skin.length;
  return { polys, fascia, skin, cum: cumLengths(skin), c, radius };
}

/* ------------------------------------------------------------- repère de sonde */

export interface ProbeFrame {
  o: Pt; // milieu de la semelle (origine du repère sonde)
  u: Pt; // axe long de la semelle (unitaire) — u croissant = droite de l'image
  n: Pt; // normale sortante (unitaire) — la profondeur va dans −n
  foot: number; // largeur de semelle (m)
  contact: Pt; // point de peau visé par le rayon (avant appui)
  theta: number; // angle de rotation autour du membre (rad)
}

/** θ = 0 → face antérieure (−y) ; θ croissant = sens horaire à l'écran (vers +x, médial). */
export const probeDir = (theta: number): Pt => [Math.sin(theta), -Math.cos(theta)];

/** Place la sonde autour du membre : la semelle s'appuie sur la corde du contour cutané. */
export function probeFrame(sec: LimbSection, theta: number, foot: number): ProbeFrame {
  const d = probeDir(theta);
  const hit = rayHitLoop(sec.skin, sec.c, d);
  const contact: Pt = hit ? hit.p : [sec.c[0] + d[0] * sec.radius, sec.c[1] + d[1] * sec.radius];
  const s0 = hit ? hit.s : 0;
  const a = pointAtLen(sec.skin, sec.cum, s0 - foot / 2);
  const b = pointAtLen(sec.skin, sec.cum, s0 + foot / 2);
  const u = unit(sub(b, a));
  const o: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let n: Pt = [u[1], -u[0]];
  if (dot(n, sub(o, sec.c)) < 0) n = [-n[0], -n[1]];
  return { o, u, n, foot, contact, theta };
}

/** monde → repère sonde : [u le long de la semelle, v profondeur (0 = semelle)]. */
export const toProbe = (f: ProbeFrame, p: Pt): Pt => {
  const r = sub(p, f.o);
  return [dot(r, f.u), -dot(r, f.n)];
};

/** repère sonde → monde. */
export const toWorld = (f: ProbeFrame, q: Pt): Pt => [
  f.o[0] + q[0] * f.u[0] - q[1] * f.n[0],
  f.o[1] + q[0] * f.u[1] - q[1] * f.n[1],
];

/** profondeur de la peau (repère sonde) à l'abscisse u — surface la plus proche. */
export function skinDepthAt(skinProbe: Pt[], u: number): number {
  let best = Infinity;
  for (let i = 0, j = skinProbe.length - 1; i < skinProbe.length; j = i++) {
    const a = skinProbe[j];
    const b = skinProbe[i];
    if (a[0] > u !== b[0] > u) {
      const v = a[1] + ((u - a[0]) / (b[0] - a[0])) * (b[1] - a[1]);
      if (v < best) best = v;
    }
  }
  return isFinite(best) ? best : 0;
}

/* ----------------------------------------------------------------- aiguille */

export interface NeedlePlan {
  entry: Pt; // point de ponction (repère sonde)
  dir: Pt; // direction unitaire (repère sonde)
  tip: Pt; // pointe
  angle: number; // angulation / plan cutané (rad)
  side: -1 | 1; // côté d'abord : −1 = bord gauche de l'image, +1 = bord droit
  inserted: number; // longueur introduite (m)
}

/** L'aiguille pique toujours au ras du bord latéral de la semelle, puis chemine dans le plan. */
export function needlePlan(
  f: ProbeFrame,
  skinProbe: Pt[],
  side: -1 | 1,
  angle: number,
  inserted: number,
  gap = 0.003,
): NeedlePlan {
  const ue = side * (f.foot / 2 + gap);
  const entry: Pt = [ue, Math.max(0, skinDepthAt(skinProbe, ue))];
  const dir: Pt = [-side * Math.cos(angle), Math.sin(angle)];
  return { entry, dir, tip: [entry[0] + dir[0] * inserted, entry[1] + dir[1] * inserted], angle, side, inserted };
}

/** angulation/insertion pour viser un point (u,v) depuis le point de ponction. */
export function aimAt(plan: NeedlePlan, target: Pt, maxLen: number, minA: number, maxA: number) {
  const du = target[0] - plan.entry[0];
  const dv = target[1] - plan.entry[1];
  const angle = clamp(Math.atan2(Math.max(dv, 0), Math.abs(du)), minA, maxA);
  return { angle, inserted: clamp(Math.hypot(du, dv), 0, maxLen) };
}

export interface PathHit {
  node: string;
  role: Role;
  from: number; // profondeur d'entrée le long de l'aiguille (m)
  to: number;
}

/** structures traversées par le trajet, dans l'ordre de rencontre. */
export function pathStructures(polys: SlicePolygon[], f: ProbeFrame, plan: NeedlePlan, step = 0.0007): PathHit[] {
  if (plan.inserted <= 0) return [];
  const boxes = polys.map(bboxOf);
  const open = new Map<string, PathHit>();
  const out: PathHit[] = [];
  const n = Math.max(2, Math.ceil(plan.inserted / step));
  for (let i = 0; i <= n; i++) {
    const k = (i / n) * plan.inserted;
    const w = toWorld(f, [plan.entry[0] + plan.dir[0] * k, plan.entry[1] + plan.dir[1] * k]);
    const here = new Set<string>();
    for (let pi = 0; pi < polys.length; pi++) {
      const b = boxes[pi];
      if (w[0] < b.minx || w[0] > b.maxx || w[1] < b.miny || w[1] > b.maxy) continue;
      const p = polys[pi];
      if (!pointInLoops(w[0], w[1], p.loops)) continue;
      here.add(p.node);
      const cur = open.get(p.node);
      if (cur) cur.to = k;
      else {
        const hit: PathHit = { node: p.node, role: p.role, from: k, to: k };
        open.set(p.node, hit);
        out.push(hit);
      }
    }
    for (const node of [...open.keys()]) if (!here.has(node)) open.delete(node);
  }
  return out.sort((a, b) => a.from - b.from);
}

/** Profondeur à laquelle le trajet bute sur une corticale osseuse (l'aiguille ne peut
    pas aller plus loin) — `Infinity` si le trajet ne rencontre pas d'os. */
export function boneStop(polys: SlicePolygon[], f: ProbeFrame, plan: NeedlePlan, step = 0.0005): number {
  const bones = polys.filter((p) => p.role === "bone");
  if (!bones.length || plan.inserted <= 0) return Infinity;
  const boxes = bones.map(bboxOf);
  const n = Math.ceil(plan.inserted / step);
  for (let i = 1; i <= n; i++) {
    const k = (i / n) * plan.inserted;
    const w = toWorld(f, [plan.entry[0] + plan.dir[0] * k, plan.entry[1] + plan.dir[1] * k]);
    for (let b = 0; b < bones.length; b++) {
      const bb = boxes[b];
      if (w[0] < bb.minx || w[0] > bb.maxx || w[1] < bb.miny || w[1] > bb.maxy) continue;
      if (pointInLoops(w[0], w[1], bones[b].loops)) return Math.max(0, k - step);
    }
  }
  return Infinity;
}

/** structure à risque (nerf / vaisseau) la plus proche de la pointe, en mètres. */
export function nearestRisk(polys: SlicePolygon[], tipWorld: Pt): { node: string; role: Role; d: number } | null {
  let best: { node: string; role: Role; d: number } | null = null;
  for (const p of polys) {
    if (p.role !== "nerve" && p.role !== "artery" && p.role !== "vein") continue;
    let d = Infinity;
    for (const lp of p.loops) for (const q of lp) d = Math.min(d, Math.hypot(q[0] - tipWorld[0], q[1] - tipWorld[1]));
    if (pointInLoops(tipWorld[0], tipWorld[1], p.loops)) d = 0;
    if (!best || d < best.d) best = { node: p.node, role: p.role, d };
  }
  return best;
}

/** vrai si la pointe est dans l'une des structures cibles. */
export function inTarget(polys: SlicePolygon[], seed: Set<string>, tipWorld: Pt): boolean {
  return polys.some((p) => seed.has(p.node) && pointInLoops(tipWorld[0], tipWorld[1], p.loops));
}

/** Visibilité échographique de l'aiguille : excellente à plat, mauvaise en forte pente
    (l'écho renvoyé vers la barrette s'effondre quand l'angle d'incidence augmente). */
export function needleEchogenicity(angle: number): number {
  const deg = (angle * 180) / Math.PI;
  return clamp(1 - (deg - 18) / 62, 0.12, 1);
}

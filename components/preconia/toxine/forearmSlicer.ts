"use client";

/* Découpe axiale TEMPS RÉEL de l'avant-bras : charge une fois forearm.glb, extrait
   les triangles par structure (nom + rôle), les range en tranches de z (buckets) pour
   n'examiner que les triangles proches du plan, puis calcule à la volée la coupe au
   niveau demandé (marching-triangles → segments → boucles → polygones). L'ascenseur ne
   parcourt que le TIERS MOYEN (BELLY) — les ventres musculaires injectables ; au-dessus
   = insertions proximales et os, en-dessous = tendons. Le cadre est calculé sur cette
   plage (coupe recentrée et agrandie). Repère brut BodyParts3D : z = axe long
   (proximal→distal), x = médio-latéral, y = antéro-postérieur. */

import { useCallback, useEffect, useRef, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Mesh, BufferGeometry } from "three";

const MODEL = "/models/toxine/forearm.glb";
const NB = 72;

/** fraction basse/haute de l'axe long parcourue par l'ascenseur (tiers moyen). */
export const BELLY: [number, number] = [0.34, 0.67];

/** libellés courts affichés sur la coupe. */
const DISPLAY: Record<string, string> = {
  "fds__fds-humeroulnar": "FDS",
  "fds__fds-radial": "FDS",
  "bone__radius": "Radius",
  "bone__ulna": "Ulna",
  "ctx__brachioradialis": "Brachio-rad.",
  "ctx__flexor-digitorum-profundus": "FDP",
  "ctx__extensor-digitorum": "Ext. doigts",
  "ctx__palmaris-longus": "Long palm.",
  "ctx__fcu-humeral-head": "FCU",
  "ctx__fcu-ulnar-head": "FCU",
  "ctx__extensor-carpi-radialis-longus": "LERC",
  "ctx__supinator": "Supin.",
  "ctx__pronator-teres-humeral-head": "Rond pron.",
  "ctx__pronator-teres-ulnar-head": "Rond pron.",
  "ctx__abductor-pollicis-longus": "APL",
  "ctx__extensor-digiti-minimi": "EDM",
  "ctx__flexor-pollicis-longus": "LFP",
  "ctx__flexor-carpi-radialis": "FRC",
  "ctx__extensor-pollicis-longus": "LEP",
  "ctx__pronator-quadratus": "Carré pron.",
  "ctx__extensor-pollicis-brevis": "CEP",
  "ctx__extensor-indicis": "Ext. index",
};

export type Role = "fds" | "bone" | "ctx";
const roleOf = (n: string): Role => (n.startsWith("fds__") ? "fds" : n.startsWith("bone__") ? "bone" : "ctx");

export interface SlicePolygon {
  role: Role;
  label: string;
  loops: [number, number][][];
  cx: number;
  cy: number;
  area: number;
}
export interface Bbox2D {
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
}

interface MeshData {
  label: string;
  role: Role;
  tris: Float32Array;
  buckets: Int32Array[];
}
interface Data {
  meshes: MeshData[];
  zmin: number;
  zmax: number;
  bbox: Bbox2D;
}

function extract(geom: BufferGeometry): Float32Array {
  const pos = geom.attributes.position.array as ArrayLike<number>;
  const idx = geom.index?.array as ArrayLike<number> | undefined;
  const n = idx ? idx.length : pos.length / 3;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = idx ? idx[i] : i;
    out[i * 3] = pos[v * 3];
    out[i * 3 + 1] = pos[v * 3 + 1];
    out[i * 3 + 2] = pos[v * 3 + 2];
  }
  return out;
}

function loopsAt(tris: Float32Array, cand: Int32Array, z: number): [number, number][][] {
  const segs: number[] = [];
  for (let c = 0; c < cand.length; c++) {
    const o = cand[c];
    const zA = tris[o + 2] - z, zB = tris[o + 5] - z, zC = tris[o + 8] - z;
    const pts: number[] = [];
    const edge = (i: number, di: number, j: number, dj: number) => {
      if (di < 0 !== dj < 0) {
        const t = di / (di - dj);
        pts.push(tris[o + i] + t * (tris[o + j] - tris[o + i]), tris[o + i + 1] + t * (tris[o + j + 1] - tris[o + i + 1]));
      }
    };
    edge(0, zA, 3, zB);
    edge(3, zB, 6, zC);
    edge(6, zC, 0, zA);
    if (pts.length === 4) segs.push(pts[0], pts[1], pts[2], pts[3]);
  }
  const key = (x: number, y: number) => Math.round(x * 2) + "_" + Math.round(y * 2);
  const pos = new Map<string, [number, number]>();
  const adj = new Map<string, string[]>();
  const eset = new Set<string>();
  for (let i = 0; i < segs.length; i += 4) {
    const ka = key(segs[i], segs[i + 1]), kb = key(segs[i + 2], segs[i + 3]);
    if (ka === kb) continue;
    pos.set(ka, [segs[i], segs[i + 1]]);
    pos.set(kb, [segs[i + 2], segs[i + 3]]);
    const e = ka < kb ? ka + "|" + kb : kb + "|" + ka;
    if (eset.has(e)) continue;
    eset.add(e);
    (adj.get(ka) ?? adj.set(ka, []).get(ka)!).push(kb);
    (adj.get(kb) ?? adj.set(kb, []).get(kb)!).push(ka);
  }
  const used = new Set<string>();
  const out: [number, number][][] = [];
  for (const start of adj.keys()) {
    for (const first of adj.get(start)!) {
      const e0 = start < first ? start + "|" + first : first + "|" + start;
      if (used.has(e0)) continue;
      const loop = [start];
      used.add(e0);
      let prev = start, cur = first;
      for (let g = 0; g < 20000; g++) {
        loop.push(cur);
        let nxt: string | null = null;
        for (const c of adj.get(cur)!) {
          if (c === prev) continue;
          const e = cur < c ? cur + "|" + c : c + "|" + cur;
          if (used.has(e)) continue;
          nxt = c;
          break;
        }
        if (nxt === null) break;
        used.add(cur < nxt ? cur + "|" + nxt : nxt + "|" + cur);
        prev = cur;
        cur = nxt;
        if (cur === start) break;
      }
      if (loop.length >= 3) out.push(loop.map((k) => pos.get(k)!));
    }
  }
  return out;
}

function polyArea(loop: [number, number][]): number {
  let a = 0;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++)
    a += (loop[j][0] + loop[i][0]) * (loop[j][1] - loop[i][1]);
  return Math.abs(a) / 2;
}

const bucketOf = (z: number, zmin: number, zmax: number) =>
  Math.min(NB - 1, Math.max(0, Math.floor(((z - zmin) / (zmax - zmin)) * NB)));

/** niveau 0..1 (ascenseur) → z brut, restreint au tiers moyen (BELLY). */
const levelToZ = (level: number, zmin: number, zmax: number) =>
  zmin + (BELLY[0] + Math.min(1, Math.max(0, level)) * (BELLY[1] - BELLY[0])) * (zmax - zmin);

export function useForearmSlicer() {
  const data = useRef<Data | null>(null);
  const [state, setState] = useState<{ ready: boolean; bbox: Bbox2D | null }>({ ready: false, bbox: null });

  useEffect(() => {
    let alive = true;
    new GLTFLoader().load(MODEL, (gltf) => {
      if (!alive) return;
      const raw: { label: string; role: Role; tris: Float32Array }[] = [];
      let zmin = Infinity, zmax = -Infinity;
      gltf.scene.traverse((o) => {
        const m = o as Mesh;
        if (!m.isMesh) return;
        const tris = extract(m.geometry as BufferGeometry);
        for (let i = 0; i < tris.length; i += 3) {
          if (tris[i + 2] < zmin) zmin = tris[i + 2];
          if (tris[i + 2] > zmax) zmax = tris[i + 2];
        }
        raw.push({ label: DISPLAY[m.name] ?? m.name, role: roleOf(m.name), tris });
      });
      const meshes: MeshData[] = raw.map((r) => {
        const lists: number[][] = Array.from({ length: NB }, () => []);
        for (let o = 0; o < r.tris.length; o += 9) {
          const lo = Math.min(r.tris[o + 2], r.tris[o + 5], r.tris[o + 8]);
          const hi = Math.max(r.tris[o + 2], r.tris[o + 5], r.tris[o + 8]);
          for (let b = bucketOf(lo, zmin, zmax); b <= bucketOf(hi, zmin, zmax); b++) lists[b].push(o);
        }
        return { label: r.label, role: r.role, tris: r.tris, buckets: lists.map((l) => Int32Array.from(l)) };
      });
      // cadre = union XY des coupes sur la plage BELLY (recentre + agrandit)
      const bbox: Bbox2D = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
      for (const s of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
        const z = levelToZ(s, zmin, zmax);
        const b = bucketOf(z, zmin, zmax);
        for (const m of meshes)
          for (const lp of loopsAt(m.tris, m.buckets[b], z))
            for (const p of lp) {
              if (p[0] < bbox.minx) bbox.minx = p[0];
              if (p[0] > bbox.maxx) bbox.maxx = p[0];
              if (p[1] < bbox.miny) bbox.miny = p[1];
              if (p[1] > bbox.maxy) bbox.maxy = p[1];
            }
      }
      data.current = { meshes, zmin, zmax, bbox };
      setState({ ready: true, bbox });
    });
    return () => {
      alive = false;
    };
  }, []);

  const slice = useCallback((level: number): SlicePolygon[] => {
    const d = data.current;
    if (!d) return [];
    const z = levelToZ(level, d.zmin, d.zmax);
    const b = bucketOf(z, d.zmin, d.zmax);
    const out: SlicePolygon[] = [];
    for (const m of d.meshes) {
      const loops = loopsAt(m.tris, m.buckets[b], z);
      if (!loops.length) continue;
      let area = 0, cx = 0, cy = 0, best = 0;
      for (const lp of loops) {
        const a = polyArea(lp);
        area += a;
        if (a > best) {
          best = a;
          let sx = 0, sy = 0;
          for (const p of lp) {
            sx += p[0];
            sy += p[1];
          }
          cx = sx / lp.length;
          cy = sy / lp.length;
        }
      }
      out.push({ role: m.role, label: m.label, loops, cx, cy, area });
    }
    return out;
  }, []);

  return { ready: state.ready, bbox: state.bbox, slice };
}

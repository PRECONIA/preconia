"use client";

/* Découpe axiale temps réel du membre supérieur (upper-limb.glb). Charge une fois,
   extrait les triangles par structure (nœud `muscle__*` / `bone__*`), les range en
   tranches de z (grand axe = proximo-distal) pour n'examiner que le voisinage du plan.
   `slice(z)` renvoie les polygones coupés à ce niveau ; `zExtent`/`xyBox` donnent
   l'étendue d'un muscle (pour caler l'ascenseur sur son ventre et cadrer la coupe). */

import { useCallback, useEffect, useRef, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Mesh, BufferGeometry } from "three";

const MODEL = "/models/toxine/upper-limb.glb";
const NB = 96;

export type Role = "muscle" | "bone" | "nerve" | "artery" | "vein" | "conn";
const roleOf = (n: string): Role =>
  n.startsWith("bone__") ? "bone" : n.startsWith("nerve__") ? "nerve" : n.startsWith("artery__") ? "artery" : n.startsWith("vein__") ? "vein" : n.startsWith("conn__") ? "conn" : "muscle";
export interface SlicePolygon {
  node: string;
  role: Role;
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
  node: string;
  role: Role;
  tris: Float32Array;
  buckets: Int32Array[];
  box: { minx: number; miny: number; minz: number; maxx: number; maxy: number; maxz: number };
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
  const key = (x: number, y: number) => Math.round(x * 2000) + "_" + Math.round(y * 2000);
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

export function useLimbSlicer() {
  const data = useRef<{ meshes: MeshData[]; zmin: number; zmax: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    new GLTFLoader().load(MODEL, (gltf) => {
      if (!alive) return;
      const raw: { node: string; role: Role; tris: Float32Array }[] = [];
      let zmin = Infinity, zmax = -Infinity;
      gltf.scene.traverse((o) => {
        const m = o as Mesh;
        if (!m.isMesh) return;
        const tris = extract(m.geometry as BufferGeometry);
        for (let i = 2; i < tris.length; i += 3) {
          if (tris[i] < zmin) zmin = tris[i];
          if (tris[i] > zmax) zmax = tris[i];
        }
        raw.push({ node: m.name, role: roleOf(m.name), tris });
      });
      const meshes: MeshData[] = raw.map((r) => {
        const lists: number[][] = Array.from({ length: NB }, () => []);
        const box = { minx: Infinity, miny: Infinity, minz: Infinity, maxx: -Infinity, maxy: -Infinity, maxz: -Infinity };
        for (let o = 0; o < r.tris.length; o += 9) {
          for (let v = 0; v < 9; v += 3) {
            box.minx = Math.min(box.minx, r.tris[o + v]);
            box.maxx = Math.max(box.maxx, r.tris[o + v]);
            box.miny = Math.min(box.miny, r.tris[o + v + 1]);
            box.maxy = Math.max(box.maxy, r.tris[o + v + 1]);
            box.minz = Math.min(box.minz, r.tris[o + v + 2]);
            box.maxz = Math.max(box.maxz, r.tris[o + v + 2]);
          }
          const lo = Math.min(r.tris[o + 2], r.tris[o + 5], r.tris[o + 8]);
          const hi = Math.max(r.tris[o + 2], r.tris[o + 5], r.tris[o + 8]);
          const b0 = Math.max(0, Math.floor(((lo - zmin) / (zmax - zmin)) * NB));
          const b1 = Math.min(NB - 1, Math.floor(((hi - zmin) / (zmax - zmin)) * NB));
          for (let b = b0; b <= b1; b++) lists[b].push(o);
        }
        return { node: r.node, role: r.role, tris: r.tris, buckets: lists.map((l) => Int32Array.from(l)), box };
      });
      data.current = { meshes, zmin, zmax };
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const slice = useCallback((z: number): SlicePolygon[] => {
    const d = data.current;
    if (!d) return [];
    const b = Math.min(NB - 1, Math.max(0, Math.floor(((z - d.zmin) / (d.zmax - d.zmin)) * NB)));
    const out: SlicePolygon[] = [];
    for (const m of d.meshes) {
      if (z < m.box.minz || z > m.box.maxz) continue;
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
      out.push({ node: m.node, role: m.role, loops, cx, cy, area });
    }
    return out;
  }, []);

  const zExtent = useCallback((nodes: string[]): [number, number] => {
    const d = data.current;
    if (!d) return [0, 1];
    let lo = Infinity, hi = -Infinity;
    for (const m of d.meshes) if (nodes.includes(m.node)) {
      lo = Math.min(lo, m.box.minz);
      hi = Math.max(hi, m.box.maxz);
    }
    return lo <= hi ? [lo, hi] : [d.zmin, d.zmax];
  }, []);

  const xyBox = useCallback((nodes: string[]): Bbox2D => {
    const d = data.current;
    const box: Bbox2D = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
    if (d) for (const m of d.meshes) if (nodes.includes(m.node)) {
      box.minx = Math.min(box.minx, m.box.minx);
      box.maxx = Math.max(box.maxx, m.box.maxx);
      box.miny = Math.min(box.miny, m.box.miny);
      box.maxy = Math.max(box.maxy, m.box.maxy);
    }
    return box;
  }, []);

  return { ready, slice, zExtent, xyBox };
}

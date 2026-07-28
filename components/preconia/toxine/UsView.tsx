"use client";

/* Écran d'échographie simulé : la coupe transversale (petit-axe) au niveau de la sonde,
   stylisée « échographie » (fond sombre, sonde en haut = surface cutanée, profondeur
   vers le bas), avec l'aiguille dans le plan (trajet + pointe). Le muscle cible ressort ;
   nerfs/artères/veines colorés (repérage). Coupe réelle issue du modèle 3D. */

import type { Bbox2D, SlicePolygon } from "@/components/preconia/toxine/limbSlicer";
import { nodeShort } from "@/components/preconia/toxine/toxineCatalog";

const SIZE = 260, GUT = 84, PAD = 14, TOP = 26, BOT = 14, GAP = 11, MAX_LABELS = 12;

export interface NeedleView {
  e: [number, number]; // point d'entrée (repère brut de la coupe)
  t: [number, number]; // pointe
  inTarget: boolean;
}

const STY: Record<string, { fill: string; op: number; stroke: string; sw: number; sop: number }> = {
  conn: { fill: "#8a8078", op: 0.25, stroke: "#6f665e", sw: 0.4, sop: 0.4 },
  muscle: { fill: "#7d5860", op: 0.42, stroke: "#9a6b76", sw: 0.5, sop: 0.5 },
  bone: { fill: "#ded3ba", op: 0.85, stroke: "#b7ac93", sw: 0.9, sop: 0.9 },
  vein: { fill: "#5B8FD4", op: 0.7, stroke: "#8fb4e6", sw: 0.4, sop: 0.9 },
  artery: { fill: "#E5564A", op: 0.85, stroke: "#f4938a", sw: 0.4, sop: 1 },
  nerve: { fill: "#E3B23C", op: 0.92, stroke: "#f4d488", sw: 0.5, sop: 1 },
  sel: { fill: "#B0455F", op: 0.95, stroke: "#E7A7B8", sw: 1.5, sop: 1 },
};
const ORDER = ["conn", "muscle", "bone", "vein", "artery", "nerve", "sel"] as const;

export function UsView({
  polys,
  bbox,
  highlight,
  needle,
}: {
  polys: SlicePolygon[];
  bbox: Bbox2D;
  highlight: string[];
  needle?: NeedleView;
}) {
  const hi = new Set(highlight);
  const cw = Math.max(bbox.maxx - bbox.minx, 1e-6);
  const ch = Math.max(bbox.maxy - bbox.miny, 1e-6);
  const s = SIZE / Math.max(cw, ch);
  const Wa = cw * s + 2 * PAD;
  const H = ch * s + 2 * PAD;
  const W = Wa + 2 * GUT;
  const VH = H + TOP + BOT;
  const X = (x: number) => (x - bbox.minx) * s + PAD + GUT;
  const Y = (y: number) => (y - bbox.miny) * s + PAD + TOP; // surface (miny) en haut
  const cxC = (bbox.minx + bbox.maxx) / 2;

  const path = (p: SlicePolygon) =>
    p.loops.map((lp) => "M" + lp.map((pt) => X(pt[0]).toFixed(1) + " " + Y(pt[1]).toFixed(1)).join("L") + "Z").join(" ");
  const kind = (p: SlicePolygon): keyof typeof STY => (hi.has(p.node) ? "sel" : p.role);

  // étiquettes (cible + os + gros muscles), dans le cadre
  const inFrame = (p: SlicePolygon) => p.cx >= bbox.minx && p.cx <= bbox.maxx && p.cy >= bbox.miny && p.cy <= bbox.maxy;
  const byShort = new Map<string, { p: SlicePolygon; short: string; sel: boolean }>();
  for (const p of polys) {
    const short = nodeShort(p.node);
    const cur = byShort.get(short);
    if (!cur || p.area > cur.p.area) byShort.set(short, { p, short, sel: hi.has(p.node) });
  }
  const uniq = [...byShort.values()].filter((it) => it.sel || inFrame(it.p));
  const chosen = [
    ...uniq.filter((it) => it.sel),
    ...uniq.filter((it) => !it.sel && it.p.role === "bone"),
    ...uniq.filter((it) => !it.sel && it.p.role === "muscle").sort((a, b) => b.p.area - a.p.area),
  ].slice(0, MAX_LABELS);
  const place = (list: typeof chosen, side: "L" | "R") => {
    const items = list.map((it) => ({ ...it, mx: X(it.p.cx), my: Y(it.p.cy), ly: Y(it.p.cy), side }));
    items.sort((a, b) => a.my - b.my);
    for (let i = 1; i < items.length; i++) if (items[i].ly - items[i - 1].ly < GAP) items[i].ly = items[i - 1].ly + GAP;
    return items;
  };
  const placed = [...place(chosen.filter((it) => it.p.cx < cxC), "L"), ...place(chosen.filter((it) => it.p.cx >= cxC), "R")];

  const skinY = Y(bbox.miny);

  return (
    <svg viewBox={`0 0 ${W.toFixed(1)} ${VH.toFixed(1)}`} className="mx-auto block w-full max-w-[680px]" role="img" aria-label="Échographie simulée — coupe de la sonde">
      <defs>
        <radialGradient id="usbg" cx="50%" cy="30%" r="90%">
          <stop offset="0" stopColor="#241017" />
          <stop offset="1" stopColor="#0d0609" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={W} height={VH} rx="6" fill="url(#usbg)" />
      {/* sonde (surface cutanée) en haut */}
      <rect x={GUT} y={skinY - 7} width={Wa - 2 * PAD + 0} height="5" rx="2" fill="#E7A7B8" opacity="0.9" />
      <text x={W / 2} y={skinY - 11} textAnchor="middle" fontSize="8" fill="#E7A7B8" fontWeight="700">SONDE</text>
      {/* graduation de profondeur */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={GUT + 2} x2={Wa + GUT - 2} y1={skinY + (H - 2 * PAD) * f} y2={skinY + (H - 2 * PAD) * f} stroke="#7a5a63" strokeWidth="0.4" strokeDasharray="2 4" opacity="0.5" />
      ))}
      {/* structures */}
      {ORDER.map((role) =>
        polys.filter((p) => kind(p) === role).map((p, i) => {
          const st = STY[role];
          return <path key={role + i} d={path(p)} fill={st.fill} fillOpacity={st.op} fillRule="evenodd" stroke={st.stroke} strokeOpacity={st.sop} strokeWidth={st.sw} />;
        }),
      )}
      {/* étiquettes */}
      {placed.map((it, i) => (
        <g key={i}>
          <line x1={it.side === "L" ? GUT - 4 : Wa + GUT + 4} y1={it.ly} x2={it.mx} y2={it.my} stroke="#c79aa6" strokeWidth="0.5" strokeOpacity="0.7" />
          <circle cx={it.mx} cy={it.my} r="1.5" fill={it.sel ? "#E7A7B8" : "#c79aa6"} />
          <text x={it.side === "L" ? GUT - 7 : Wa + GUT + 7} y={it.ly} textAnchor={it.side === "L" ? "end" : "start"} dominantBaseline="middle" fontSize="7.4" fontWeight={it.sel ? 800 : 600} fill={it.sel ? "#E7A7B8" : "#e9d5dc"}>
            {it.short}
          </text>
        </g>
      ))}
      {/* aiguille dans le plan */}
      {needle && (
        <g>
          <line x1={X(needle.e[0])} y1={Y(needle.e[1])} x2={X(needle.t[0])} y2={Y(needle.t[1])} stroke="#eaf2ff" strokeWidth="1.6" strokeLinecap="round" />
          <line x1={X(needle.e[0])} y1={Y(needle.e[1])} x2={X(needle.t[0])} y2={Y(needle.t[1])} stroke="#eaf2ff" strokeWidth="3.4" strokeLinecap="round" opacity="0.25" />
          <circle cx={X(needle.t[0])} cy={Y(needle.t[1])} r="2.4" fill={needle.inTarget ? "#7CE0A0" : "#ffffff"} />
        </g>
      )}
    </svg>
  );
}

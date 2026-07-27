"use client";

/* Rendu SVG de la coupe axiale calculée en temps réel (membre supérieur). Le muscle
   sélectionné est en évidence (bordeaux), les autres estompés, les os en teinte
   osseuse. Les noms sont déportés dans deux gouttières latérales et reliés par une
   ligne de rappel. Coordonnées normalisées à un repère fixe (le modèle est en mètres),
   cadre autour du muscle sélectionné, antérieur en haut. */

import type { Bbox2D, SlicePolygon } from "@/components/preconia/toxine/limbSlicer";
import { nodeShort } from "@/components/preconia/toxine/toxineCatalog";

const SIZE = 240; // taille de l'anatomie dans le repère SVG
const GUT = 92, PAD = 12, TOP = 22, BOT = 18, GAP = 10, MAX_LABELS = 15;

export function AxialSlice({
  polys,
  bbox,
  highlight,
}: {
  polys: SlicePolygon[];
  bbox: Bbox2D;
  highlight: string[];
}) {
  const hi = new Set(highlight);
  const cw = Math.max(bbox.maxx - bbox.minx, 1e-6);
  const ch = Math.max(bbox.maxy - bbox.miny, 1e-6);
  const s = SIZE / Math.max(cw, ch);
  const Wa = cw * s + 2 * PAD;
  const H = ch * s + 2 * PAD;
  const W = Wa + 2 * GUT;
  const X = (x: number) => (x - bbox.minx) * s + PAD + GUT;
  const Y = (y: number) => (y - bbox.miny) * s + PAD + TOP; // antérieur (miny) en haut
  const cxC = (bbox.minx + bbox.maxx) / 2;

  const path = (p: SlicePolygon) =>
    p.loops.map((lp) => "M" + lp.map((pt) => X(pt[0]).toFixed(1) + " " + Y(pt[1]).toFixed(1)).join("L") + "Z").join(" ");
  const kind = (p: SlicePolygon): keyof typeof STY => (hi.has(p.node) ? "sel" : p.role);
  const STY = {
    conn: { fill: "#CBBFB4", op: 0.28, stroke: "#a89a8c", sw: 0.4, sop: 0.4 },
    muscle: { fill: "#B47487", op: 0.16, stroke: "#a05a6e", sw: 0.5, sop: 0.3 },
    bone: { fill: "#E9E1CE", op: 1, stroke: "#C8B48A", sw: 1, sop: 1 },
    vein: { fill: "#3B6CA8", op: 0.7, stroke: "#2c527f", sw: 0.4, sop: 0.85 },
    artery: { fill: "#C0392B", op: 0.82, stroke: "#8f2318", sw: 0.4, sop: 0.9 },
    nerve: { fill: "#E3B23C", op: 0.92, stroke: "#a97d18", sw: 0.5, sop: 1 },
    sel: { fill: "#7A1E38", op: 0.92, stroke: "#C86B85", sw: 1.4, sop: 1 },
  } as const;
  const ORDER = ["conn", "muscle", "bone", "vein", "artery", "nerve", "sel"] as const;

  const byShort = new Map<string, { p: SlicePolygon; short: string; sel: boolean }>();
  for (const p of polys) {
    const short = nodeShort(p.node);
    const cur = byShort.get(short);
    if (!cur || p.area > cur.p.area) byShort.set(short, { p, short, sel: hi.has(p.node) });
  }
  const inFrame = (p: SlicePolygon) => p.cx >= bbox.minx && p.cx <= bbox.maxx && p.cy >= bbox.miny && p.cy <= bbox.maxy;
  const all = [...byShort.values()].filter((it) => it.sel || inFrame(it.p));
  const sel = all.filter((it) => it.sel);
  const bones = all.filter((it) => !it.sel && it.p.role === "bone");
  const others = all.filter((it) => !it.sel && it.p.role === "muscle").sort((a, b) => b.p.area - a.p.area);
  const chosen = [...sel, ...bones, ...others].slice(0, MAX_LABELS);

  const place = (list: typeof chosen, side: "L" | "R") => {
    const items = list.map((it) => ({ ...it, mx: X(it.p.cx), my: Y(it.p.cy), ly: Y(it.p.cy), side }));
    items.sort((a, b) => a.my - b.my);
    const yTop = TOP + 8, yBot = H + TOP - 6;
    for (let i = 0; i < items.length; i++) {
      items[i].ly = Math.max(yTop, items[i].my);
      if (i > 0) items[i].ly = Math.max(items[i].ly, items[i - 1].ly + GAP);
    }
    for (let i = items.length - 1; i >= 0; i--) {
      const cap = yBot - (items.length - 1 - i) * GAP;
      if (items[i].ly > cap) items[i].ly = cap;
    }
    return items;
  };
  const placed = [
    ...place(chosen.filter((it) => it.p.cx < cxC), "L"),
    ...place(chosen.filter((it) => it.p.cx >= cxC), "R"),
  ];

  return (
    <svg viewBox={`0 0 ${W.toFixed(1)} ${(H + TOP + BOT).toFixed(1)}`} className="mx-auto block w-full max-w-[400px]" role="img" aria-label="Coupe axiale du membre supérieur — muscles nommés">
      <text x={W / 2} y="13" textAnchor="middle" fontSize="9" fill="#a83e5a" fontWeight="700">ANTÉRIEUR</text>
      {placed.map((it, i) => (
        <g key={"lead" + i}>
          <line x1={it.side === "L" ? GUT - 4 : Wa + GUT + 4} y1={it.ly} x2={it.mx} y2={it.my} stroke="#a05a6e" strokeWidth="0.5" strokeOpacity="0.7" />
          <circle cx={it.mx} cy={it.my} r="1.5" fill={it.sel ? "#7A1E38" : "#a05a6e"} />
        </g>
      ))}
      {ORDER.map((role) =>
        polys
          .filter((p) => kind(p) === role)
          .map((p, i) => {
            const st = STY[role];
            return <path key={role + i} d={path(p)} fill={st.fill} fillOpacity={st.op} fillRule="evenodd" stroke={st.stroke} strokeOpacity={st.sop} strokeWidth={st.sw} />;
          }),
      )}
      {placed.map((it, i) => (
        <text
          key={"lab" + i}
          x={it.side === "L" ? GUT - 7 : Wa + GUT + 7}
          y={it.ly}
          textAnchor={it.side === "L" ? "end" : "start"}
          dominantBaseline="middle"
          fontSize="7.4"
          fontWeight={it.sel ? 800 : 600}
          fill={it.sel ? "#7A1E38" : "#4A1024"}
        >
          {it.short}
        </text>
      ))}
      <text x={W / 2} y={H + TOP + BOT - 5} textAnchor="middle" fontSize="9" fill="#a83e5a" fontWeight="700">POSTÉRIEUR</text>
    </svg>
  );
}

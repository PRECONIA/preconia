"use client";

/* Rendu SVG de la coupe axiale calculée en temps réel. Les polygones (FDS en évidence,
   os, autres muscles estompés) sont dessinés au centre ; les NOMS sont déportés dans
   des gouttières latérales et reliés à leur muscle par une ligne de rappel (meilleure
   lisibilité qu'une étiquette posée sur le muscle). Cadre fixe (bbox de la plage
   parcourue) → la vue ne saute pas quand l'ascenseur déplace le niveau ; antérieur en
   haut. Étiquettes dédupliquées par muscle et limitées aux structures notables. */

import type { Bbox2D, SlicePolygon } from "@/components/preconia/toxine/forearmSlicer";

const STROKE: Record<string, { fill: string; opacity: number; stroke: string; sw: number }> = {
  fds: { fill: "#7A1E38", opacity: 0.92, stroke: "#C86B85", sw: 1.4 },
  bone: { fill: "#E9E1CE", opacity: 1, stroke: "#C8B48A", sw: 1 },
  ctx: { fill: "#B47487", opacity: 0.16, stroke: "#a05a6e", sw: 0.5 },
};
const TOP = 20, BOT = 16, MAX_LABELS = 16;

interface Placed {
  p: SlicePolygon;
  mx: number;
  my: number;
  ly: number;
  side: "L" | "R";
}

export function AxialSlice({ polys, bbox }: { polys: SlicePolygon[]; bbox: Bbox2D }) {
  const pad = Math.max(bbox.maxx - bbox.minx, bbox.maxy - bbox.miny) * 0.06;
  const Wa = bbox.maxx - bbox.minx + 2 * pad; // largeur anatomie
  const H = bbox.maxy - bbox.miny + 2 * pad;
  const GUT = Wa * 0.42; // gouttière d'étiquettes de chaque côté
  const W = Wa + 2 * GUT;
  const X = (x: number) => x - bbox.minx + pad + GUT;
  const Y = (y: number) => y - bbox.miny + pad + TOP; // antérieur (miny) en haut
  const cxC = (bbox.minx + bbox.maxx) / 2;

  const path = (p: SlicePolygon) =>
    p.loops.map((lp) => "M" + lp.map((pt) => X(pt[0]).toFixed(1) + " " + Y(pt[1]).toFixed(1)).join("L") + "Z").join(" ");

  // une étiquette par muscle (plus grand polygone), limitée aux structures notables
  const byName = new Map<string, SlicePolygon>();
  for (const p of polys) {
    const cur = byName.get(p.label);
    if (!cur || p.area > cur.area) byName.set(p.label, p);
  }
  const uniq = [...byName.values()];
  const maxArea = uniq.reduce((m, p) => Math.max(m, p.area), 1);
  const chosen = uniq
    .filter((p) => p.role !== "ctx" || p.area > 0.07 * maxArea)
    .sort((a, b) => b.area - a.area)
    .slice(0, MAX_LABELS);

  // répartition en deux colonnes, empilées verticalement dans l'ordre des muscles
  const place = (list: SlicePolygon[], side: "L" | "R"): Placed[] => {
    const items: Placed[] = list.map((p) => ({ p, mx: X(p.cx), my: Y(p.cy), ly: Y(p.cy), side }));
    items.sort((a, b) => a.my - b.my);
    const gap = 10.5, yTop = TOP + 9, yBot = H + TOP - 6;
    for (let i = 0; i < items.length; i++) {
      items[i].ly = Math.max(yTop, items[i].my);
      if (i > 0) items[i].ly = Math.max(items[i].ly, items[i - 1].ly + gap);
    }
    for (let i = items.length - 1; i >= 0; i--) {
      const cap = yBot - (items.length - 1 - i) * gap;
      if (items[i].ly > cap) items[i].ly = cap;
    }
    return items;
  };
  const placed = [
    ...place(chosen.filter((p) => p.cx < cxC), "L"),
    ...place(chosen.filter((p) => p.cx >= cxC), "R"),
  ];

  return (
    <svg
      viewBox={`0 0 ${W.toFixed(0)} ${(H + TOP + BOT).toFixed(0)}`}
      className="mx-auto block w-full max-w-[380px]"
      role="img"
      aria-label="Coupe axiale de l'avant-bras droit — muscles nommés par lignes de rappel"
    >
      <text x={W / 2} y="12" textAnchor="middle" fontSize="8.5" fill="#a83e5a" fontWeight="700">
        ANTÉRIEUR (fléchisseurs)
      </text>
      {/* lignes de rappel (sous les polygones) */}
      {placed.map(({ p, mx, my, ly, side }, i) => {
        const lx = side === "L" ? GUT - 4 : Wa + GUT + 4;
        return (
          <g key={"lead" + i}>
            <line x1={lx} y1={ly} x2={mx} y2={my} stroke="#a05a6e" strokeWidth="0.5" strokeOpacity="0.7" />
            <circle cx={mx} cy={my} r="1.4" fill={p.role === "fds" ? "#7A1E38" : "#a05a6e"} />
          </g>
        );
      })}
      {(["ctx", "bone", "fds"] as const).map((role) =>
        polys
          .filter((p) => p.role === role)
          .map((p, i) => {
            const s = STROKE[role];
            return (
              <path
                key={role + i}
                d={path(p)}
                fill={s.fill}
                fillOpacity={s.opacity}
                fillRule="evenodd"
                stroke={s.stroke}
                strokeOpacity={role === "ctx" ? 0.3 : 1}
                strokeWidth={s.sw}
              />
            );
          }),
      )}
      {/* étiquettes dans les gouttières */}
      {placed.map(({ p, ly, side }, i) => (
        <text
          key={"lab" + i}
          x={side === "L" ? GUT - 7 : Wa + GUT + 7}
          y={ly}
          textAnchor={side === "L" ? "end" : "start"}
          dominantBaseline="middle"
          fontSize="7.2"
          fontWeight={p.role === "fds" ? 800 : 600}
          fill={p.role === "fds" ? "#7A1E38" : "#4A1024"}
        >
          {p.label}
        </text>
      ))}
      <text x={W / 2} y={H + TOP + BOT - 4} textAnchor="middle" fontSize="8.5" fill="#a83e5a" fontWeight="700">
        POSTÉRIEUR (extenseurs)
      </text>
    </svg>
  );
}

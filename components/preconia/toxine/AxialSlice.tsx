"use client";

/* Rendu SVG de la coupe axiale calculée en temps réel : polygones des structures
   coupées (FDS en évidence, os, autres muscles estompés) avec leurs noms. Cadre fixe
   (bbox du modèle) pour que la vue ne saute pas quand l'ascenseur déplace le niveau ;
   antérieur en haut. Les étiquettes sont dédupliquées par muscle, limitées aux
   structures notables et écartées verticalement pour rester lisibles. */

import type { Bbox2D, SlicePolygon } from "@/components/preconia/toxine/forearmSlicer";

const STROKE: Record<string, { fill: string; opacity: number; stroke: string; sw: number }> = {
  fds: { fill: "#7A1E38", opacity: 0.92, stroke: "#C86B85", sw: 1.4 },
  bone: { fill: "#E9E1CE", opacity: 1, stroke: "#C8B48A", sw: 1 },
  ctx: { fill: "#B47487", opacity: 0.16, stroke: "#a05a6e", sw: 0.5 },
};
const TOP = 20, BOT = 16;
const MAX_LABELS = 13;

export function AxialSlice({ polys, bbox }: { polys: SlicePolygon[]; bbox: Bbox2D }) {
  const pad = Math.max(bbox.maxx - bbox.minx, bbox.maxy - bbox.miny) * 0.08;
  const W = bbox.maxx - bbox.minx + 2 * pad;
  const H = bbox.maxy - bbox.miny + 2 * pad;
  const X = (x: number) => x - bbox.minx + pad;
  const Y = (y: number) => y - bbox.miny + pad + TOP; // antérieur (miny) en haut

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
  const labels = uniq
    .filter((p) => p.role !== "ctx" || p.area > 0.09 * maxArea)
    .sort((a, b) => b.area - a.area)
    .slice(0, MAX_LABELS)
    .map((p) => ({ p, x: X(p.cx), y: Y(p.cy) }));
  // écartement vertical des étiquettes trop proches
  labels.sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++)
    for (let j = 0; j < i; j++)
      if (Math.abs(labels[i].x - labels[j].x) < 26 && Math.abs(labels[i].y - labels[j].y) < 9.5)
        labels[i].y = labels[j].y + 9.5;

  return (
    <svg
      viewBox={`0 0 ${W.toFixed(0)} ${(H + TOP + BOT).toFixed(0)}`}
      className="mx-auto block w-full max-w-[330px]"
      role="img"
      aria-label="Coupe axiale de l'avant-bras droit — muscles nommés"
    >
      <text x={W / 2} y="12" textAnchor="middle" fontSize="9" fill="#a83e5a" fontWeight="700">
        ANTÉRIEUR (fléchisseurs)
      </text>
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
      {labels.map(({ p, x, y }, i) => (
        <text
          key={"l" + i}
          x={x.toFixed(1)}
          y={y.toFixed(1)}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={p.role === "fds" ? 9.5 : 6.6}
          fontWeight={p.role === "fds" ? 800 : 700}
          fill={p.role === "fds" ? "#fff" : "#4A1024"}
          stroke={p.role === "fds" ? "none" : "#fff"}
          strokeWidth={p.role === "fds" ? 0 : 2}
          paintOrder="stroke"
          style={{ pointerEvents: "none" }}
        >
          {p.label}
        </text>
      ))}
      <text x={W / 2} y={H + TOP + BOT - 4} textAnchor="middle" fontSize="9" fill="#a83e5a" fontWeight="700">
        POSTÉRIEUR (extenseurs)
      </text>
    </svg>
  );
}

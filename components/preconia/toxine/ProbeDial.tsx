"use client";

/* Rosace de positionnement : coupe du membre vue « du bout » (proximal → distal),
   avec la sonde que l'on fait glisser TOUT AUTOUR du membre. On y lit d'un coup d'œil
   la face abordée (antérieure, médiale, postérieure, latérale), le champ échographié
   et l'arrivée de l'aiguille par le côté de la sonde. Membre supérieur DROIT. */

import { useRef } from "react";
import type { SlicePolygon } from "@/components/preconia/toxine/limbSlicer";
import { toWorld, type LimbSection, type NeedlePlan, type ProbeFrame, type Pt } from "@/components/preconia/toxine/probeGeom";

const ROSE = "#C86B85";

export function ProbeDial({
  section,
  frame,
  depth,
  highlight,
  needle,
  onTheta,
}: {
  section: LimbSection;
  frame: ProbeFrame;
  depth: number;
  highlight: string[];
  needle?: NeedlePlan;
  onTheta: (theta: number) => void;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const hi = new Set(highlight);
  const R = section.radius * 1.72;
  const vb = `${section.c[0] - R} ${section.c[1] - R} ${2 * R} ${2 * R}`;
  const k = R / 100; // épaisseur des traits, indépendante de la taille du membre

  const dLoops = (loops: Pt[][]) =>
    loops.map((lp) => "M" + lp.map((q) => `${q[0].toFixed(4)} ${q[1].toFixed(4)}`).join("L") + "Z").join(" ");

  const drop = (p: SlicePolygon) => hi.has(p.node);
  const a = toWorld(frame, [-frame.foot / 2, 0]);
  const b = toWorld(frame, [frame.foot / 2, 0]);
  const back = (t: number): Pt => [
    frame.o[0] + t * frame.n[0] * frame.foot,
    frame.o[1] + t * frame.n[1] * frame.foot,
  ];
  const body = (() => {
    const h = frame.foot * 0.42;
    const c1: Pt = [a[0] + frame.n[0] * h, a[1] + frame.n[1] * h];
    const c2: Pt = [b[0] + frame.n[0] * h, b[1] + frame.n[1] * h];
    return `M${a[0]} ${a[1]}L${b[0]} ${b[1]}L${c2[0]} ${c2[1]}L${c1[0]} ${c1[1]}Z`;
  })();
  const fieldFar = [toWorld(frame, [-frame.foot / 2, depth]), toWorld(frame, [frame.foot / 2, depth])];
  const grip = back(0.68);

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const m = ref.current?.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    onTheta(Math.atan2(p.x - section.c[0], -(p.y - section.c[1])));
  };

  return (
    <svg
      ref={ref}
      viewBox={vb}
      className="h-full w-full touch-none select-none"
      role="application"
      aria-label="Position de la sonde autour du membre"
      style={{ cursor: "grab" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pick(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) pick(e);
      }}
    >
      {/* couronne de repérage */}
      <circle cx={section.c[0]} cy={section.c[1]} r={section.radius * 1.3} fill="#fff" fillOpacity="0.55" stroke={ROSE} strokeOpacity="0.35" strokeWidth={k * 0.6} strokeDasharray={`${k * 2} ${k * 2}`} />

      {/* anatomie simplifiée */}
      <path d={dLoops([section.skin])} fill="#f3dfe5" stroke="#c9a2ae" strokeWidth={k * 0.7} />
      <path d={dLoops([section.fascia])} fill="#e7c9d2" fillOpacity="0.8" stroke="none" />
      {section.polys.filter((p) => p.role === "bone").map((p, i) => (
        <path key={"b" + i} d={dLoops(p.loops)} fill="#efe7d3" stroke="#c8b48a" strokeWidth={k * 0.5} fillRule="evenodd" />
      ))}
      {section.polys.filter(drop).map((p, i) => (
        <path key={"s" + i} d={dLoops(p.loops)} fill="#7A1E38" fillOpacity="0.9" fillRule="evenodd" />
      ))}

      {/* champ échographié */}
      <path
        d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}L${fieldFar[1][0]} ${fieldFar[1][1]}L${fieldFar[0][0]} ${fieldFar[0][1]}Z`}
        fill={ROSE}
        fillOpacity="0.22"
        stroke={ROSE}
        strokeOpacity="0.5"
        strokeWidth={k * 0.5}
      />

      {/* aiguille */}
      {needle && (
        <g>
          <line
            x1={toWorld(frame, [needle.entry[0] - needle.dir[0] * 0.022, needle.entry[1] - needle.dir[1] * 0.022])[0]}
            y1={toWorld(frame, [needle.entry[0] - needle.dir[0] * 0.022, needle.entry[1] - needle.dir[1] * 0.022])[1]}
            x2={toWorld(frame, needle.entry)[0]}
            y2={toWorld(frame, needle.entry)[1]}
            stroke="#5b6570"
            strokeWidth={k * 0.8}
            strokeOpacity="0.55"
          />
          <line
            x1={toWorld(frame, needle.entry)[0]}
            y1={toWorld(frame, needle.entry)[1]}
            x2={toWorld(frame, needle.tip)[0]}
            y2={toWorld(frame, needle.tip)[1]}
            stroke="#1f2933"
            strokeWidth={k * 1.1}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* sonde */}
      <path d={body} fill="#2b3138" stroke="#11151a" strokeWidth={k * 0.4} />
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={ROSE} strokeWidth={k * 1.3} strokeLinecap="round" />
      <circle cx={a[0] + (b[0] - a[0]) * 0.06} cy={a[1] + (b[1] - a[1]) * 0.06} r={k * 1.1} fill="#7fd4e8" />
      <line
        x1={frame.o[0] + frame.n[0] * frame.foot * 0.4}
        y1={frame.o[1] + frame.n[1] * frame.foot * 0.4}
        x2={grip[0]}
        y2={grip[1]}
        stroke="#2b3138"
        strokeWidth={k * 3.4}
        strokeLinecap="round"
      />

      {/* orientation anatomique (membre supérieur droit) */}
      {[
        ["ANT", section.c[0], section.c[1] - R * 0.96, "middle"],
        ["POST", section.c[0], section.c[1] + R * 0.97, "middle"],
        ["MÉD", section.c[0] + R * 0.95, section.c[1], "end"],
        ["LAT", section.c[0] - R * 0.95, section.c[1], "start"],
      ].map(([t, x, y, anchor]) => (
        <text
          key={t as string}
          x={x as number}
          y={y as number}
          textAnchor={anchor as "middle" | "start" | "end"}
          dominantBaseline="middle"
          fontSize={k * 7}
          fontWeight="700"
          fill="#a83e5a"
        >
          {t as string}
        </text>
      ))}
    </svg>
  );
}

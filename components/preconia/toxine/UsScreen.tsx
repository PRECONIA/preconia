"use client";

/* Écran d'échographie simulé (mode B, barrette linéaire) — rendu dans le repère de la
   SONDE : la semelle est en haut, la profondeur descend, et le champ affiché est
   exactement celui de la barrette (largeur = semelle). Tourner la sonde autour du
   membre fait donc tourner l'anatomie, comme sur un vrai appareil.

   Réalisme visuel : image en niveaux de gris, speckle, atténuation en profondeur,
   graisse sous-cutanée septée, fascias hyperéchogènes, muscles « ciel étoilé »,
   nerfs en nid d'abeille, vaisseaux anéchogènes à paroi brillante, cône d'ombre
   acoustique sous les corticales osseuses, aiguille dont la visibilité chute avec
   l'angulation (avec réverbération). Les repères colorés/étiquetés sont un CALQUE
   pédagogique, désactivable pour retrouver une image brute. Aucune valeur clinique. */

import { useMemo, useRef } from "react";
import type { SlicePolygon } from "@/components/preconia/toxine/limbSlicer";
import { nodeShort } from "@/components/preconia/toxine/toxineCatalog";
import {
  M2MM,
  clamp,
  needleEchogenicity,
  toProbe,
  type LimbSection,
  type NeedlePlan,
  type ProbeFrame,
  type Pt,
} from "@/components/preconia/toxine/probeGeom";

const PADL = 7, PADR = 9, PADT = 9, PADB = 5.5; // marges de l'habillage (unités = mm)

export interface BolusView {
  id: number;
  u: number;
  v: number;
  spread: number; // 0..1 — atténuation avec l'éloignement du plan de coupe
}

interface Shape {
  p: SlicePolygon;
  loops: Pt[][];
  cu: number;
  cv: number;
  sel: boolean;
}

/** contour proximal (le plus près de la sonde) d'une structure, échantillonné en colonnes. */
function nearCrest(loops: Pt[][], cols = 40): Pt[] {
  let u0 = Infinity, u1 = -Infinity;
  for (const lp of loops) for (const q of lp) {
    if (q[0] < u0) u0 = q[0];
    if (q[0] > u1) u1 = q[0];
  }
  if (!isFinite(u0) || u1 - u0 < 1e-6) return [];
  const out: Pt[] = [];
  for (let i = 0; i <= cols; i++) {
    const u = u0 + ((u1 - u0) * i) / cols;
    let v = Infinity;
    for (const lp of loops)
      for (let a = 0, b = lp.length - 1; a < lp.length; b = a++) {
        const p1 = lp[b], p2 = lp[a];
        if (p1[0] > u !== p2[0] > u) {
          const vv = p1[1] + ((u - p1[0]) / (p2[0] - p1[0])) * (p2[1] - p1[1]);
          if (vv < v) v = vv;
        }
      }
    if (isFinite(v)) out.push([u, v]);
  }
  return out;
}

export function UsScreen({
  polys,
  section,
  frame,
  depth,
  gain,
  overlay,
  highlight,
  needle,
  boluses = [],
  onAim,
}: {
  polys: SlicePolygon[];
  section: LimbSection;
  frame: ProbeFrame;
  depth: number; // profondeur du champ (m)
  gain: number; // 0..100
  overlay: boolean; // calque de repérage (couleurs + étiquettes)
  highlight: string[];
  needle?: NeedlePlan;
  boluses?: BolusView[];
  onAim?: (u: number, v: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const hi = useMemo(() => new Set(highlight), [highlight]);

  const FW = frame.foot * M2MM;
  const DH = depth * M2MM;
  const W = PADL + FW + PADR;
  const H = PADT + DH + PADB;
  const X = (u: number) => PADL + FW / 2 + u * M2MM;
  const Y = (v: number) => PADT + v * M2MM;
  const x0 = PADL, x1 = PADL + FW, y0 = PADT, y1 = PADT + DH;

  const shapes = useMemo<Shape[]>(
    () =>
      polys.map((p) => {
        const loops = p.loops.map((lp) => lp.map((q) => toProbe(frame, q)));
        const big = loops.reduce((a, b) => (a.length > b.length ? a : b), loops[0] ?? []);
        const cu = big.length ? big.reduce((s, q) => s + q[0], 0) / big.length : 0;
        const cv = big.length ? big.reduce((s, q) => s + q[1], 0) / big.length : 0;
        return { p, loops, cu, cv, sel: hi.has(p.node) };
      }),
    [polys, frame, hi],
  );

  const fasciaPath = useMemo(() => section.fascia.map((q) => toProbe(frame, q)), [section, frame]);
  const skinPath = useMemo(() => section.skin.map((q) => toProbe(frame, q)), [section, frame]);

  const d = (loops: Pt[][]) =>
    loops.map((lp) => "M" + lp.map((q) => `${X(q[0]).toFixed(2)} ${Y(q[1]).toFixed(2)}`).join("L") + "Z").join(" ");

  const crests = useMemo(
    () => shapes.filter((s) => s.p.role === "bone").map((b) => ({ b, crest: nearCrest(b.loops) })),
    [shapes],
  );

  // gain : luminosité globale de l'image (comme la molette « gain » d'un échographe)
  const g = clamp(gain / 60, 0.35, 1.85);
  const lum = (base: number) => clamp(base * g, 0, 100);
  const grey = (base: number) => `hsl(210 6% ${lum(base).toFixed(1)}%)`;

  const inField = (s: Shape) => s.cu > -frame.foot / 2 && s.cu < frame.foot / 2 && s.cv > 0 && s.cv < depth;
  // étiquettes du calque : cible, structures à risque, os, puis les plus gros muscles ;
  // décollées verticalement quand elles se chevauchent.
  const labels = useMemo(() => {
    if (!overlay) return [];
    const pick = [
      ...shapes.filter((s) => s.sel && inField(s)),
      ...shapes.filter((s) => !s.sel && inField(s) && (s.p.role === "nerve" || s.p.role === "artery" || s.p.role === "vein")),
      ...shapes.filter((s) => !s.sel && inField(s) && s.p.role === "bone"),
      ...shapes
        .filter((s) => !s.sel && inField(s) && s.p.role === "muscle")
        .sort((a, b) => b.p.area - a.p.area)
        .slice(0, 3),
    ].slice(0, 9);
    const out = pick
      .map((s) => ({ s, x: clamp(X(s.cu), x0 + 6, x1 - 6), y: clamp(Y(s.cv), y0 + 3, y1 - 1.5) }))
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < out.length; i++)
      for (let j = 0; j < i; j++)
        if (Math.abs(out[i].x - out[j].x) < 11 && out[i].y - out[j].y < 2.4) out[i].y = out[j].y + 2.4;
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes, overlay, depth, frame, gain]);

  const echo = needle ? needleEchogenicity(needle.angle) : 0;
  const nAngleDeg = needle ? Math.round((needle.angle * 180) / Math.PI) : 0;

  const aim = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!onAim || !svgRef.current) return;
    const m = svgRef.current.getScreenCTM();
    if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    onAim((p.x - (PADL + FW / 2)) / M2MM, (p.y - PADT) / M2MM);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W.toFixed(1)} ${H.toFixed(1)}`}
      className="mx-auto block h-full w-full max-w-[760px] touch-none select-none"
      style={{ cursor: onAim ? "crosshair" : "default" }}
      role="img"
      aria-label={`Échographie simulée — sonde à ${Math.round((frame.theta * 180) / Math.PI)}°, profondeur ${(depth * 100).toFixed(1)} cm`}
      onPointerDown={(e) => {
        if (!onAim) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        aim(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) aim(e);
      }}
    >
      <defs>
        <clipPath id="tx-sector">
          <rect x={x0} y={y0} width={FW} height={DH} />
        </clipPath>
        <filter id="tx-speckle" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="2.4 3.2" numOctaves={3} seed={11} result="t" />
          <feColorMatrix
            in="t"
            type="matrix"
            values="0 0 0 0 0.78  0 0 0 0 0.80  0 0 0 0 0.84  0.85 0.35 0 0 -0.34"
          />
        </filter>
        <filter id="tx-blur1">
          <feGaussianBlur stdDeviation="0.35" />
        </filter>
        <pattern id="tx-starry" width="1.7" height="1.55" patternUnits="userSpaceOnUse" patternTransform="rotate(17)">
          <circle cx="0.4" cy="0.5" r="0.14" fill={grey(62)} opacity="0.5" />
          <circle cx="1.25" cy="1.2" r="0.1" fill={grey(54)} opacity="0.4" />
          <circle cx="1.35" cy="0.35" r="0.07" fill={grey(48)} opacity="0.32" />
        </pattern>
        <pattern id="tx-septa" width="7" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-7)">
          <path d="M0 1.1 L7 0.5" stroke={grey(70)} strokeWidth="0.24" fill="none" opacity="0.55" />
          <path d="M0 2.7 L7 3.1" stroke={grey(62)} strokeWidth="0.17" fill="none" opacity="0.4" />
        </pattern>
        <pattern id="tx-fascicles" width="1.5" height="1.5" patternUnits="userSpaceOnUse">
          <circle cx="0.75" cy="0.75" r="0.4" fill={grey(22)} opacity="0.85" />
        </pattern>
        <linearGradient id="tx-tgc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="0.55" stopColor="#000" stopOpacity="0.12" />
          <stop offset="1" stopColor="#000" stopOpacity="0.42" />
        </linearGradient>
        <radialGradient id="tx-bolus">
          <stop offset="0" stopColor="#05070a" stopOpacity="0.92" />
          <stop offset="0.72" stopColor="#0d1116" stopOpacity="0.72" />
          <stop offset="1" stopColor="#cfd6dd" stopOpacity="0.28" />
        </radialGradient>
      </defs>

      {/* châssis de l'appareil */}
      <rect x="0" y="0" width={W} height={H} rx="2.2" fill="#07090c" />
      <text x={PADL - 1} y="3.6" fontSize="2" fontFamily="ui-monospace, monospace" fill="#7fd4e8" letterSpacing="0.06">
        L 12–4 MHz · MSK
      </text>
      <text x={PADL - 1} y="6.6" fontSize="1.75" fontFamily="ui-monospace, monospace" fill="#4b6b78">
        PETIT AXE · SONDE {Math.round((((frame.theta * 180) / Math.PI) % 360 + 360) % 360)}°
      </text>
      <text x={W - 2} y="3.6" textAnchor="end" fontSize="2" fontFamily="ui-monospace, monospace" fill="#7fd4e8">
        P {(depth * 100).toFixed(1)} cm · G {Math.round(gain)}
      </text>
      <text x={W - 2} y="6.6" textAnchor="end" fontSize="1.75" fontFamily="ui-monospace, monospace" fill="#4b6b78">
        MI 0,4 · TIS 0,3
      </text>

      {/* repère d'orientation de la sonde (côté marqueur = gauche de l'image) */}
      <circle cx={x0 + 1.5} cy={y0 + 1.5} r="0.75" fill="#7fd4e8" opacity="0.9" />

      <g clipPath="url(#tx-sector)">
        {/* fond + tissu sous-cutané */}
        <rect x={x0} y={y0} width={FW} height={DH} fill={grey(36)} />
        <rect x={x0} y={y0} width={FW} height={DH} fill="url(#tx-septa)" opacity="0.75" />

        {/* plan profond (sous le fascia) */}
        <path d={d([fasciaPath])} fill={grey(12)} />
        <path d={d([skinPath])} fill="none" stroke={grey(88)} strokeWidth="0.5" strokeOpacity="0.75" />

        {/* muscles */}
        {shapes
          .filter((s) => s.p.role === "muscle" || s.p.role === "conn")
          .map((s, i) => (
            <g key={"m" + i}>
              <path d={d(s.loops)} fill={s.p.role === "conn" ? grey(31) : grey(20)} fillRule="evenodd" />
              {s.p.role === "muscle" && <path d={d(s.loops)} fill="url(#tx-starry)" fillRule="evenodd" opacity="0.85" />}
              <path d={d(s.loops)} fill="none" stroke={grey(78)} strokeWidth="0.34" strokeOpacity="0.8" />
            </g>
          ))}

        {/* muscle cible : même échostructure, souligné par le calque de repérage */}
        {shapes
          .filter((s) => s.sel)
          .map((s, i) => (
            <g key={"s" + i}>
              {overlay && <path d={d(s.loops)} fill="#ff7fa2" fillOpacity="0.13" fillRule="evenodd" />}
              <path
                d={d(s.loops)}
                fill="none"
                stroke={overlay ? "#ff8fb0" : grey(92)}
                strokeWidth={overlay ? 0.62 : 0.45}
                strokeOpacity="0.95"
              />
            </g>
          ))}

        {/* nerfs (nid d'abeille) et vaisseaux (anéchogènes, paroi brillante) */}
        {shapes
          .filter((s) => s.p.role === "nerve")
          .map((s, i) => (
            <g key={"n" + i}>
              <path d={d(s.loops)} fill={grey(62)} fillRule="evenodd" />
              <path d={d(s.loops)} fill="url(#tx-fascicles)" fillRule="evenodd" opacity="0.8" />
              <path d={d(s.loops)} fill="none" stroke={overlay ? "#f2c14e" : grey(95)} strokeWidth="0.45" />
            </g>
          ))}
        {shapes
          .filter((s) => s.p.role === "artery" || s.p.role === "vein")
          .map((s, i) => (
            <g key={"v" + i}>
              <path d={d(s.loops)} fill="#05080b" fillRule="evenodd" />
              {overlay && (
                <path
                  d={d(s.loops)}
                  fill={s.p.role === "artery" ? "#e0483c" : "#3f79c8"}
                  fillOpacity="0.42"
                  fillRule="evenodd"
                />
              )}
              <path d={d(s.loops)} fill="none" stroke={grey(90)} strokeWidth="0.42" />
            </g>
          ))}

        {/* aiguille et produit injecté — dessinés AVANT les ombres osseuses :
            ce qui passe derrière une corticale n'est plus insonifié, donc invisible */}
        {/* diffusion du produit injecté */}
        {boluses.map((b) => (
          <circle key={b.id} cx={X(b.u)} cy={Y(b.v)} r="0.5" fill="url(#tx-bolus)" opacity={0.25 + 0.75 * b.spread}>
            <animate attributeName="r" from="0.5" to="4.6" dur="1.5s" fill="freeze" />
          </circle>
        ))}

        {/* aiguille : visibilité décroissante avec l'angulation + réverbération */}
        {needle && needle.inserted > 0 && (
          <g>
            {[1, 2, 3].map((k) => (
              <line
                key={k}
                x1={X(needle.entry[0]) + k * 0.9 * needle.side * needle.dir[1]}
                y1={Y(needle.entry[1]) - k * 0.9 * needle.side * needle.dir[0]}
                x2={X(needle.tip[0]) + k * 0.9 * needle.side * needle.dir[1]}
                y2={Y(needle.tip[1]) - k * 0.9 * needle.side * needle.dir[0]}
                stroke="#e8f3ff"
                strokeWidth="0.5"
                strokeOpacity={0.2 * echo * (1 - k / 4)}
                strokeLinecap="round"
              />
            ))}
            <line
              x1={X(needle.entry[0])}
              y1={Y(needle.entry[1])}
              x2={X(needle.tip[0])}
              y2={Y(needle.tip[1])}
              stroke="#ffffff"
              strokeOpacity={0.22 * echo}
              strokeWidth="1.7"
              strokeLinecap="round"
              filter="url(#tx-blur1)"
            />
            <line
              x1={X(needle.entry[0])}
              y1={Y(needle.entry[1])}
              x2={X(needle.tip[0])}
              y2={Y(needle.tip[1])}
              stroke="#f2f8ff"
              strokeOpacity={0.35 + 0.65 * echo}
              strokeWidth="0.62"
              strokeLinecap="round"
            />
            <circle cx={X(needle.tip[0])} cy={Y(needle.tip[1])} r="0.85" fill="#ffffff" opacity={0.55 + 0.45 * echo} />
          </g>
        )}

        {/* os : cône d'ombre acoustique, corticale brillante seulement là où le
            faisceau l'aborde de face (l'écho s'éteint sur les versants obliques) */}
        {crests.map(({ b, crest }, i) =>
          crest.length < 2 ? null : (
            <g key={"b" + i}>
              <path
                d={
                  "M" +
                  crest.map((q) => `${X(q[0]).toFixed(2)} ${Y(q[1]).toFixed(2)}`).join("L") +
                  `L${X(crest[crest.length - 1][0] + 0.002).toFixed(2)} ${y1}` +
                  `L${X(crest[0][0] - 0.002).toFixed(2)} ${y1}Z`
                }
                fill="#04060a"
                fillOpacity="0.94"
              />
              {crest.slice(1).map((q, k) => {
                const p = crest[k];
                const du = q[0] - p[0];
                const slope = du === 0 ? 9 : Math.abs((q[1] - p[1]) / du);
                const op = clamp(1 - slope / 1.5, 0, 1);
                if (op < 0.06) return null;
                return (
                  <g key={k}>
                    <line
                      x1={X(p[0])}
                      y1={Y(p[1])}
                      x2={X(q[0])}
                      y2={Y(q[1])}
                      stroke="#ffffff"
                      strokeOpacity={0.45 * op}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      filter="url(#tx-blur1)"
                    />
                    <line
                      x1={X(p[0])}
                      y1={Y(p[1])}
                      x2={X(q[0])}
                      y2={Y(q[1])}
                      stroke={grey(97)}
                      strokeOpacity={op}
                      strokeWidth="0.9"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}
              <text
                x={clamp(X(b.cu), x0 + 6, x1 - 6)}
                y={Y(Math.min(...crest.map((q) => q[1]))) + 5.5}
                textAnchor="middle"
                fontSize="1.7"
                fill="#6d7c86"
                opacity={overlay ? 0.85 : 0}
              >
                ombre
              </text>
            </g>
          ),
        )}

        {/* atténuation en profondeur + speckle */}
        <rect x={x0} y={y0} width={FW} height={DH} fill="url(#tx-tgc)" />
        <rect
          x={x0}
          y={y0}
          width={FW}
          height={DH}
          filter="url(#tx-speckle)"
          opacity={clamp(0.22 + gain / 260, 0.2, 0.55)}
          style={{ mixBlendMode: "overlay" }}
        />
        {/* interface sonde / peau (champ proche très brillant) */}
        <rect x={x0} y={y0} width={FW} height="0.55" fill="#f4f7fa" opacity="0.9" />
        <rect x={x0} y={y0 + 0.7} width={FW} height="0.35" fill="#c9d3db" opacity="0.5" />

        {/* étiquettes du calque de repérage */}
        {labels.map(({ s, x, y }, i) => (
          <text
            key={"l" + i}
            x={x < x0 + 11 ? x0 + 1.2 : x > x1 - 11 ? x1 - 1.2 : x}
            y={y}
            textAnchor={x < x0 + 11 ? "start" : x > x1 - 11 ? "end" : "middle"}
            fontSize="1.75"
            fontWeight={s.sel ? 800 : 600}
            fill={
              s.sel
                ? "#ffb3c6"
                : s.p.role === "artery"
                  ? "#ff8a7d"
                  : s.p.role === "vein"
                    ? "#8ab4f0"
                    : s.p.role === "nerve"
                      ? "#f6d27a"
                      : "#dfe6ec"
            }
            stroke="#04060a"
            strokeWidth="0.6"
            strokeOpacity="0.85"
            paintOrder="stroke"
          >
            {nodeShort(s.p.node).slice(0, 18)}
          </text>
        ))}
      </g>

      {/* cadre + règle de profondeur */}
      <rect x={x0} y={y0} width={FW} height={DH} fill="none" stroke="#1d2a31" strokeWidth="0.35" />
      {Array.from({ length: Math.floor(DH / 5) + 1 }, (_, i) => i * 5).map((mm) => (
        <g key={mm}>
          <line x1={x1 + 0.8} x2={x1 + (mm % 10 === 0 ? 2.6 : 1.6)} y1={y0 + mm} y2={y0 + mm} stroke="#4b6b78" strokeWidth="0.3" />
          {mm % 10 === 0 && mm > 0 && (
            <text x={x1 + 3.4} y={y0 + mm + 0.7} fontSize="1.9" fontFamily="ui-monospace, monospace" fill="#6f96a5">
              {mm / 10}
            </text>
          )}
        </g>
      ))}
      <text x={x1 + 3.4} y={y0 - 0.8} fontSize="1.7" fontFamily="ui-monospace, monospace" fill="#4b6b78">
        cm
      </text>

      {/* arrivée de l'aiguille par le côté de la sonde */}
      {needle && (
        <g opacity="0.95">
          <path
            d={
              needle.side === -1
                ? `M${x0 - 0.4} ${Y(needle.entry[1]) + 1.3}L${x0 - 2.6} ${Y(needle.entry[1]) + 0.1}L${x0 - 0.4} ${Y(needle.entry[1]) - 1.1}Z`
                : `M${x1 + 0.4} ${Y(needle.entry[1]) + 1.3}L${x1 + 2.6} ${Y(needle.entry[1]) + 0.1}L${x1 + 0.4} ${Y(needle.entry[1]) - 1.1}Z`
            }
            fill="#f2f8ff"
            opacity="0.75"
          />
          <text
            x={needle.side === -1 ? x0 - 0.6 : x1 + 0.6}
            y={Y(needle.entry[1]) + 3.4}
            textAnchor={needle.side === -1 ? "end" : "start"}
            fontSize="1.9"
            fontFamily="ui-monospace, monospace"
            fill="#9fb6c2"
          >
            {nAngleDeg}°
          </text>
        </g>
      )}

      <text x={PADL - 1} y={H - 1.5} fontSize="1.55" fontFamily="ui-monospace, monospace" fill="#3d5761">
        PRECONIA · IMAGE DE SYNTHÈSE — sans valeur diagnostique
      </text>
    </svg>
  );
}

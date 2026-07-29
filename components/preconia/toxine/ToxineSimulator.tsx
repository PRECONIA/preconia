"use client";

/* Simulateur d'injection écho-guidée (plein écran, PROTOTYPE).

   La sonde linéaire se place LIBREMENT autour du membre : on la fait glisser le long
   du membre (niveau proximo-distal) et tout autour de sa circonférence (rosace ou
   curseur de rotation). L'image échographique est calculée dans le repère de la sonde,
   donc elle tourne avec elle — comme en consultation.

   L'aiguille arrive TOUJOURS par le côté de la sonde, au ras du bord latéral choisi
   (technique « dans le plan »), avec une angulation réglable ; on peut aussi viser
   directement en pointant dans l'image. Profondeur, gain et calque de repérage sont
   réglables. Aucune valeur clinique : anatomie réelle, gestes non validés. */

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Muscle } from "@/components/preconia/toxine/toxineCatalog";
import { nodeShort } from "@/components/preconia/toxine/toxineCatalog";
import type { useLimbSlicer } from "@/components/preconia/toxine/limbSlicer";
import { ProbeDial } from "@/components/preconia/toxine/ProbeDial";
import { UsScreen, type BolusView } from "@/components/preconia/toxine/UsScreen";
import {
  M2MM,
  boneStop,
  clamp,
  inTarget,
  limbSection,
  nearestRisk,
  needleEchogenicity,
  needlePlan,
  pathStructures,
  probeFrame,
  skinDepthAt,
  toProbe,
  toWorld,
  aimAt,
  type Pt,
} from "@/components/preconia/toxine/probeGeom";

const ToxineScene = dynamic(() => import("@/components/preconia/toxine/ToxineScene"), { ssr: false });

type Slicer = ReturnType<typeof useLimbSlicer>;

const FOOT = 0.038; // semelle de la barrette linéaire (38 mm)
const NEEDLE_LEN = 0.05; // aiguille de 50 mm
const A_MIN = (10 * Math.PI) / 180;
const A_MAX = (80 * Math.PI) / 180;
const DEG = 180 / Math.PI;
const FACES: [string, number][] = [
  ["Antérieure", 0],
  ["Médiale", 90],
  ["Postérieure", 180],
  ["Latérale", 270],
];
const angDist = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
/** face du membre la plus proche de l'angle de sonde (membre supérieur droit). */
const faceLabel = (deg: number) =>
  FACES.reduce((best, f) => (angDist(deg, f[1]) < angDist(deg, best[1]) ? f : best))[0];

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  ends,
  onChange,
  accent = "#7A1E38",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  ends?: [string, string];
  onChange: (v: number) => void;
  accent?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-[11.5px] font-semibold text-[#4A1024]">
        {label}
        <span className="font-mono text-[11px] font-bold text-[#7A1E38]">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="mt-0.5 w-full"
        style={{ accentColor: accent }}
      />
      {ends && (
        <span className="flex justify-between text-[9.5px] text-ink-soft">
          <span>{ends[0]}</span>
          <span>{ends[1]}</span>
        </span>
      )}
    </label>
  );
}

export function ToxineSimulator({ muscle, slicer, onClose }: { muscle: Muscle; slicer: Slicer; onClose: () => void }) {
  const [sweep, setSweep] = useState(0.5);
  const [thetaDeg, setThetaDeg] = useState(0);
  const [side, setSide] = useState<-1 | 1>(1);
  const [angleDeg, setAngleDeg] = useState(30);
  const [insertedMm, setInsertedMm] = useState(0);
  const [depthCm, setDepthCm] = useState(4);
  const [gain, setGain] = useState(58);
  const [overlay, setOverlay] = useState(true);
  const [boluses, setBoluses] = useState<{ id: number; p: Pt; z: number }[]>([]);
  const bolusId = useRef(1);

  const { ready, slice, zExtent } = slicer;
  const hiSet = useMemo(() => new Set(muscle.nodes), [muscle]);

  const [zlo, zhi] = useMemo(() => (ready ? zExtent(muscle.nodes) : [0, 1]), [ready, zExtent, muscle]);
  const z = zlo + sweep * (zhi - zlo);
  const polys = useMemo(() => (ready ? slice(z) : []), [ready, slice, z]);
  const section = useMemo(() => (polys.length ? limbSection(polys, hiSet) : null), [polys, hiSet]);

  const theta = (thetaDeg * Math.PI) / 180;
  const frame = useMemo(() => (section ? probeFrame(section, theta, FOOT) : null), [section, theta]);
  const skinProbe = useMemo(
    () => (section && frame ? section.skin.map((q) => toProbe(frame, q)) : []),
    [section, frame],
  );

  const angle = (angleDeg * Math.PI) / 180;
  // l'aiguille bute sur la corticale : la course utile s'arrête à l'os rencontré
  const stop = useMemo(() => {
    if (!section || !frame) return Infinity;
    return boneStop(section.polys, frame, needlePlan(frame, skinProbe, side, angle, NEEDLE_LEN));
  }, [section, frame, skinProbe, side, angle]);
  const inserted = Math.min(insertedMm / M2MM, stop);
  const blocked = insertedMm / M2MM > stop + 1e-9;
  const plan = useMemo(
    () => (frame ? needlePlan(frame, skinProbe, side, angle, inserted) : null),
    [frame, skinProbe, side, angle, inserted],
  );

  const tipWorld = frame && plan ? toWorld(frame, plan.tip) : null;
  const onTarget = !!(section && tipWorld && inserted > 0 && inTarget(section.polys, hiSet, tipWorld));
  const hits = useMemo(
    () => (section && frame && plan ? pathStructures(section.polys, frame, plan) : []),
    [section, frame, plan],
  );
  const risk = section && tipWorld && inserted > 0 ? nearestRisk(section.polys, tipWorld) : null;
  const tipDepth = plan ? Math.max(0, plan.tip[1] - skinDepthAt(skinProbe, plan.tip[0])) : 0;
  const targetHit = hits.find((h) => hiSet.has(h.node));
  const echo = needleEchogenicity(angle);
  const depth = depthCm / 100;

  // alerte : trajet traversant un nerf ou un vaisseau, ou pointe à leur contact
  const crossed = hits.filter((h) => h.role === "nerve" || h.role === "artery" || h.role === "vein");
  const hazard = crossed.length
    ? `trajet à travers ${crossed.map((h) => nodeShort(h.node)).join(", ")}`
    : risk && risk.d < 0.002
      ? `pointe au contact de ${nodeShort(risk.node)}`
      : null;

  const bolusViews = useMemo<BolusView[]>(() => {
    if (!frame) return [];
    return boluses
      .map((b) => {
        const q = toProbe(frame, b.p);
        return { id: b.id, u: q[0], v: q[1], spread: clamp(1 - Math.abs(b.z - z) / 0.012, 0, 1) };
      })
      .filter((b) => b.spread > 0);
  }, [boluses, frame, z]);

  const probe3d = frame
    ? {
        o: [frame.o[0], frame.o[1], z] as [number, number, number],
        u: [frame.u[0], frame.u[1], 0] as [number, number, number],
        n: [frame.n[0], frame.n[1], 0] as [number, number, number],
        foot: FOOT,
        depth,
      }
    : undefined;
  const needle3d =
    frame && plan
      ? {
          entry: [...toWorld(frame, plan.entry), z] as [number, number, number],
          dir: [
            plan.dir[0] * frame.u[0] - plan.dir[1] * frame.n[0],
            plan.dir[0] * frame.u[1] - plan.dir[1] * frame.n[1],
            0,
          ] as [number, number, number],
          inserted,
          length: NEEDLE_LEN,
          inTarget: onTarget,
        }
      : undefined;

  const inject = () => {
    if (!tipWorld) return;
    setBoluses((b) => [...b.slice(-11), { id: bolusId.current++, p: tipWorld, z }]);
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  const content = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#f4e3e9]">
      <div className="tx-band-hero flex items-center justify-between gap-4 px-5 py-2.5">
        <div>
          <h2 className="text-[15px] font-semibold text-white">Simulation d&apos;injection écho-guidée</h2>
          <p className="text-[11px] text-white/85">
            {muscle.label} · {muscle.region} — membre supérieur droit, prototype sans valeur clinique
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/15 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/25"
        >
          Quitter ✕
        </button>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* ------------------------------------------------ modèle 3D + rosace */}
        <div className="relative min-h-[320px] border-r border-[#a83e5a]/20 bg-[radial-gradient(120%_120%_at_50%_15%,#fff,#f4e3e9_70%,#eccdd6)]">
          <ToxineScene
            highlight={muscle.nodes}
            level={sweep}
            belly={[zlo, zhi]}
            probe={probe3d}
            needle={needle3d}
            focus={section ? { c: [section.c[0], section.c[1], z], r: section.radius } : undefined}
            initialView="oblique"
          />
          {section && frame && (
            <div className="absolute bottom-3 left-3 w-[168px] rounded-xl border border-[#a83e5a]/25 bg-white/85 p-1.5 shadow-sm backdrop-blur-sm">
              <div className="aspect-square w-full">
                <ProbeDial
                  section={section}
                  frame={frame}
                  depth={depth}
                  highlight={muscle.nodes}
                  needle={plan ?? undefined}
                  onTheta={(t) => setThetaDeg(Math.round(((t * DEG) % 360 + 360) % 360))}
                />
              </div>
              <p className="pb-0.5 text-center text-[9.5px] font-semibold text-[#7A1E38]">
                Faites glisser la sonde autour du membre
              </p>
            </div>
          )}
          <div className="absolute right-2 top-3 bottom-16 z-10 flex flex-col items-center">
            <span className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-[#7A1E38]">Prox.</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(sweep * 100)}
              onChange={(e) => setSweep(Number(e.target.value) / 100)}
              aria-label="Position de la sonde le long du membre"
              className="tx-elevator flex-1"
              style={{ writingMode: "vertical-lr", direction: "rtl", accentColor: "#7A1E38" }}
            />
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-[#7A1E38]">Dist.</span>
          </div>
          <p className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[10px] text-[#a83e5a]">
            Glisser pour pivoter le modèle · molette pour zoomer · ascenseur = niveau sur le membre
          </p>
        </div>

        {/* ------------------------------------------------------- échographe */}
        <div className="flex min-h-[280px] items-center justify-center bg-[#07090c] p-2">
          <div className="flex h-full w-full items-center justify-center">
            {section && frame ? (
              <UsScreen
                polys={section.polys}
                section={section}
                frame={frame}
                depth={depth}
                gain={gain}
                overlay={overlay}
                highlight={muscle.nodes}
                needle={plan ?? undefined}
                boluses={bolusViews}
                onAim={(u, v) => {
                  if (!plan) return;
                  const a = aimAt(plan, [u, v], NEEDLE_LEN, A_MIN, A_MAX);
                  setAngleDeg(Math.round(a.angle * DEG));
                  setInsertedMm(Math.round(a.inserted * M2MM));
                }}
              />
            ) : (
              <p className="text-[13px] text-[#6f96a5]">
                {ready ? "Aucune coupe à ce niveau — déplacez la sonde." : "Préparation de l'échographie…"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ pupitre */}
      <div className="max-h-[42vh] shrink-0 overflow-y-auto border-t border-[#a83e5a]/25 bg-[#fdf7f9] px-3 py-2">
        <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            {/* sonde */}
            <div className="rounded-xl border border-[#a83e5a]/20 bg-white/70 px-3 py-2">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#a83e5a]">Sonde</p>
              <Slider
                label="Rotation autour du membre"
                value={thetaDeg}
                min={0}
                max={359}
                unit="°"
                onChange={setThetaDeg}
              />
              <div className="mt-1 grid grid-cols-4 gap-1">
                {FACES.map(([label, deg]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setThetaDeg(deg)}
                    className={`rounded-md border px-1 py-1 text-[10.5px] font-semibold transition-colors ${
                      thetaDeg === deg
                        ? "border-[#7A1E38] bg-[#7A1E38] text-white"
                        : "border-[#7A1E38]/25 bg-white/70 text-[#7A1E38] hover:bg-[#f7e3ea]"
                    }`}
                  >
                    {label.slice(0, 4)}.
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-ink-soft">
                Face abordée : <b className="text-[#7A1E38]">{faceLabel(thetaDeg).toLowerCase()}</b>
              </p>
            </div>

            {/* aiguille */}
            <div className="rounded-xl border border-[#a83e5a]/20 bg-white/70 px-3 py-2">
              <p className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-[#a83e5a]">
                Aiguille — abord dans le plan
                <span className="font-normal normal-case tracking-normal text-ink-soft">27 G · 50 mm</span>
              </p>
              <div className="mb-1.5 flex overflow-hidden rounded-lg border border-[#7A1E38]/30">
                {([-1, 1] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSide(s)}
                    className={`flex-1 px-2 py-1 text-[11px] font-semibold ${
                      side === s ? "bg-[#7A1E38] text-white" : "text-[#7A1E38] hover:bg-[#f7e3ea]"
                    }`}
                  >
                    {s === -1 ? "◀ Bord gauche" : "Bord droit ▶"}
                  </button>
                ))}
              </div>
              <Slider label="Angulation / peau" value={angleDeg} min={10} max={80} unit="°" onChange={setAngleDeg} ends={["Rasante", "Perpendiculaire"]} />
              <Slider
                label="Introduction"
                value={insertedMm}
                min={0}
                max={NEEDLE_LEN * M2MM}
                unit=" mm"
                onChange={setInsertedMm}
                accent={onTarget ? "#15803d" : "#7A1E38"}
                ends={["Peau", "50 mm"]}
              />
            </div>

            {/* appareil */}
            <div className="rounded-xl border border-[#a83e5a]/20 bg-white/70 px-3 py-2">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#a83e5a]">Échographe</p>
              <Slider label="Profondeur" value={depthCm} min={2} max={7} step={0.5} unit=" cm" onChange={setDepthCm} />
              <Slider label="Gain" value={gain} min={20} max={95} onChange={setGain} />
              <label className="mt-1 flex items-center gap-2 text-[11.5px] font-semibold text-[#4A1024]">
                <input
                  type="checkbox"
                  checked={overlay}
                  onChange={(e) => setOverlay(e.target.checked)}
                  style={{ accentColor: "#7A1E38" }}
                />
                Calque de repérage (couleurs et noms)
              </label>
            </div>

            {/* lecture du geste */}
            <div className="rounded-xl border border-[#a83e5a]/20 bg-white/70 px-3 py-2">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#a83e5a]">Contrôle du geste</p>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                <dt className="text-ink-soft">Pointe (profondeur)</dt>
                <dd className="text-right font-mono font-semibold text-[#4A1024]">{(tipDepth * M2MM).toFixed(1)} mm</dd>
                <dt className="text-ink-soft">Cible atteinte à</dt>
                <dd className="text-right font-mono font-semibold text-[#4A1024]">
                  {targetHit ? `${(targetHit.from * M2MM).toFixed(0)} mm` : "—"}
                </dd>
                <dt className="text-ink-soft">Visibilité de l&apos;aiguille</dt>
                <dd className={`text-right font-semibold ${echo > 0.6 ? "text-green-700" : echo > 0.32 ? "text-[#b06a12]" : "text-[#a83e5a]"}`}>
                  {echo > 0.6 ? "bonne" : echo > 0.32 ? "moyenne" : "faible"}
                </dd>
                <dt className="text-ink-soft">Structure la plus proche</dt>
                <dd className="text-right font-semibold text-[#4A1024]">
                  {risk ? `${nodeShort(risk.node)} · ${(risk.d * M2MM).toFixed(0)} mm` : "—"}
                </dd>
                {blocked && (
                  <>
                    <dt className="text-ink-soft">Butée</dt>
                    <dd className="text-right font-semibold text-[#b3261e]">
                      contact osseux à {(stop * M2MM).toFixed(0)} mm
                    </dd>
                  </>
                )}
              </dl>
              <p className="mt-1.5 text-[11px] leading-snug">
                <span className="text-ink-soft">Trajet : </span>
                {hits.length ? (
                  hits.map((h, i) => (
                    <span key={h.node}>
                      {i > 0 && <span className="text-ink-soft"> › </span>}
                      <span
                        className={
                          hiSet.has(h.node)
                            ? "font-bold text-[#7A1E38]"
                            : h.role === "artery" || h.role === "vein" || h.role === "nerve"
                              ? "font-semibold text-[#b3261e]"
                              : "text-[#4A1024]"
                        }
                      >
                        {nodeShort(h.node)}
                      </span>
                    </span>
                  ))
                ) : (
                  <span className="text-ink-soft">aiguille non introduite</span>
                )}
              </p>
              {hazard && (
                <p className="mt-1 rounded-md bg-[#fdecea] px-2 py-1 text-[11px] font-bold leading-snug text-[#b3261e]">
                  ⚠ {hazard}
                </p>
              )}
              <p className={`mt-1 text-[11px] font-semibold ${onTarget ? "text-green-700" : "text-[#a83e5a]"}`}>
                {inserted <= 0
                  ? "Aiguille au contact de la peau"
                  : onTarget
                    ? "Pointe dans le muscle cible ✓"
                    : "Pointe hors cible"}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={inject}
                  disabled={!onTarget}
                  className="tx-btn shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-40"
                >
                  Injecter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInsertedMm(0);
                    setBoluses([]);
                  }}
                  className="shrink-0 whitespace-nowrap rounded-lg border border-[#7A1E38]/30 px-3 py-1.5 text-[12px] font-semibold text-[#7A1E38] transition-colors hover:bg-[#f7e3ea]"
                >
                  Retirer / effacer
                </button>
              </div>
          </div>
        </div>

        <p className="mt-1.5 text-[10px] leading-relaxed text-[#a83e5a]">
          Prototype de démonstration — anatomie réelle (Open3D, CC BY-SA 4.0), image de synthèse.
          Les repères, angles, profondeurs et doses ne sont pas cliniquement validés : à ne pas
          utiliser pour un geste. Pointez dans l&apos;image pour viser directement.
        </p>
      </div>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}

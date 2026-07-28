"use client";

/* Simulateur d'injection écho-guidée (plein écran, PROTOTYPE). Flux :
   1) on balaie la sonde le long du membre → la coupe (petit-axe) suit la sonde ;
   2) on valide la position, on règle l'angulation de l'aiguille (par rapport à la sonde) ;
   3) on introduit progressivement l'aiguille → son trajet apparaît dans le plan de la
   sonde. Vue « dans le plan » (in-plane). Aucune valeur clinique (repères non validés). */

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Muscle } from "@/components/preconia/toxine/toxineCatalog";
import type { useLimbSlicer, SlicePolygon, Bbox2D } from "@/components/preconia/toxine/limbSlicer";
import { UsView, type NeedleView } from "@/components/preconia/toxine/UsView";

const ToxineScene = dynamic(() => import("@/components/preconia/toxine/ToxineScene"), { ssr: false });

type Slicer = ReturnType<typeof useLimbSlicer>;

function pointInLoop(x: number, y: number, loop: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const [xi, yi] = loop[i], [xj, yj] = loop[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function ToxineSimulator({ muscle, slicer, onClose }: { muscle: Muscle; slicer: Slicer; onClose: () => void }) {
  const [sweep, setSweep] = useState(0.5);
  const [placed, setPlaced] = useState(false);
  const [side, setSide] = useState<-1 | 1>(1);
  const [angle, setAngle] = useState(30);
  const [needleOn, setNeedleOn] = useState(false);
  const [insertion, setInsertion] = useState(0);

  const [zlo, zhi] = slicer.ready ? slicer.zExtent(muscle.nodes) : [0, 1];
  const sweepZ = zlo + sweep * (zhi - zlo);
  const polys = useMemo<SlicePolygon[]>(() => (slicer.ready ? slicer.slice(sweepZ) : []), [slicer, sweepZ]);

  const hiSet = useMemo(() => new Set(muscle.nodes), [muscle]);
  const sel = polys.filter((p) => hiSet.has(p.node));
  const cx = sel.length ? sel.reduce((s, p) => s + p.cx, 0) / sel.length : 0;
  const cy = sel.length ? sel.reduce((s, p) => s + p.cy, 0) / sel.length : 0;

  const frame = useMemo<Bbox2D>(() => {
    const near = polys.filter((p) => Math.hypot(p.cx - cx, p.cy - cy) < 0.06);
    const bb = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
    for (const p of near) for (const lp of p.loops) for (const pt of lp) {
      bb.minx = Math.min(bb.minx, pt[0]); bb.maxx = Math.max(bb.maxx, pt[0]);
      bb.miny = Math.min(bb.miny, pt[1]); bb.maxy = Math.max(bb.maxy, pt[1]);
    }
    if (!isFinite(bb.minx)) return { minx: cx - 0.05, maxx: cx + 0.05, miny: cy - 0.05, maxy: cy + 0.05 };
    const px = (bb.maxx - bb.minx) * 0.08, py = (bb.maxy - bb.miny) * 0.08;
    return { minx: bb.minx - px, maxx: bb.maxx + px, miny: bb.miny - py, maxy: bb.maxy + py };
  }, [polys, cx, cy]);

  // aiguille (repère brut de la coupe) : surface = miny (haut), profondeur vers +y
  const width = frame.maxx - frame.minx;
  const th = (angle * Math.PI) / 180;
  const entry: [number, number] = [cx + side * width * 0.42, frame.miny];
  const dir: [number, number] = [-side * Math.cos(th), Math.sin(th)];
  const maxLen = 1.5 * Math.max(width, frame.maxy - frame.miny);
  const tip: [number, number] = [entry[0] + insertion * maxLen * dir[0], entry[1] + insertion * maxLen * dir[1]];
  const inTarget = sel.some((p) => p.loops.some((lp) => pointInLoop(tip[0], tip[1], lp)));
  const needle: NeedleView | undefined = needleOn ? { e: entry, t: tip, inTarget } : undefined;

  const probe = slicer.ready && sel.length ? { cx, y: frame.miny, z: sweepZ, width } : undefined;

  const reset = () => { setPlaced(false); setNeedleOn(false); setInsertion(0); };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const content = (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#f4e3e9]">
      <div className="tx-band-hero flex items-center justify-between px-5 py-3">
        <div>
          <h2 className="text-[15px] font-semibold text-white">Simulation d&apos;injection écho-guidée</h2>
          <p className="text-[11px] text-white/85">{muscle.label} · {muscle.region} — prototype, sans valeur clinique</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg bg-white/15 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/25">
          Quitter ✕
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1fr_1fr]">
        {/* modèle 3D + sonde */}
        <div className="relative min-h-0 border-r border-[#a83e5a]/20 bg-[radial-gradient(120%_120%_at_50%_15%,#fff,#f4e3e9_70%,#eccdd6)]">
          <ToxineScene highlight={muscle.nodes} level={sweep} belly={[zlo, zhi]} probe={probe} />
          <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[11px] text-[#a83e5a]">
            La sonde (barre rose) balaie le membre — le plan rose est le champ échographié.
          </p>
        </div>

        {/* écran d'échographie + commandes */}
        <div className="flex min-h-0 flex-col overflow-y-auto p-4">
          <div className="flex flex-1 items-center justify-center">
            {slicer.ready ? (
              <UsView polys={polys} bbox={frame} highlight={muscle.nodes} needle={needle} />
            ) : (
              <div className="text-[13px] text-ink-soft">Préparation de l&apos;échographie…</div>
            )}
          </div>

          <div className="mt-3 space-y-4">
            {/* étape 1 : balayage de la sonde */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-[#4A1024]">1. Balayage de la sonde</span>
                {!placed && (
                  <button type="button" onClick={() => setPlaced(true)} className="tx-btn rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white">
                    Valider la position ✓
                  </button>
                )}
                {placed && <span className="text-[11px] font-semibold text-[#7A1E38]">Position validée · <button type="button" onClick={reset} className="underline">rebalayer</button></span>}
              </div>
              <input type="range" min={0} max={100} value={Math.round(sweep * 100)} disabled={placed}
                onChange={(e) => setSweep(Number(e.target.value) / 100)}
                aria-label="Balayage proximo-distal de la sonde"
                className="w-full disabled:opacity-40" style={{ accentColor: "#7A1E38" }} />
              <div className="flex justify-between text-[10px] text-ink-soft"><span>Distal</span><span>Proximal</span></div>
            </div>

            {/* étape 2 : aiguille */}
            <div className={placed ? "" : "pointer-events-none opacity-40"}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-[#4A1024]">2. Aiguille — abord &amp; angulation</span>
                {placed && !needleOn && (
                  <button type="button" onClick={() => setNeedleOn(true)} className="tx-btn rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white">
                    Introduire l&apos;aiguille →
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex overflow-hidden rounded-lg border border-[#7A1E38]/30">
                  <button type="button" onClick={() => setSide(-1)} className={`px-3 py-1.5 text-[12px] font-semibold ${side === -1 ? "bg-[#7A1E38] text-white" : "text-[#7A1E38]"}`}>◀ Gauche</button>
                  <button type="button" onClick={() => setSide(1)} className={`px-3 py-1.5 text-[12px] font-semibold ${side === 1 ? "bg-[#7A1E38] text-white" : "text-[#7A1E38]"}`}>Droite ▶</button>
                </div>
                <label className="flex flex-1 items-center gap-2 text-[12px] text-ink-soft">
                  Angulation
                  <input type="range" min={10} max={75} value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="flex-1" style={{ accentColor: "#7A1E38" }} />
                  <span className="w-9 font-mono text-[12px] font-semibold text-[#7A1E38]">{angle}°</span>
                </label>
              </div>
            </div>

            {/* étape 3 : introduction */}
            <div className={needleOn ? "" : "pointer-events-none opacity-40"}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-[#4A1024]">3. Introduction de l&apos;aiguille</span>
                {needleOn && (
                  <span className={`text-[11px] font-semibold ${inTarget ? "text-green-700" : "text-[#a83e5a]"}`}>
                    {inTarget ? "Pointe dans le muscle cible ✓" : "Pointe hors cible"}
                  </span>
                )}
              </div>
              <input type="range" min={0} max={100} value={Math.round(insertion * 100)}
                onChange={(e) => setInsertion(Number(e.target.value) / 100)}
                aria-label="Progression de l'aiguille" className="w-full" style={{ accentColor: inTarget ? "#15803d" : "#7A1E38" }} />
              <div className="flex justify-between text-[10px] text-ink-soft"><span>Peau</span><span>Profond</span></div>
            </div>

            <p className="text-[10.5px] leading-relaxed text-[#a83e5a]">
              Prototype de démonstration — vue petit-axe, aiguille dans le plan. Les repères, angles
              et profondeurs ne sont pas cliniquement validés.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}

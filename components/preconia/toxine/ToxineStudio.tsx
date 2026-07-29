"use client";

/* Studio Toxine — atlas d'injection du membre supérieur (PROTOTYPE). Recherche d'un
   muscle (catalogue Open3D), vue 3D avec muscle mis en évidence + panneau d'orientation,
   ascenseur calé sur le ventre du muscle sélectionné pilotant une coupe axiale temps
   réel (plan visible sur le modèle, noms des muscles à lignes de rappel). Les sites
   d'injection ne sont pas encore renseignés — aucune valeur clinique. */

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import type { PresetView, ToxineController } from "@/components/preconia/toxine/ToxineScene";
import { AxialSlice } from "@/components/preconia/toxine/AxialSlice";
import { ToxineSimulator } from "@/components/preconia/toxine/ToxineSimulator";
import { useLimbSlicer } from "@/components/preconia/toxine/limbSlicer";
import { defaultMuscle, searchCatalog, type Muscle } from "@/components/preconia/toxine/toxineCatalog";

const ToxineScene = dynamic(() => import("@/components/preconia/toxine/ToxineScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-[13px] text-ink-soft">
      Chargement du modèle 3D…
    </div>
  ),
});

const VIEWS: { id: PresetView; label: string; title: string }[] = [
  { id: "anterior", label: "Antérieur", title: "Face antérieure" },
  { id: "posterior", label: "Postérieur", title: "Face postérieure" },
  { id: "medial", label: "Médial", title: "Du dedans vers le dehors" },
  { id: "lateral", label: "Latéral", title: "Du dehors vers le dedans" },
  { id: "proximal", label: "Haut", title: "Vue du haut (proximal)" },
  { id: "distal", label: "Bas", title: "Vue du bas (distal)" },
];

function ViewControls({ ctrl }: { ctrl: React.RefObject<ToxineController | null> }) {
  const arrow =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-[#7A1E38]/25 bg-white/70 text-[15px] text-[#7A1E38] transition-colors hover:border-[#C86B85] hover:bg-[#f7e3ea] active:bg-[#efd0da]";
  const A = ({ label, aria, on }: { label: string; aria: string; on: () => void }) => (
    <button type="button" aria-label={aria} onClick={on} className={arrow}>
      {label}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line-soft px-4 py-3">
      <div className="grid grid-cols-3 grid-rows-3 gap-1">
        <span />
        <A label="↑" aria="Basculer vers le haut" on={() => ctrl.current?.nudge("x", -1)} />
        <span />
        <A label="←" aria="Tourner à gauche" on={() => ctrl.current?.nudge("y", -1)} />
        <button
          type="button"
          aria-label="Recentrer (vue antérieure)"
          onClick={() => ctrl.current?.preset("anterior")}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#7A1E38]/25 bg-white/70 text-[13px] text-[#7A1E38] transition-colors hover:border-[#C86B85] hover:bg-[#f7e3ea]"
        >
          ⌂
        </button>
        <A label="→" aria="Tourner à droite" on={() => ctrl.current?.nudge("y", 1)} />
        <span />
        <A label="↓" aria="Basculer vers le bas" on={() => ctrl.current?.nudge("x", 1)} />
        <span />
      </div>
      <div className="grid flex-1 grid-cols-3 gap-1.5">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            title={v.title}
            onClick={() => ctrl.current?.preset(v.id)}
            className="rounded-lg border border-[#7A1E38]/25 bg-white/70 px-2 py-1.5 text-[12px] font-semibold text-[#7A1E38] transition-colors hover:border-[#C86B85] hover:bg-[#f7e3ea]"
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ToxineStudio() {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<Muscle>(() => defaultMuscle());
  const [level, setLevel] = useState(0.5);
  const [sim, setSim] = useState(false);
  const ctrl = useRef<ToxineController | null>(null);
  const slicer = useLimbSlicer();
  const results = useMemo(() => searchCatalog(q), [q]);
  const showResults = q.trim().length >= 2 && results.length > 0 && results[0].id !== muscle.id;

  // ventre du muscle : portion centrale (70 %) de son étendue proximo-distale
  const belly = useMemo<[number, number]>(() => {
    const [lo, hi] = slicer.zExtent(muscle.nodes);
    const c = (lo + hi) / 2, half = (hi - lo) * 0.35;
    return [c - half, c + half];
  }, [slicer, muscle]);
  const z = belly[0] + level * (belly[1] - belly[0]);
  const polys = useMemo(() => (slicer.ready ? slicer.slice(z) : []), [slicer, z]);
  // cadre : section LOCALE du membre autour du muscle (au milieu du ventre) — on groupe
  // les structures proches du muscle sélectionné pour ignorer un fragment lointain.
  const frame = useMemo(() => {
    if (!slicer.ready) return { minx: -1, miny: -1, maxx: 1, maxy: 1 };
    const ps = slicer.slice((belly[0] + belly[1]) / 2);
    const hiSet = new Set(muscle.nodes);
    const selPts = ps.filter((p) => hiSet.has(p.node));
    const cx = selPts.length ? selPts.reduce((s, p) => s + p.cx, 0) / selPts.length : 0;
    const cy = selPts.length ? selPts.reduce((s, p) => s + p.cy, 0) / selPts.length : 0;
    const R = 0.06; // ~ rayon d'une section de membre
    const near = ps.filter((p) => Math.hypot(p.cx - cx, p.cy - cy) < R);
    const bb = { minx: Infinity, miny: Infinity, maxx: -Infinity, maxy: -Infinity };
    for (const p of near)
      for (const lp of p.loops)
        for (const pt of lp) {
          bb.minx = Math.min(bb.minx, pt[0]);
          bb.maxx = Math.max(bb.maxx, pt[0]);
          bb.miny = Math.min(bb.miny, pt[1]);
          bb.maxy = Math.max(bb.maxy, pt[1]);
        }
    if (!isFinite(bb.minx)) return { minx: cx - R, maxx: cx + R, miny: cy - R, maxy: cy + R };
    const px = (bb.maxx - bb.minx) * 0.08 + 1e-4, py = (bb.maxy - bb.miny) * 0.08 + 1e-4;
    return { minx: bb.minx - px, maxx: bb.maxx + px, miny: bb.miny - py, maxy: bb.maxy + py };
  }, [slicer, muscle, belly]);

  const select = (m: Muscle) => {
    setMuscle(m);
    setLevel(0.5);
    setQ("");
  };

  return (
    <div className="w-full">
      <div className="tx-proto mb-5 flex items-start gap-3 px-4 py-3">
        <span aria-hidden className="mt-0.5 text-[18px]">⚠️</span>
        <p className="text-[12.5px] leading-relaxed text-[#7A1E38]">
          <b>Prototype de démonstration.</b>{" "}L&apos;anatomie 3D est réelle (modèle Open3D). Les
          <b> sites d&apos;injection, profondeurs et doses ne sont pas renseignés</b>{" "}: ils seront
          transcrits d&apos;ouvrages publiés et validés avant tout usage. Aucune valeur clinique en
          l&apos;état.
        </p>
      </div>

      {/* recherche d'un muscle */}
      <div className="relative mx-auto max-w-[560px]">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un muscle du membre supérieur (ex. « biceps », « fds »)…"
          aria-label="Recherche d'un muscle cible"
          className="tx-search px-4 py-3.5 text-[15px] text-ink"
        />
        {showResults && (
          <ul className="tx-panel absolute z-20 mt-1.5 max-h-[280px] w-full overflow-y-auto">
            {results.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => select(m)}
                  className="flex w-full items-baseline justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-[#f7e3ea]"
                >
                  <span className="text-sm font-semibold text-[#4A1024]">{m.label}</span>
                  <span className="font-mono text-[11px] text-[#a83e5a]">{m.region}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={() => setSim(true)}
          disabled={!slicer.ready}
          className="tx-btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-50"
        >
          ▶ Mode simulation écho-guidée
        </button>
      </div>

      {sim && <ToxineSimulator muscle={muscle} slicer={slicer} onClose={() => setSim(false)} />}

      {/* deux grands encarts : modèle 3D et coupe axiale, côte à côte */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.12fr_1fr]">
        <div className="tx-panel overflow-hidden">
          <div className="tx-band-hero flex items-center justify-between px-5 py-3">
            <div>
              <h2 className="text-[15px] font-semibold text-white">{muscle.label}</h2>
              <p className="text-[11px] text-white/85">{muscle.region}</p>
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Prototype
            </span>
          </div>
          <div className="relative h-[620px] w-full bg-[radial-gradient(120%_120%_at_50%_15%,#fff,#f4e3e9_70%,#eccdd6)]">
            <ToxineScene controller={ctrl} highlight={muscle.nodes} level={level} belly={belly} />
            <div className="absolute right-2 top-4 bottom-14 z-10 flex flex-col items-center">
              <span className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-[#7A1E38]">Prox.</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(level * 100)}
                onChange={(e) => setLevel(Number(e.target.value) / 100)}
                aria-label="Niveau de la coupe axiale"
                title="Niveau de la coupe sur le ventre du muscle (haut = proximal, bas = distal)"
                className="tx-elevator flex-1"
                style={{ writingMode: "vertical-lr", direction: "rtl", accentColor: "#7A1E38" }}
              />
              <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-[#7A1E38]">Dist.</span>
            </div>
            <p className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[10.5px] text-[#a83e5a]">
              Faites glisser pour pivoter · molette pour zoomer · ascenseur = niveau de coupe
            </p>
            <p className="pointer-events-none absolute bottom-0 right-2 text-[9px] text-[#a83e5a]/70">
              Modèle : Open3D Project — CC BY-SA 4.0
            </p>
          </div>
          <ViewControls ctrl={ctrl} />
        </div>

        <div className="tx-panel flex flex-col px-5 py-4">
          <h3 className="text-[14px] font-semibold text-[#4A1024]">Coupe axiale — temps réel</h3>
          <p className="mt-0.5 text-[11.5px] text-ink-soft">
            Calculée en direct sur le <b>ventre du muscle sélectionné</b> — déplacez l&apos;ascenseur
            pour changer le niveau.
          </p>
          <div className="mt-3 flex flex-1 items-center justify-center">
            {slicer.ready ? (
              <AxialSlice polys={polys} bbox={frame} highlight={muscle.nodes} />
            ) : (
              <div className="flex h-[320px] items-center justify-center text-[12px] text-ink-soft">
                Préparation de la coupe…
              </div>
            )}
          </div>
          {/* légende des tissus */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line-soft pt-3 text-[11px] text-ink-soft">
            {[
              ["#7A1E38", "Muscle cible"],
              ["#E3B23C", "Nerf"],
              ["#C0392B", "Artère"],
              ["#3B6CA8", "Veine"],
              ["#E9E1CE", "Os"],
              ["#CBBFB4", "Conjonctif"],
            ].map(([c, l]) => (
              <span key={l} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: c }} />
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* écho + fiche muscle, en dessous */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="tx-panel px-4 py-4">
          <h3 className="text-[13px] font-semibold text-[#4A1024]">Échographie</h3>
          <div className="mt-2 flex h-[140px] items-center justify-center rounded-xl border border-dashed border-[#a83e5a]/45 bg-[#faf1f4] text-center text-[12px] text-ink-soft">
            À venir — images acquises en consultation
          </div>
        </div>
        <div className="tx-panel px-4 py-4">
          <h3 className="text-[13px] font-semibold text-[#4A1024]">{muscle.label}</h3>
          <p className="mt-1 text-[12px] text-ink-soft">
            <span className="font-semibold text-[#7A1E38]">Région :</span> {muscle.region}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-soft">
            <span className="font-semibold text-[#7A1E38]">Nom (modèle) :</span> {muscle.english}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-[#a83e5a]">
            Sites d&apos;injection, profondeurs et doses : à renseigner (prototype).
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

/* Studio Toxine (PROTOTYPE) : barre de recherche d'un muscle, vue 3D (chargée à la
   volée, hors SSR), coupe axiale schématique et emplacement échographie. Toutes les
   données d'injection affichées sont FICTIVES (démonstration) — bandeau d'avertissement
   permanent. */

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { TOXINE_MUSCLES, searchMuscles, type ToxineMuscle } from "@/data/toxineMuscles";
import type { PresetView, ToxineController } from "@/components/preconia/toxine/ToxineScene";
import { AxialSlice } from "@/components/preconia/toxine/AxialSlice";
import { useForearmSlicer } from "@/components/preconia/toxine/forearmSlicer";

const ToxineScene = dynamic(() => import("@/components/preconia/toxine/ToxineScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-[13px] text-ink-soft">
      Chargement du modèle 3D…
    </div>
  ),
});

const LIMB_LABEL = { superieur: "Membre supérieur", inferieur: "Membre inférieur" } as const;

const VIEWS: { id: PresetView; label: string; title: string }[] = [
  { id: "anterior", label: "Antérieur", title: "Face antérieure (fléchisseurs)" },
  { id: "posterior", label: "Postérieur", title: "Face postérieure (extenseurs)" },
  { id: "medial", label: "Médial", title: "Du dedans vers le dehors" },
  { id: "lateral", label: "Latéral", title: "Du dehors vers le dedans" },
  { id: "proximal", label: "Haut", title: "Vue du haut (proximal)" },
  { id: "distal", label: "Bas", title: "Vue du bas (distal)" },
];

/** Panneau de contrôle de l'orientation du modèle : flèches (rotation pas à pas) et
    vues préréglées. Pilote la scène via la référence `controller`. */
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
      {/* pavé de flèches */}
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
      {/* vues préréglées */}
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
  const [muscle, setMuscle] = useState<ToxineMuscle>(TOXINE_MUSCLES[0]);
  const [level, setLevel] = useState(0.5);
  const ctrl = useRef<ToxineController | null>(null);
  const slicer = useForearmSlicer();
  const polys = useMemo(
    () => (slicer.ready ? slicer.slice(level) : []),
    [slicer.ready, slicer.slice, level],
  );
  const results = useMemo(() => searchMuscles(q), [q]);
  const showResults = q.trim().length >= 2 && results.length > 0 && results[0].id !== muscle.id;

  return (
    <div className="w-full">
      {/* avertissement prototype permanent */}
      <div className="tx-proto mb-5 flex items-start gap-3 px-4 py-3">
        <span aria-hidden className="mt-0.5 text-[18px]">⚠️</span>
        <p className="text-[12.5px] leading-relaxed text-[#7A1E38]">
          <b>Prototype de démonstration.</b>{" "}L&apos;anatomie 3D est réelle (BodyParts3D). En
          revanche, les <b>sites d&apos;injection, profondeurs et doses ne sont pas encore
          renseignés</b>{" "}: ils seront transcrits d&apos;ouvrages publiés et validés avant tout
          usage. Aucune valeur clinique en l&apos;état.
        </p>
      </div>

      {/* recherche d'un muscle */}
      <div className="relative mx-auto max-w-[560px]">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un muscle (ex. « fléchisseur superficiel des doigts »)…"
          aria-label="Recherche d'un muscle cible"
          className="tx-search px-4 py-3.5 text-[15px] text-ink"
        />
        {showResults && (
          <ul className="tx-panel absolute z-20 mt-1.5 w-full overflow-hidden">
            {results.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    setMuscle(m);
                    setQ("");
                  }}
                  className="flex w-full items-baseline gap-2 px-4 py-2.5 text-left transition-colors hover:bg-[#f7e3ea]"
                >
                  <span className="text-sm font-semibold text-[#4A1024]">{m.name}</span>
                  <span className="font-mono text-[11px] text-[#a83e5a]">{m.shortName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* studio : 3D à gauche, coupe axiale + écho + fiche à droite */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="tx-panel overflow-hidden">
          <div className="tx-band-hero flex items-center justify-between px-5 py-3">
            <div>
              <h2 className="text-[15px] font-semibold text-white">{muscle.name}</h2>
              <p className="text-[11px] text-white/85">
                {muscle.shortName} · {LIMB_LABEL[muscle.limb]}
              </p>
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Prototype
            </span>
          </div>
          <div className="relative h-[440px] w-full bg-[radial-gradient(120%_120%_at_50%_15%,#fff,#f4e3e9_70%,#eccdd6)]">
            <ToxineScene muscle={muscle} controller={ctrl} level={level} />
            {/* ascenseur : déplace le plan de coupe le long du modèle (haut = proximal) */}
            <div className="absolute right-2 top-4 bottom-14 z-10 flex flex-col items-center">
              <span className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-[#7A1E38]">Prox.</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(level * 100)}
                onChange={(e) => setLevel(Number(e.target.value) / 100)}
                aria-label="Niveau de la coupe axiale"
                title="Niveau de la coupe (haut = proximal, bas = distal)"
                className="tx-elevator flex-1"
                style={{ writingMode: "vertical-lr", direction: "rtl", accentColor: "#7A1E38" }}
              />
              <span className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-[#7A1E38]">Dist.</span>
            </div>
            <p className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[10.5px] text-[#a83e5a]">
              Faites glisser pour pivoter · molette pour zoomer · ascenseur = niveau de coupe
            </p>
            <p className="pointer-events-none absolute bottom-0 right-2 text-[9px] text-[#a83e5a]/70">
              Modèle : BodyParts3D © DBCLS — CC BY-SA 2.1 JP
            </p>
          </div>
          <ViewControls ctrl={ctrl} />
        </div>

        <div className="flex flex-col gap-5">
          <div className="tx-panel px-4 py-4">
            <h3 className="text-[13px] font-semibold text-[#4A1024]">Coupe axiale — temps réel</h3>
            <p className="mt-0.5 text-[11px] text-ink-soft">
              Calculée en direct depuis le modèle 3D, sur le <b>tiers moyen</b> (ventres
              musculaires injectables) — déplacez l&apos;ascenseur pour changer le niveau.
            </p>
            <div className="mt-3">
              {slicer.ready && slicer.bbox ? (
                <AxialSlice polys={polys} bbox={slicer.bbox} />
              ) : (
                <div className="flex h-[220px] items-center justify-center text-[12px] text-ink-soft">
                  Préparation de la coupe…
                </div>
              )}
            </div>
          </div>

          <div className="tx-panel px-4 py-4">
            <h3 className="text-[13px] font-semibold text-[#4A1024]">Échographie</h3>
            <div className="mt-2 flex h-[130px] items-center justify-center rounded-xl border border-dashed border-[#a83e5a]/45 bg-[#faf1f4] text-center text-[12px] text-ink-soft">
              À venir — images acquises en consultation
            </div>
          </div>

          <div className="tx-panel px-4 py-4">
            <h3 className="text-[13px] font-semibold text-[#4A1024]">Points d&apos;injection (fictifs)</h3>
            <ul className="mt-2 space-y-2">
              {muscle.injectionPoints.map((ip) => (
                <li key={ip.id} className="flex items-start gap-2.5 text-[12.5px]">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#C86B85] text-[9px] font-bold text-white">
                    ✚
                  </span>
                  <span className="text-ink-soft">
                    {ip.label}
                    <span className="block text-[11px] text-ink-soft/70">
                      Profondeur : {ip.depthMm != null ? `${ip.depthMm} mm` : "à documenter"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-[#a83e5a]">
              Action du muscle : {muscle.action}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

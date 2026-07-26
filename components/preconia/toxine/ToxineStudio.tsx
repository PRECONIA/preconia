"use client";

/* Studio Toxine (PROTOTYPE) : barre de recherche d'un muscle, vue 3D (chargée à la
   volée, hors SSR), coupe axiale schématique et emplacement échographie. Toutes les
   données d'injection affichées sont FICTIVES (démonstration) — bandeau d'avertissement
   permanent. */

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { TOXINE_MUSCLES, searchMuscles, type ToxineMuscle } from "@/data/toxineMuscles";

const ToxineScene = dynamic(() => import("@/components/preconia/toxine/ToxineScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-[13px] text-ink-soft">
      Chargement du modèle 3D…
    </div>
  ),
});

const LIMB_LABEL = { superieur: "Membre supérieur", inferieur: "Membre inférieur" } as const;

/** Coupe axiale schématique de l'avant-bras (démonstration) — os postérieurs, loges
    musculaires, muscle cible en bordeaux avec repère d'aiguille. */
function AxialDiagram() {
  return (
    <svg viewBox="0 0 240 240" className="mx-auto block w-full max-w-[260px]" role="img" aria-label="Coupe axiale schématique">
      <circle cx="120" cy="120" r="96" fill="#f7e3ea" stroke="#a83e5a" strokeOpacity="0.5" strokeWidth="2" />
      {/* os : radius / ulna (postérieurs) */}
      <circle cx="96" cy="150" r="20" fill="#e9e1ce" stroke="#c8b48a" strokeWidth="1.5" />
      <circle cx="150" cy="150" r="16" fill="#e9e1ce" stroke="#c8b48a" strokeWidth="1.5" />
      {/* quelques loges musculaires neutres */}
      <ellipse cx="150" cy="92" rx="26" ry="20" fill="#efd7de" />
      <ellipse cx="86" cy="98" rx="22" ry="18" fill="#efd7de" />
      {/* muscle cible (FDS) en évidence — antérieur */}
      <ellipse cx="120" cy="108" rx="30" ry="22" fill="#7A1E38" opacity="0.9" />
      <ellipse cx="120" cy="108" rx="30" ry="22" fill="none" stroke="#C86B85" strokeWidth="2.5" />
      {/* aiguille (fictive) vers le centre du muscle */}
      <line x1="120" y1="24" x2="120" y2="104" stroke="#4A1024" strokeWidth="2.5" strokeDasharray="5 4" />
      <circle cx="120" cy="108" r="4" fill="#C86B85" />
      <text x="120" y="18" textAnchor="middle" fontSize="11" fill="#7A1E38" fontWeight="700">
        aiguille (fictive)
      </text>
    </svg>
  );
}

export function ToxineStudio() {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<ToxineMuscle>(TOXINE_MUSCLES[0]);
  const results = useMemo(() => searchMuscles(q), [q]);
  const showResults = q.trim().length >= 2 && results.length > 0 && results[0].id !== muscle.id;

  return (
    <div className="w-full">
      {/* avertissement prototype permanent */}
      <div className="tx-proto mb-5 flex items-start gap-3 px-4 py-3">
        <span aria-hidden className="mt-0.5 text-[18px]">⚠️</span>
        <p className="text-[12.5px] leading-relaxed text-[#7A1E38]">
          <b>Prototype de démonstration.</b>{" "}Le modèle 3D est schématique et les points
          d&apos;injection sont <b>fictifs</b>{" "}(placés au centre du muscle). Aucune valeur
          clinique : les sites, profondeurs et doses réels seront transcrits d&apos;ouvrages publiés
          et validés.
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
            <ToxineScene muscle={muscle} />
            <p className="pointer-events-none absolute bottom-2 left-0 right-0 text-center text-[10.5px] text-[#a83e5a]">
              Faites glisser pour pivoter · molette pour zoomer · seringues = points fictifs
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="tx-panel px-4 py-4">
            <h3 className="text-[13px] font-semibold text-[#4A1024]">Coupe axiale — schématique</h3>
            <p className="mt-0.5 text-[11px] text-ink-soft">
              Générée à titre indicatif ; la coupe réelle sera dérivée du modèle 3D.
            </p>
            <div className="mt-3">
              <AxialDiagram />
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

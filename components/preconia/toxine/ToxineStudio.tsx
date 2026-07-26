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

/** Coupe axiale schématique du tiers moyen de l'avant-bras DROIT (vue distale,
    antérieur en haut) : loges antérieure (fléchisseurs) et postérieure (extenseurs)
    disposées selon l'anatomie, radius (latéral) et ulna (médial) avec membrane
    interosseuse. Le FDS est mis en évidence dans le plan des fléchisseurs superficiels,
    les autres muscles restent estompés — comme dans la vue 3D. */
function AxialDiagram() {
  const faint = { fill: "#B47487", fillOpacity: 0.16 };
  return (
    <svg viewBox="0 0 300 250" className="mx-auto block w-full max-w-[300px]" role="img" aria-label="Coupe axiale de l'avant-bras droit">
      {/* repères antérieur / postérieur */}
      <text x="150" y="12" textAnchor="middle" fontSize="9" fill="#a83e5a" fontWeight="700">ANTÉRIEUR (fléchisseurs)</text>
      <text x="150" y="245" textAnchor="middle" fontSize="9" fill="#a83e5a" fontWeight="700">POSTÉRIEUR (extenseurs)</text>
      {/* enveloppe de l'avant-bras */}
      <ellipse cx="150" cy="128" rx="132" ry="100" fill="#f7e3ea" stroke="#a83e5a" strokeOpacity="0.45" strokeWidth="2" />
      {/* muscles de contexte — estompés */}
      {/* loge antérieure superficielle */}
      <ellipse cx="72" cy="88" rx="24" ry="18" {...faint} />{/* rond pronateur / FCR */}
      <ellipse cx="228" cy="92" rx="22" ry="17" {...faint} />{/* FCU */}
      <ellipse cx="40" cy="128" rx="18" ry="20" {...faint} />{/* brachio-radial / long ext. radiaux */}
      {/* loge antérieure profonde (près des os) */}
      <ellipse cx="118" cy="150" rx="26" ry="16" {...faint} />{/* FDP */}
      <ellipse cx="186" cy="150" rx="18" ry="13" {...faint} />{/* FPL */}
      {/* loge postérieure */}
      <ellipse cx="96" cy="196" rx="28" ry="18" {...faint} />{/* extenseurs des doigts */}
      <ellipse cx="176" cy="198" rx="24" ry="16" {...faint} />{/* ECU / EDM */}
      <ellipse cx="240" cy="160" rx="18" ry="16" {...faint} />{/* ext. radiaux */}
      <ellipse cx="150" cy="176" rx="20" ry="12" {...faint} />{/* profonds (supinateur/APL…) */}
      {/* os : ulna (médial, gauche) et radius (latéral, droit), membrane interosseuse */}
      <path d="M96 128 q-16 -6 -14 14 q2 20 18 14 q14 -6 8 -18 q-4 -10 -12 -10Z" fill="#e9e1ce" stroke="#c8b48a" strokeWidth="1.5" />
      <path d="M206 124 q16 -4 14 14 q-2 18 -18 12 q-12 -6 -6 -16 q4 -8 10 -10Z" fill="#e9e1ce" stroke="#c8b48a" strokeWidth="1.5" />
      <line x1="112" y1="132" x2="196" y2="128" stroke="#c8b48a" strokeWidth="1.5" strokeDasharray="3 3" />
      {/* FDS — mis en évidence (plan des fléchisseurs superficiels) */}
      <ellipse cx="150" cy="96" rx="34" ry="22" fill="#7A1E38" opacity="0.92" />
      <ellipse cx="150" cy="96" rx="34" ry="22" fill="none" stroke="#C86B85" strokeWidth="2.5" />
      {/* points d'injection fictifs */}
      <circle cx="138" cy="96" r="4" fill="#F4E3E9" />
      <circle cx="162" cy="96" r="4" fill="#F4E3E9" />
      {/* étiquettes */}
      <text x="150" y="99" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="700">FDS</text>
      <text x="70" y="146" textAnchor="middle" fontSize="8.5" fill="#7A1E38">Ulna</text>
      <text x="230" y="140" textAnchor="middle" fontSize="8.5" fill="#7A1E38">Radius</text>
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
          <b>Prototype de démonstration.</b>{" "}L&apos;anatomie 3D est réelle (BodyParts3D), mais les
          points d&apos;injection sont <b>fictifs</b>{" "}(placés au centre du muscle). Aucune valeur
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
              Faites glisser pour pivoter · molette pour zoomer · ● = points d&apos;injection fictifs
            </p>
            <p className="pointer-events-none absolute bottom-0 right-2 text-[9px] text-[#a83e5a]/70">
              Modèle : BodyParts3D © DBCLS — CC BY-SA 2.1 JP
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="tx-panel px-4 py-4">
            <h3 className="text-[13px] font-semibold text-[#4A1024]">Coupe axiale — tiers moyen</h3>
            <p className="mt-0.5 text-[11px] text-ink-soft">
              Schéma anatomique de l&apos;avant-bras droit (loges antérieure/postérieure),
              FDS mis en évidence.
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

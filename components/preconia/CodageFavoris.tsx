"use client";

/* Bouton « Favoris » des barres de l'aide au codage : volet roulant (survol /
   focus clavier, même patron que le volet du logo) listant les codes épinglés —
   clic = copie du code, × = retrait. Alimenté par l'étoile des résultats. */

import { useState } from "react";
import { FAV_BASE_LABEL, removeFav, useFavs } from "@/components/preconia/codageFavorites";

export function CodageFavoris() {
  const favs = useFavs();
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied((c) => (c === code ? null : c)), 1400);
    } catch {
      /* presse-papiers indisponible */
    }
  };

  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full border border-[#1d4e7c]/30 bg-white/70 px-3.5 py-2.5 text-[12.5px] font-semibold text-[#0c2740] backdrop-blur transition-colors hover:border-[#0ea5e9]"
      >
        <span className="text-[#0ea5e9]">★</span>
        Favoris
        {favs.length > 0 && (
          <span className="rounded-full bg-[#e0f2fe] px-1.5 py-0.5 font-mono text-[10.5px] font-semibold leading-none text-[#0c4a6e]">
            {favs.length}
          </span>
        )}
      </button>
      {/* volet aligné à droite, sous la barre (le padding supérieur passe sous le
          bord pour que le survol ne se rompe pas) */}
      <div className="invisible absolute right-0 top-full z-50 -translate-y-2 pt-[14px] opacity-0 transition-all duration-200 ease-out group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
        <div className="w-[21rem] overflow-hidden rounded-2xl border border-[#38bdf8]/40 bg-white/90 shadow-[0_18px_44px_-18px_rgba(12,42,68,0.5)] backdrop-blur-xl">
          <div className="border-b border-line-soft px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#1d4e7c]">
            Codes favoris
          </div>
          {favs.length === 0 ? (
            <p className="px-4 py-4 text-[12.5px] leading-relaxed text-ink-soft">
              Aucun code épinglé pour l&apos;instant — cliquez l&apos;étoile{" "}
              <span className="text-[#0ea5e9]">☆</span> d&apos;un résultat pour retrouver ici vos
              codes les plus usités.
            </p>
          ) : (
            <ul className="max-h-[19rem] divide-y divide-line-soft overflow-y-auto">
              {favs.map((f) => (
                <li key={`${f.base}-${f.code}`} className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => copy(f.code)}
                    title="Copier le code"
                    className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[#e0f2fe]/50"
                  >
                    <span
                      className={`inline-flex shrink-0 items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                        copied === f.code ? "bg-[#0c2740] text-white" : "bg-[#e0f2fe] text-[#0c4a6e]"
                      }`}
                    >
                      {copied === f.code ? "✓ copié" : f.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] leading-snug text-ink">
                        {f.label}
                      </span>
                      <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-soft/60">
                        {FAV_BASE_LABEL[f.base]}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFav(f.base, f.code)}
                    title="Retirer des favoris"
                    aria-label={`Retirer ${f.code} des favoris`}
                    className="shrink-0 border-l border-line-soft px-2.5 text-[13px] text-ink-soft/50 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

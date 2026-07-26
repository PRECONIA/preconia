/* Barre du pilier Toxine (Bordeaux) — logo + volet roulant passerelle vers le site
   VPH (cloisonnement : seul le logo relie les pans), chip « prototype » et Contact.
   Même gabarit 1240px que les autres barres (logos alignés d'un pan à l'autre). */

import Link from "next/link";
import { Logo } from "@/components/preconia/Logo";

export function ToxineHeader() {
  return (
    <header className="tx-header">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-5 px-5 py-4">
        {/* marque + volet roulant « Préconisation VPH » au survol du logo */}
        <div className="group relative shrink-0">
          <Link href="/toxine" className="flex items-center gap-2.5">
            <Logo variant="bordeaux" className="h-11 w-11 drop-shadow-sm" />
            <span className="leading-none">
              <span className="block text-[17px] font-bold tracking-tight text-[#4A1024]">
                PRECONIA <span className="text-[#C0546E]">Toxine</span>
              </span>
              <span className="mt-0.5 hidden text-[8.5px] font-semibold uppercase tracking-[0.18em] text-[#7A1E38] sm:block">
                Sites d&apos;injection · toxine botulique
              </span>
            </span>
          </Link>
          <div className="invisible absolute left-0 top-full z-50 -translate-y-2 pt-[22px] opacity-0 transition-all duration-200 ease-out group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
            <Link
              href="/preconia"
              className="flex w-72 items-center gap-3 rounded-2xl border border-petrol/30 bg-white/85 px-4 py-3 shadow-[0_18px_44px_-18px_rgba(7,63,60,0.5)] backdrop-blur-xl transition-transform hover:-translate-y-0.5"
            >
              <Logo className="h-10 w-10 shrink-0" />
              <span className="leading-tight">
                <span className="block text-[14.5px] font-bold tracking-tight text-ink">
                  PRECON<span className="text-petrol">IA</span>
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-soft">
                  Aide à la préconisation VPH — ouvrir ↗
                </span>
              </span>
            </Link>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <span className="hidden rounded-full border border-[#a83e5a]/40 bg-[#fbeef2] px-3 py-1.5 text-[11px] font-semibold text-[#7A1E38] sm:inline">
            Prototype
          </span>
          <Link
            href="/contact"
            className="tx-btn inline-flex items-center rounded-xl px-5 py-3 text-[13.5px] font-semibold text-white"
          >
            Contact
          </Link>
        </div>
      </div>
    </header>
  );
}

"use client";

/* En-tête institutionnel : barre fixe pleine largeur en verre dépoli, liseré
   pétrole→orange en tête, marque à gauche, ancres de sections au centre (repli
   en rangée défilante sur mobile), statut de conformité et Contact à droite. */

import Link from "next/link";
import { Logo } from "@/components/preconia/Logo";

export const SECTIONS: { id: string; label: string }[] = [
  { id: "preconisation", label: "Parcours guidé" },
  { id: "recherche-lppr", label: "Recherche LPPR" },
  { id: "cumul", label: "Évaluation de cumul" },
  { id: "recherche-vph", label: "Recherche VPH" },
  { id: "specificites-prescription", label: "Spécificités de prescription" },
  { id: "apropos", label: "FAQ" },
];

function scrollToSection(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function SiteHeader({ className = "" }: { className?: string }) {
  return (
    <header
      className={`sticky top-0 z-50 border-b border-white/60 bg-white/70 shadow-[0_10px_34px_-20px_rgba(7,63,60,0.5)] backdrop-blur-xl ${className}`}
    >
      {/* liseré signature */}
      <div className="h-[3px] bg-gradient-to-r from-petrol-deep via-petrol to-orange-500" />
      <div className="mx-auto flex max-w-[1240px] items-center gap-5 px-5 py-4">
        <Link href="/preconia" className="flex shrink-0 items-center gap-2.5">
          <Logo className="h-11 w-11 drop-shadow-sm" />
          <span className="leading-none">
            <span className="block text-[17px] font-bold tracking-tight">
              PRECON<span className="text-petrol">IA</span>
            </span>
            <span className="mt-0.5 hidden text-[8.5px] font-semibold uppercase tracking-[0.18em] text-petrol sm:block">
              Aide à la préconisation VPH
            </span>
          </span>
        </Link>

        {/* ancres — desktop */}
        <nav aria-label="Sections" className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => scrollToSection(e, s.id)}
              className="rounded-lg px-3.5 py-3 text-[13.5px] font-semibold text-ink-soft transition-colors hover:bg-petrol hover:text-white"
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2.5 lg:ml-0">
                    <Link
            href="/contact"
            className="pc-btn-accent inline-flex items-center rounded-xl px-5 py-3 text-[13.5px] font-semibold text-white"
          >
            Contact
          </Link>
        </div>
      </div>
      {/* ancres — mobile : rangée défilante */}
      <nav
        aria-label="Sections"
        className="flex gap-1 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => scrollToSection(e, s.id)}
            className="shrink-0 rounded-full border border-line-soft bg-white/70 px-3 py-1 text-[12px] font-semibold text-ink-soft"
          >
            {s.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

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
        {/* marque + volet roulant « Aide au codage » au survol du logo */}
        <div className="group relative shrink-0">
          <Link href="/preconia" className="flex items-center gap-2.5">
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
          {/* le volet descend sous la barre au survol / focus clavier, aligné à gauche
              (sous le logo) ; le padding supérieur passe sous le bord du header pour que
              le survol ne se rompe pas et que le volet ne chevauche pas la barre. */}
          <div className="invisible absolute left-0 top-full z-50 -translate-y-2 pt-[22px] opacity-0 transition-all duration-200 ease-out group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
            <Link
              href="/aide-codage"
              className="flex w-72 items-center gap-3 rounded-2xl border border-[#38bdf8]/40 bg-white/85 px-4 py-3 shadow-[0_18px_44px_-18px_rgba(12,42,68,0.5)] backdrop-blur-xl transition-transform hover:-translate-y-0.5"
            >
              <Logo variant="navy" className="h-10 w-10 shrink-0" />
              <span className="leading-tight">
                <span className="block text-[14.5px] font-bold tracking-tight text-[#0c2740]">
                  PRECONIA <span className="text-[#0ea5e9]">Aide au codage</span>
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-soft">
                  Diagnostics CIM-10 &amp; actes CCAM — ouvrir ↗
                </span>
              </span>
            </Link>
          </div>
        </div>

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
          {/* volet roulant « Guides » : pages de destination (guides VPH + aide au codage) */}
          <div className="group relative">
            <button
              type="button"
              className="whitespace-nowrap rounded-lg px-3.5 py-3 text-[13.5px] font-semibold text-ink-soft transition-colors hover:bg-petrol hover:text-white group-focus-within:bg-petrol group-focus-within:text-white group-hover:bg-petrol group-hover:text-white"
            >
              Guides <span aria-hidden>▾</span>
            </button>
            <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 -translate-y-2 pt-[14px] opacity-0 transition-all duration-200 ease-out group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              <div className="w-80 overflow-hidden rounded-2xl border border-line-soft bg-white/90 shadow-[0_18px_44px_-18px_rgba(7,63,60,0.5)] backdrop-blur-xl">
                <div className="border-b border-line-soft px-4 py-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-petrol">
                  Prescription VPH
                </div>
                <Link
                  href="/nomenclature-vph-2025"
                  className="block px-4 py-2.5 transition-colors hover:bg-petrol-tint/40"
                >
                  <span className="block text-[13px] font-semibold text-ink">
                    Nomenclature VPH 2025
                  </span>
                  <span className="block text-[11px] text-ink-soft">
                    Catégories, prise en charge, forfaits — arrêté du 6 février 2025
                  </span>
                </Link>
                <Link
                  href="/prescription-fauteuil-roulant"
                  className="block px-4 py-2.5 transition-colors hover:bg-petrol-tint/40"
                >
                  <span className="block text-[13px] font-semibold text-ink">
                    Prescription d&apos;un fauteuil roulant
                  </span>
                  <span className="block text-[11px] text-ink-soft">
                    Prescripteurs, parcours d&apos;évaluation et d&apos;essais, fiche de préconisation
                  </span>
                </Link>
                <div className="border-b border-t border-line-soft px-4 py-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#1d4e7c]">
                  Aide au codage
                </div>
                <Link
                  href="/aide-codage"
                  className="block px-4 py-2.5 transition-colors hover:bg-[#e0f2fe]/50"
                >
                  <span className="block text-[13px] font-semibold text-ink">
                    Le moteur — 4 nomenclatures
                  </span>
                  <span className="block text-[11px] text-ink-soft">
                    Recherche instantanée : diagnostics, actes, dispositifs
                  </span>
                </Link>
                <div className="flex gap-1.5 px-4 pb-3 pt-1">
                  {[
                    { href: "/aide-codage/cim-10", label: "CIM-10" },
                    { href: "/aide-codage/ccam", label: "CCAM" },
                    { href: "/aide-codage/ngap", label: "NGAP" },
                    { href: "/aide-codage/lpp", label: "LPP" },
                  ].map((g) => (
                    <Link
                      key={g.href}
                      href={g.href}
                      className="rounded-full border border-[#1d4e7c]/25 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-[#1d4e7c] transition-colors hover:border-[#0ea5e9] hover:text-[#0c2740]"
                    >
                      {g.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
        {/* guides (pages de destination) — le volet roulant n'existe qu'au survol desktop */}
        {[
          { href: "/nomenclature-vph-2025", label: "Guide nomenclature" },
          { href: "/prescription-fauteuil-roulant", label: "Guide prescription" },
          { href: "/aide-codage", label: "Aide au codage" },
        ].map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className="shrink-0 rounded-full border border-petrol/30 bg-petrol-tint/30 px-3 py-1 text-[12px] font-semibold text-petrol-deep"
          >
            {g.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

"use client";

/* En-tête institutionnel : barre fixe pleine largeur en verre dépoli, liseré
   pétrole→orange en tête, marque à gauche, ancres de sections au centre (repli
   en rangée défilante sur mobile), statut de conformité et Contact à droite. */

import Link from "next/link";
import { Logo } from "@/components/preconia/Logo";

/* Pont vers Mediculus (calculateur médical, second outil de Thomas).
   Branché sur l'instance LOCALE pour commencer (npx next start -p 3200 dans
   /Users/thomas/mediculus) — remplacer par l'URL publique au déploiement.
   null = volet visible mais marqué « bientôt » (mediculus.vercel.app appartient
   à un tiers, ne pas l'utiliser). */
const MEDICULUS_URL: string | null = "http://localhost:3200";

/* Logo Mediculus : boulier minimaliste — copie fidèle de components/Logo.tsx
   du projet Mediculus (3 rails encre, 3 billes bleu accent). */
function MediculusLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <line x1="10" y1="18" x2="46" y2="18" stroke="#16212E" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="10" y1="28" x2="46" y2="28" stroke="#16212E" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="10" y1="38" x2="46" y2="38" stroke="#16212E" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="22" cy="18" r="4.8" fill="#2A66E8" />
      <circle cx="36" cy="28" r="4.8" fill="#2A66E8" />
      <circle cx="16" cy="38" r="4.8" fill="#2A66E8" />
    </svg>
  );
}

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

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/60 bg-white/70 shadow-[0_10px_34px_-20px_rgba(7,63,60,0.5)] backdrop-blur-xl">
      {/* liseré signature */}
      <div className="h-[3px] bg-gradient-to-r from-petrol-deep via-petrol to-orange-500" />
      <div className="mx-auto flex max-w-[1240px] items-center gap-5 px-5 py-4">
        {/* marque + volet roulant « Mediculus » au survol du logo */}
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
          {/* volet : descend sous la marque au survol / au focus clavier ; le padding
              supérieur fait pont pour que le survol ne se rompe pas entre logo et volet. */}
          <div className="invisible absolute left-0 top-full z-50 -translate-y-2 pt-2 opacity-0 transition-all duration-200 ease-out group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
            {MEDICULUS_URL ? (
              <a
                href={MEDICULUS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="pc-panel flex w-64 items-center gap-3 px-4 py-3 transition-transform hover:-translate-y-0.5"
              >
                <MediculusLogo size={34} />
                <span className="leading-tight">
                  <span className="block text-[15px] font-bold tracking-tight text-[#16212E]">
                    Medi<span className="text-[#2A66E8]">culus</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-soft">
                    Calculateur médical — ouvrir ↗
                  </span>
                </span>
              </a>
            ) : (
              <div className="pc-panel flex w-64 items-center gap-3 px-4 py-3 opacity-90">
                <MediculusLogo size={34} />
                <span className="leading-tight">
                  <span className="block text-[15px] font-bold tracking-tight text-[#16212E]">
                    Medi<span className="text-[#2A66E8]">culus</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-soft">
                    Calculateur médical —{" "}
                    <span className="rounded bg-[#2A66E8]/10 px-1 py-0.5 font-semibold text-[#2A66E8]">
                      bientôt
                    </span>
                  </span>
                </span>
              </div>
            )}
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

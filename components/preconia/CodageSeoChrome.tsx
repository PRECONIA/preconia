/* Ossature commune des pages guides de l'Aide au codage (CIM-10, CCAM, NGAP, LPP) :
   barre supérieure navy (marque → hub + CTA), fil d'Ariane indexable à 3 niveaux,
   cartes de contenu et liens connexes — même rôle que SeoPageChrome côté site VPH,
   décliné dans le thème bleu marine. Rendu serveur : tout est dans le HTML initial. */

import Link from "next/link";
import { CodageFavoris } from "@/components/preconia/CodageFavoris";
import { Logo } from "@/components/preconia/Logo";

/* ancres des quatre pages guides, affichées dans les barres (hub + guides) */
const NAV: { id: string; href: string; label: string }[] = [
  { id: "cim10", href: "/aide-codage/cim-10", label: "CIM-10" },
  { id: "ccam", href: "/aide-codage/ccam", label: "CCAM" },
  { id: "ngap", href: "/aide-codage/ngap", label: "NGAP" },
  { id: "lpp", href: "/aide-codage/lpp", label: "LPP" },
];

/** Liens vers les quatre nomenclatures (page active surlignée via `current`). */
export function CodageNav({
  current,
  className = "",
}: {
  current?: string;
  className?: string;
}) {
  return (
    <nav aria-label="Nomenclatures" className={className}>
      {NAV.map((n) => (
        <Link
          key={n.id}
          href={n.href}
          aria-current={current === n.id ? "page" : undefined}
          className={`shrink-0 rounded-lg px-6 py-2.5 text-[14px] font-semibold transition-colors ${
            current === n.id
              ? "bg-[#0c2740] text-white"
              : "text-ink-soft hover:bg-[#1d4e7c] hover:text-white"
          }`}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}

/** Barre unique de la partie Aide au codage — identique sur le hub et les pages
    guides (logo + volet passerelle vers le site VPH, ancres des nomenclatures,
    favoris, contact). `current` surligne la nomenclature de la page active. */
export function CodageHeader({ current }: { current?: string }) {
  return (
    <header className="cc-header">
      {/* même gabarit (1240px) que la barre du site VPH : les logos restent
          exactement au même endroit quand on bascule d'une partie à l'autre */}
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-5 px-5 py-4">
        {/* marque + volet roulant « Préconisation VPH » au survol du logo (symétrique) */}
        <div className="group relative shrink-0">
          <Link href="/aide-codage" className="flex items-center gap-2.5">
            <Logo variant="navy" className="h-11 w-11 drop-shadow-sm" />
            <span className="leading-none">
              <span className="block text-[17px] font-bold tracking-tight text-[#0c2740]">
                PRECONIA <span className="text-[#0ea5e9]">Aide au codage</span>
              </span>
              <span className="mt-0.5 hidden text-[8.5px] font-semibold uppercase tracking-[0.18em] text-[#1d4e7c] sm:block">
                Diagnostics CIM-10 · Actes CCAM
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
        {/* ancres des quatre pages guides — desktop */}
        <CodageNav current={current} className="hidden flex-1 items-center justify-center gap-1 lg:flex" />
        {/* favoris (codes épinglés) + contact — l'accès à la préconisation VPH
            passe par le volet roulant du logo */}
        <div className="flex shrink-0 items-center gap-2.5">
          <CodageFavoris />
          <Link
            href="/contact"
            className="cc-btn inline-flex items-center rounded-xl px-5 py-3 text-[13.5px] font-semibold text-white"
          >
            Contact
          </Link>
        </div>
      </div>
      {/* ancres — mobile : rangée défilante */}
      <CodageNav
        current={current}
        className="flex gap-1 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      />
    </header>
  );
}

export function CodageBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-4 text-[12px] text-ink-soft">
      <Link href="/preconia" className="underline-offset-2 hover:text-[#0c2740] hover:underline">
        Accueil
      </Link>
      <span className="mx-1.5 text-ink-soft/50">/</span>
      <Link href="/aide-codage" className="underline-offset-2 hover:text-[#0c2740] hover:underline">
        Aide au codage
      </Link>
      <span className="mx-1.5 text-ink-soft/50">/</span>
      <span className="text-ink">{current}</span>
    </nav>
  );
}

/** Carte de contenu navy (panneau en verre à liseré marine → ciel). */
export function CarteNavy({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 overflow-hidden cc-panel">
      <div className="h-[3px] bg-gradient-to-r from-[#1d4e7c] to-[#0c2740]" />
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

/** Bloc de liens connexes (maillage interne entre les guides + retour au moteur). */
export function RelatedNavy({
  links,
}: {
  links: { href: string; title: string; desc: string }[];
}) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="group rounded-xl border border-[#1d4e7c]/20 bg-white/70 p-4 transition-colors hover:border-[#0ea5e9]"
        >
          <div className="text-sm font-semibold text-ink group-hover:text-[#0c2740]">
            {l.title} <span className="text-[#0ea5e9]">→</span>
          </div>
          <div className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{l.desc}</div>
        </Link>
      ))}
    </div>
  );
}

/** JSON-LD MedicalWebPage + BreadcrumbList (3 niveaux) + FAQPage optionnelle. */
export function codageJsonLd({
  url,
  name,
  description,
  breadcrumb,
  faq,
}: {
  url: string;
  name: string;
  description: string;
  breadcrumb: string;
  faq?: { q: string; a: string }[];
}) {
  const graph: object[] = [
    {
      "@type": "MedicalWebPage",
      url,
      name,
      description,
      inLanguage: "fr",
      isPartOf: { "@type": "WebSite", name: "PRECONIA", url: "https://preconia.fr" },
      audience: { "@type": "MedicalAudience", audienceType: "Professionnels de santé" },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://preconia.fr/preconia" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Aide au codage",
          item: "https://preconia.fr/aide-codage",
        },
        { "@type": "ListItem", position: 3, name: breadcrumb, item: url },
      ],
    },
  ];
  if (faq && faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

/** Pied de page commun des pages guides (disclaimer + sources). */
export function CodageGuideFooter({ source }: { source: string }) {
  return (
    <p className="mx-auto mt-8 max-w-[70ch] text-center text-[11px] leading-relaxed text-ink-soft/70" lang="fr">
      Aide au codage à destination des professionnels de santé — indicative et non opposable ;
      seuls les référentiels officiels font foi ({source}).
    </p>
  );
}

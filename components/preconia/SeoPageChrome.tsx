/* Ossature commune des pages de destination SEO (nomenclature, prescription…) :
   barre supérieure (marque → accueil + CTA « Ouvrir l'outil »), fil d'Ariane
   indexable, et bloc de liens connexes en pied — pour un maillage interne fort.
   Rendu serveur : le contenu et les liens sont dans le HTML initial. */

import Link from "next/link";
import { Logo } from "@/components/preconia/Logo";

export function SeoTopBar() {
  return (
    <div className="sticky top-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="h-[3px] bg-gradient-to-r from-petrol-deep via-petrol to-orange-500" />
      <div className="mx-auto flex max-w-[880px] items-center justify-between gap-4 px-5 py-3">
        <Link href="/preconia" className="flex items-center gap-2.5">
          <Logo className="h-9 w-9 drop-shadow-sm" />
          <span className="text-[16px] font-bold tracking-tight">
            PRECON<span className="text-petrol">IA</span>
          </span>
        </Link>
        <Link
          href="/preconia"
          className="pc-btn-primary inline-flex items-center rounded-xl px-4 py-2 text-[13px] font-semibold text-white"
        >
          Ouvrir l&apos;outil ↗
        </Link>
      </div>
    </div>
  );
}

export function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-4 text-[12px] text-ink-soft">
      <Link href="/preconia" className="underline-offset-2 hover:text-petrol-deep hover:underline">
        Accueil
      </Link>
      <span className="mx-1.5 text-ink-soft/50">/</span>
      <span className="text-ink">{current}</span>
    </nav>
  );
}

/** Bloc de liens connexes (maillage interne + rappel de l'outil). */
export function RelatedLinks({
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
          className="group rounded-xl border border-line-soft bg-white/70 p-4 transition-colors hover:border-petrol"
        >
          <div className="text-sm font-semibold text-ink group-hover:text-petrol-deep">
            {l.title} <span className="text-petrol">→</span>
          </div>
          <div className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{l.desc}</div>
        </Link>
      ))}
    </div>
  );
}

/** JSON-LD BreadcrumbList + MedicalWebPage pour une page de destination. */
export function seoPageJsonLd({
  url,
  name,
  description,
  breadcrumb,
}: {
  url: string;
  name: string;
  description: string;
  breadcrumb: string;
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "MedicalWebPage",
        url,
        name,
        description,
        inLanguage: "fr",
        isPartOf: { "@type": "WebSite", name: "PRECONIA", url: "https://preconia.vercel.app" },
        about: { "@type": "MedicalIndication" },
        audience: { "@type": "MedicalAudience", audienceType: "Professionnels de santé" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: "https://preconia.vercel.app/preconia",
          },
          { "@type": "ListItem", position: 2, name: breadcrumb, item: url },
        ],
      },
    ],
  };
}

/** Carte de contenu (panneau en verre à liseré) — cohérente avec le reste du site. */
export function Carte({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 overflow-hidden pc-panel">
      <div className="h-[3px] bg-gradient-to-r from-petrol to-petrol-deep" />
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

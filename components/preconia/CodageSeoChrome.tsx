/* Ossature commune des pages guides de l'Aide au codage (CIM-10, CCAM, NGAP, LPP) :
   barre supérieure navy (marque → hub + CTA), fil d'Ariane indexable à 3 niveaux,
   cartes de contenu et liens connexes — même rôle que SeoPageChrome côté site VPH,
   décliné dans le thème bleu marine. Rendu serveur : tout est dans le HTML initial. */

import Link from "next/link";
import { CodageFavoris } from "@/components/preconia/CodageFavoris";
import { Logo } from "@/components/preconia/Logo";

export function CodageTopBar() {
  return (
    <div className="sticky top-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur-xl">
      <div className="h-[3px] bg-gradient-to-r from-[#0c2740] via-[#1d4e7c] to-[#38bdf8]" />
      <div className="mx-auto flex max-w-[880px] items-center justify-between gap-4 px-5 py-3">
        <Link href="/aide-codage" className="flex items-center gap-2.5">
          <Logo variant="navy" className="h-9 w-9 drop-shadow-sm" />
          <span className="text-[16px] font-bold tracking-tight text-[#0c2740]">
            PRECONIA <span className="text-[#0ea5e9]">Aide au codage</span>
          </span>
        </Link>
        {/* le moteur est déjà affiché sur chaque page guide : pas de CTA redondant,
            on donne accès aux codes épinglés */}
        <CodageFavoris />
      </div>
    </div>
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

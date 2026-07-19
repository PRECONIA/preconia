import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CarteNavy,
  CodageBreadcrumb,
  CodageGuideFooter,
  CodageHeader,
} from "@/components/preconia/CodageSeoChrome";
import { NgapArticleBody } from "@/components/preconia/NgapArticleBody";
import { getNgap } from "@/lib/ngapArticles";

/* Une page statique par article de la NGAP (150) : le moteur de recherche renvoie
   vers ces pages au lieu de déplier le texte sur place — lisibilité, URL partageable
   et contenu indexable. Texte officiel verbatim, non interprété. */

export const dynamicParams = false;

export function generateStaticParams() {
  return getNgap().articles.map((a) => ({ slug: a.slug }));
}

/** description SEO : premier fragment propre du corps de l'article (~155 caractères). */
function metaDescription(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 155 ? flat.slice(0, 152).trimEnd() + "…" : flat;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getNgap().articles.find((a) => a.slug === slug);
  if (!article) return {};
  const title = `NGAP — ${article.num} : ${article.title || "texte officiel"}`;
  const description = metaDescription(article.text) || `${article.num} de la NGAP, texte officiel.`;
  return {
    title,
    description,
    alternates: { canonical: `/aide-codage/ngap/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://preconia.fr/aide-codage/ngap/${slug}`,
      siteName: "PRECONIA",
      type: "article",
      locale: "fr_FR",
    },
  };
}

export const viewport: Viewport = { themeColor: "#16324f" };

export default async function NgapArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { version, articles } = getNgap();
  const i = articles.findIndex((a) => a.slug === slug);
  if (i < 0) notFound();
  const article = articles[i];
  const prev = i > 0 ? articles[i - 1] : null;
  const next = i < articles.length - 1 ? articles[i + 1] : null;

  return (
    <div className="cc-page">
      <CodageHeader current="ngap" />
      <main className="pg-cascade mx-auto max-w-[880px] px-5 pb-16 pt-6">
        <CodageBreadcrumb
          parent={{ href: "/aide-codage/ngap", label: "NGAP" }}
          current={article.num}
        />
        <h1 className="text-[24px] font-bold leading-[1.15] tracking-tight text-[#0c2740] sm:text-[30px]">
          <span className="mr-2.5 inline-flex align-middle rounded bg-[#e0f2fe] px-2 py-0.5 font-mono text-[15px] font-semibold text-[#0c4a6e]">
            {article.num}
          </span>
          {article.title || "Texte officiel"}
        </h1>
        {article.part && (
          <p className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0ea5e9]">
            {article.part}
          </p>
        )}

        <CarteNavy>
          {article.text ? (
            <NgapArticleBody text={article.text} />
          ) : (
            <p className="text-[13.5px] leading-relaxed text-ink-soft">
              Article sans texte (abrogé ou renvoi).
            </p>
          )}
        </CarteNavy>

        {/* navigation entre articles + retour au moteur */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/aide-codage/ngap/${prev.slug}`}
              className="group rounded-xl border border-[#1d4e7c]/20 bg-white/70 p-4 transition-colors hover:border-[#0ea5e9]"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/70">
                ← Article précédent
              </div>
              <div className="mt-1 text-sm font-semibold text-ink group-hover:text-[#0c2740]">
                {prev.num} — {prev.title || "texte officiel"}
              </div>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/aide-codage/ngap/${next.slug}`}
              className="group rounded-xl border border-[#1d4e7c]/20 bg-white/70 p-4 text-right transition-colors hover:border-[#0ea5e9]"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/70">
                Article suivant →
              </div>
              <div className="mt-1 text-sm font-semibold text-ink group-hover:text-[#0c2740]">
                {next.num} — {next.title || "texte officiel"}
              </div>
            </Link>
          )}
        </div>
        <div className="mt-4 text-center">
          <Link
            href="/aide-codage/ngap"
            className="cc-btn inline-flex items-center rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white"
          >
            ← Rechercher dans la NGAP
          </Link>
        </div>

        <CodageGuideFooter source={version} />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "MedicalWebPage",
                url: `https://preconia.fr/aide-codage/ngap/${slug}`,
                name: `NGAP — ${article.num} : ${article.title}`,
                description: metaDescription(article.text),
                inLanguage: "fr",
                isPartOf: { "@type": "WebSite", name: "PRECONIA", url: "https://preconia.fr" },
                audience: { "@type": "MedicalAudience", audienceType: "Professionnels de santé" },
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Accueil", item: "https://preconia.fr/preconia" },
                  { "@type": "ListItem", position: 2, name: "Aide au codage", item: "https://preconia.fr/aide-codage" },
                  { "@type": "ListItem", position: 3, name: "NGAP", item: "https://preconia.fr/aide-codage/ngap" },
                  {
                    "@type": "ListItem",
                    position: 4,
                    name: article.num,
                    item: `https://preconia.fr/aide-codage/ngap/${slug}`,
                  },
                ],
              },
            ],
          }),
        }}
      />
    </div>
  );
}

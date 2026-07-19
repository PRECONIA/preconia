import type { MetadataRoute } from "next";
import { getNgap } from "@/lib/ngapArticles";

/* Sitemap : pages de l'outil, guides SEO, aide au codage et les 150 pages
   d'articles NGAP (texte officiel indexable). */
const BASE = "https://preconia.fr";

export default function sitemap(): MetadataRoute.Sitemap {
  /* une entrée par article NGAP (page statique dédiée) */
  const ngap: MetadataRoute.Sitemap = getNgap().articles.map((a) => ({
    url: `${BASE}/aide-codage/ngap/${a.slug}`,
    lastModified: new Date(),
    changeFrequency: "yearly",
    priority: 0.5,
  }));
  return [
    {
      url: `${BASE}/preconia`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/nomenclature-vph-2025`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE}/prescription-fauteuil-roulant`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE}/aide-codage`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE}/aide-codage/cim-10`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/aide-codage/ccam`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/aide-codage/ngap`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/aide-codage/lpp`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/conformite`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE}/contact`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...ngap,
  ];
}

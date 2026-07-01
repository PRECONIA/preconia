import type { MetadataRoute } from "next";

/* Sitemap minimal : la page de l'outil (la racine « / » y redirige).
   À enrichir quand des pages SEO par calcul/thème seront ajoutées. */
const BASE = "https://preconia.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE}/preconia`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}

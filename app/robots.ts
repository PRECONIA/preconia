import type { MetadataRoute } from "next";

/* Autorise l'indexation de tout le site et pointe vers le sitemap.
   Domaine canonique : preconia.fr (l'ancien preconia.vercel.app y redirige). */
const BASE = "https://preconia.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}

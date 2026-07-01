import type { MetadataRoute } from "next";

/* Autorise l'indexation de tout le site et pointe vers le sitemap.
   À mettre à jour si un domaine propre remplace preconia.vercel.app. */
const BASE = "https://preconia.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}

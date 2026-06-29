import type { MetadataRoute } from "next";

/* Manifest PWA — rend le site installable (mobile / desktop).
   Pas de service worker / cache : l'app installée charge toujours la dernière version
   déployée → mises à jour automatiques, comme le site. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PRECONIA — Aide à la préconisation des VPH",
    short_name: "PRECONIA",
    description:
      "Du profil fonctionnel à la catégorie LPPR, ses adjonctions facturables et son positionnement. Aide à la décision non opposable (MPR).",
    start_url: "/preconia",
    scope: "/",
    display: "standalone",
    lang: "fr",
    background_color: "#EFF3F3",
    theme_color: "#0C6B66",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

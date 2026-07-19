/* Lecture serveur de la NGAP (public/ngap.json) pour les pages statiques par article
   et le sitemap — même base que celle du moteur de recherche client. Ne pas importer
   côté client (node:fs). */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ngapSlug } from "@/lib/ngapSlug";

export interface NgapArticle {
  num: string;
  title: string;
  text: string;
  part: string;
  slug: string;
}

interface NgapFile {
  version: string;
  parts: string[];
  articles: [string, string, string, number][];
}

let cache: { version: string; articles: NgapArticle[] } | null = null;

export function getNgap(): { version: string; articles: NgapArticle[] } {
  if (!cache) {
    const f = JSON.parse(
      readFileSync(join(process.cwd(), "public", "ngap.json"), "utf-8"),
    ) as NgapFile;
    cache = {
      version: f.version,
      articles: f.articles.map((a) => ({
        num: a[0],
        title: a[1],
        text: a[2],
        part: a[3] >= 0 ? f.parts[a[3]] : "",
        slug: ngapSlug(a[0], a[1]),
      })),
    };
  }
  return cache;
}

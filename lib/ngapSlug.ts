/* Slug d'un article NGAP (numéro + intitulé, plafonné à 10 segments) — fonction pure,
   partagée entre les pages statiques (génération) et le moteur de recherche (liens).
   Unicité vérifiée par tests/codage.test.ts sur les 150 articles : les numéros seuls
   se répètent d'une partie/chapitre à l'autre, le couple numéro+intitulé est unique. */

export function ngapSlug(num: string, title: string): string {
  return (num + " " + title)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 10)
    .join("-");
}

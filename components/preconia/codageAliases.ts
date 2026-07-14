/* Utilitaires partagés des moteurs de codage (CIM-10, CCAM) :
   - norm : minuscules + suppression des accents (recherche insensible aux accents) ;
   - thésaurus de recherche : le fichier public/medical-aliases.json regroupe des
     termes équivalents (langage courant, abréviations, synonymes) ; expandQuery()
     étend la requête de l'utilisateur vers ces équivalents pour élargir le rappel,
     sans jamais retirer de résultat (l'ensemble n'est qu'une union). */

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");
}

export type AliasMap = Map<string, string[]>;

/** Construit la table terme normalisé → autres termes équivalents (normalisés). */
export function buildAliasMap(groups: string[][]): AliasMap {
  const map: AliasMap = new Map();
  for (const group of groups) {
    const terms = group.map(norm);
    for (const t of terms) {
      const others = terms.filter((x) => x !== t);
      const cur = map.get(t);
      if (cur) cur.push(...others.filter((o) => !cur.includes(o)));
      else map.set(t, [...others]);
    }
  }
  return map;
}

/** Charge le thésaurus (public/medical-aliases.json) et renvoie la table d'alias. */
export async function loadAliasMap(): Promise<AliasMap> {
  try {
    const r = await fetch("/medical-aliases.json");
    if (!r.ok) return new Map();
    const data = (await r.json()) as { groups: string[][] };
    return buildAliasMap(data.groups ?? []);
  } catch {
    return new Map();
  }
}

const MAX_QUERIES = 6;

/** Requête normalisée → [requête d'origine, ...requêtes équivalentes] (union, plafonnée).
    - correspondance sur la requête entière (ex. « crise cardiaque » → « infarctus ») ;
    - substitution d'un mot alias dans la requête (ex. « irm cerebrale » → « remnographie
      cerebrale »). Chaque requête générée est recherchée indépendamment puis fusionnée. */
export function expandQuery(nq: string, aliasMap: AliasMap): string[] {
  const out: string[] = [nq];
  const push = (q: string) => {
    if (q && !out.includes(q) && out.length < MAX_QUERIES) out.push(q);
  };

  // requête entière
  for (const eq of aliasMap.get(nq) ?? []) push(eq);

  // substitution mot à mot
  const tokens = nq.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    for (let i = 0; i < tokens.length; i++) {
      const eqs = aliasMap.get(tokens[i]);
      if (!eqs) continue;
      for (const eq of eqs) {
        const copy = tokens.slice();
        copy[i] = eq;
        push(copy.join(" "));
      }
    }
  }
  return out;
}

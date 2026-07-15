/* Utilitaires partagés des moteurs de codage (CIM-10, CCAM) :

   - norm : minuscules + suppression des accents (recherche insensible aux accents) ;
   - normIndex : norm + racinisation légère des pluriels français (« genoux » → « genou »,
     « canaux » → « canal ») appliquée à l'identique à l'index ET à la requête, pour que
     singulier et pluriel se trouvent mutuellement ;
   - thésaurus de recherche : public/medical-aliases.json regroupe
       · groups : groupes symétriques de termes équivalents (langage courant,
         abréviations, synonymes) — chaque terme renvoie vers les autres ;
       · expansions : correspondances dirigées terme courant → vocabulaire officiel
         (« genou » → « articulation », « infiltration » → « injection ») — sens unique,
         pour ne pas polluer les recherches sur le terme officiel.
     expandQuery() étend la requête de l'utilisateur : requête entière, sous-groupes de
     mots, substitution d'un jeton, et substitution de DEUX jetons à la fois
     (« infiltration genou » → « injection articulation »). L'ensemble n'est qu'une
     union : on n'enlève jamais de résultat, les résultats via synonyme sont
     simplement classés après les résultats directs. */

export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");
}

/* Racinisation d'un mot (déjà normalisé) : uniquement les pluriels réguliers français,
   sur les mots purement alphabétiques d'au moins 5 lettres (en deçà, trop de faux
   positifs de sous-chaînes). Appliquée symétriquement à l'index et à la requête. */
function stemWord(w: string): string {
  if (w.length < 5 || w.endsWith("ss")) return w;
  if (w.endsWith("eaux")) return w.slice(0, -1); // vaisseaux → vaisseau
  if (w.endsWith("aux")) return w.slice(0, -3) + "al"; // canaux → canal
  if (w.endsWith("s") || w.endsWith("x")) return w.slice(0, -1); // genoux → genou
  return w;
}

/** Normalisation d'indexation : norm + pluriels racinisés mot à mot. Les codes
    (mélange lettres/chiffres, ex. NZLB001) ne sont pas touchés : la racinisation ne
    s'applique qu'aux mots entiers purement alphabétiques. */
export function normIndex(s: string): string {
  return norm(s).replace(/\b[a-z]{5,}\b/g, stemWord);
}

export type AliasMap = Map<string, string[]>;

/** Construit la table terme normalisé → termes équivalents (normalisés + racinisés).
    - groups : équivalences symétriques (chaque terme pointe vers les autres) ;
    - expansions : correspondances dirigées (la clé pointe vers ses cibles, pas l'inverse). */
export function buildAliasMap(
  groups: string[][],
  expansions: Record<string, string[]> = {},
): AliasMap {
  const map: AliasMap = new Map();
  const add = (from: string, to: string) => {
    if (from === to) return;
    const cur = map.get(from);
    if (cur) {
      if (!cur.includes(to)) cur.push(to);
    } else map.set(from, [to]);
  };
  for (const group of groups) {
    const terms = group.map(normIndex);
    for (const t of terms) for (const o of terms) add(t, o);
  }
  for (const [from, tos] of Object.entries(expansions)) {
    const f = normIndex(from);
    for (const to of tos) add(f, normIndex(to));
  }
  return map;
}

interface AliasFile {
  groups?: string[][];
  expansions?: Record<string, string[]>;
}

/** Charge le thésaurus (public/medical-aliases.json) et renvoie la table d'alias. */
export async function loadAliasMap(): Promise<AliasMap> {
  try {
    const r = await fetch("/medical-aliases.json");
    if (!r.ok) return new Map();
    const data = (await r.json()) as AliasFile;
    return buildAliasMap(data.groups ?? [], data.expansions ?? {});
  } catch {
    return new Map();
  }
}

const MAX_QUERIES = 14;
const MAX_ALTS_PER_SLOT = 4; // jeton d'origine + 3 équivalents au plus par position

/** Requête normalisée (normIndex) → [requête d'origine, ...requêtes équivalentes]
    (union, plafonnée). Quatre mécanismes, du plus précis au plus large :
    1. requête entière (« crise cardiaque » → « infarctus ») ;
    2. sous-séquence de 2-3 mots remplacée par son équivalent au sein d'une requête
       plus longue ;
    3. substitution d'un seul jeton (« irm cerebrale » → « remnographie cerebrale ») ;
    4. substitution de deux jetons à la fois (« infiltration genou » →
       « injection articulation »).
    Chaque requête générée est recherchée indépendamment puis fusionnée (les
    composants classent les résultats issus d'équivalents après les directs). */
export function expandQuery(nq: string, aliasMap: AliasMap): string[] {
  const out: string[] = [nq];
  const push = (q: string) => {
    if (q && !out.includes(q) && out.length < MAX_QUERIES) out.push(q);
  };

  // 1. requête entière
  for (const eq of aliasMap.get(nq) ?? []) push(eq);

  const tokens = nq.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) return out;

  // 2. sous-séquences de 2-3 mots (« mal de gorge persistant » → « pharyngite persistant »)
  for (let n = Math.min(3, tokens.length - 1); n >= 2; n--) {
    for (let i = 0; i + n <= tokens.length; i++) {
      const phrase = tokens.slice(i, i + n).join(" ");
      for (const eq of aliasMap.get(phrase) ?? []) {
        push([...tokens.slice(0, i), eq, ...tokens.slice(i + n)].join(" "));
      }
    }
  }

  // alternatives par position (jeton d'origine en tête)
  const alts: string[][] = tokens.map((t) => [
    t,
    ...(aliasMap.get(t) ?? []).slice(0, MAX_ALTS_PER_SLOT - 1),
  ]);

  // 3. substitution d'un seul jeton
  for (let i = 0; i < tokens.length; i++) {
    for (let k = 1; k < alts[i].length; k++) {
      const copy = tokens.slice();
      copy[i] = alts[i][k];
      push(copy.join(" "));
    }
  }

  // 4. substitution de deux jetons simultanément
  for (let i = 0; i < tokens.length; i++) {
    if (alts[i].length < 2) continue;
    for (let j = i + 1; j < tokens.length; j++) {
      if (alts[j].length < 2) continue;
      for (let ki = 1; ki < alts[i].length; ki++) {
        for (let kj = 1; kj < alts[j].length; kj++) {
          const copy = tokens.slice();
          copy[i] = alts[i][ki];
          copy[j] = alts[j][kj];
          push(copy.join(" "));
        }
      }
    }
  }
  return out;
}

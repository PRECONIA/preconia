"use client";

/* Catalogue des muscles du membre supérieur, dérivé de data/toxineMuscleCatalog.json
   (extrait du modèle Open3D). On regroupe les chefs d'un même muscle en une seule
   entrée sélectionnable (nodes[]), on exclut tendons/gaines, on ajoute des libellés
   français et des alias de recherche pour les muscles usuels (nomenclature établie,
   non inventée ; repli sur le nom anglais du modèle sinon). */

import rawCatalog from "@/data/toxineMuscleCatalog.json";

interface RawMuscle {
  id: string;
  name: string;
  region: string;
  node: string;
}

export interface Muscle {
  id: string;
  label: string; // libellé affiché (FR si connu)
  english: string; // nom du modèle (référence)
  region: string; // FR
  nodes: string[]; // nœuds 3D à mettre en évidence
  aliases: string[]; // termes de recherche
}

const REGION_FR: Record<string, string> = {
  "Pectoral girdle": "Ceinture scapulaire",
  Arm: "Bras",
  Forearm: "Avant-bras",
  "Hand and wrist": "Main & poignet",
};

const EXCLUDE = /tendon|aponeuros|sheath|retinaculum|bursa|capsule|ligament|fascia|intertendinous|hood/i;

/* retire les qualificatifs de chef pour regrouper les entrées d'un même muscle. */
function baseName(n: string): string {
  return n
    .replace(/^(humero-?ulnar|radial|humeral|ulnar|long|short|lateral|medial|deep|superficial|oblique|transverse)\s+head\s+of\s+/i, "")
    .replace(/\s+(humero-?ulnar|radial|humeral|ulnar|long|short|lateral|medial|deep|superficial|oblique|transverse)\s+head$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* libellé FR + alias, clé = baseName en minuscules. */
const FR: Record<string, { fr: string; al?: string[] }> = {
  "flexor digitorum superficialis": { fr: "Fléchisseur superficiel des doigts", al: ["fds", "flechisseur commun superficiel"] },
  "flexor digitorum profundus": { fr: "Fléchisseur profond des doigts", al: ["fdp"] },
  "flexor carpi radialis": { fr: "Fléchisseur radial du carpe", al: ["frc", "grand palmaire"] },
  "flexor carpi ulnaris": { fr: "Fléchisseur ulnaire du carpe", al: ["fcu", "cubital anterieur"] },
  "flexor pollicis longus": { fr: "Long fléchisseur du pouce", al: ["lfp"] },
  "palmaris longus": { fr: "Long palmaire", al: ["petit palmaire"] },
  "pronator teres": { fr: "Rond pronateur", al: ["pronateur rond"] },
  "pronator quadratus": { fr: "Carré pronateur", al: [] },
  "brachioradialis muscle": { fr: "Brachio-radial", al: ["long supinateur"] },
  supinator: { fr: "Supinateur", al: [] },
  "supinator muscle": { fr: "Supinateur", al: [] },
  "anconeus muscle": { fr: "Anconé", al: [] },
  "extensor carpi radialis longus": { fr: "Long extenseur radial du carpe", al: ["lerc", "premier radial"] },
  "extensor carpi radialis brevis": { fr: "Court extenseur radial du carpe", al: ["cerc", "deuxieme radial"] },
  "extensor carpi ulnaris": { fr: "Extenseur ulnaire du carpe", al: ["cubital posterieur"] },
  "extensor digitorum": { fr: "Extenseur des doigts", al: ["extenseur commun"] },
  "extensor digiti minimi": { fr: "Extenseur du petit doigt", al: ["extenseur du v"] },
  "extensor indicis": { fr: "Extenseur de l'index", al: [] },
  "extensor pollicis longus": { fr: "Long extenseur du pouce", al: ["lep"] },
  "extensor pollicis brevis": { fr: "Court extenseur du pouce", al: ["cep"] },
  "abductor pollicis longus": { fr: "Long abducteur du pouce", al: ["apl"] },
  "biceps brachii": { fr: "Biceps brachial", al: ["biceps"] },
  "triceps brachii": { fr: "Triceps brachial", al: ["triceps"] },
  "brachialis muscle": { fr: "Brachial", al: ["brachial anterieur"] },
  "coracobrachialis muscle": { fr: "Coraco-brachial", al: [] },
  "deltoid muscle": { fr: "Deltoïde", al: ["deltoide"] },
  "pectoralis major muscle": { fr: "Grand pectoral", al: ["pectoral"] },
  "pectoralis minor muscle": { fr: "Petit pectoral", al: [] },
  "trapezius muscle": { fr: "Trapèze", al: ["trapeze"] },
  "latissimus dorsi muscle": { fr: "Grand dorsal", al: [] },
  "teres major muscle": { fr: "Grand rond", al: [] },
  "teres minor muscle": { fr: "Petit rond", al: [] },
  "infraspinatus muscle": { fr: "Infra-épineux", al: ["sous epineux"] },
  "supraspinatus muscle": { fr: "Supra-épineux", al: ["sus epineux"] },
  "subscapularis muscle": { fr: "Subscapulaire", al: ["sous scapulaire"] },
  "serratus anterior muscle": { fr: "Dentelé antérieur", al: ["grand dentele"] },
  "rhomboid major muscle": { fr: "Grand rhomboïde", al: [] },
  "rhomboid minor muscle": { fr: "Petit rhomboïde", al: [] },
  "levator scapulae muscle": { fr: "Élévateur de la scapula", al: ["angulaire"] },
  "abductor pollicis brevis": { fr: "Court abducteur du pouce", al: [] },
  "adductor pollicis": { fr: "Adducteur du pouce", al: [] },
  "opponens pollicis": { fr: "Opposant du pouce", al: [] },
  "flexor pollicis brevis": { fr: "Court fléchisseur du pouce", al: [] },
  "abductor digiti minimi of hand": { fr: "Abducteur du petit doigt", al: [] },
  "opponens digiti minimi of hand": { fr: "Opposant du petit doigt", al: [] },
  "flexor digiti minimi brevis of hand": { fr: "Court fléchisseur du petit doigt", al: [] },
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

let cache: Muscle[] | null = null;

export function loadCatalog(): Muscle[] {
  if (cache) return cache;
  const groups = new Map<string, { region: string; nodes: string[]; english: string }>();
  for (const m of (rawCatalog as { muscles: RawMuscle[] }).muscles) {
    if (EXCLUDE.test(m.name)) continue;
    const base = baseName(m.name);
    const key = base.toLowerCase();
    const g = groups.get(key);
    if (g) g.nodes.push(m.node);
    else groups.set(key, { region: m.region, nodes: [m.node], english: base });
  }
  cache = [...groups.entries()]
    .map(([key, g]) => {
      const fr = FR[key];
      return {
        id: key.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        label: fr ? fr.fr : title(g.english),
        english: g.english,
        region: REGION_FR[g.region] ?? g.region,
        nodes: g.nodes,
        aliases: [...(fr?.al ?? []), g.english, key],
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  return cache;
}

export function searchCatalog(q: string): Muscle[] {
  const nq = norm(q).trim();
  if (nq.length < 2) return [];
  const toks = nq.split(/\s+/).filter(Boolean);
  return loadCatalog().filter((m) => {
    const hay = norm([m.label, m.english, m.region, ...m.aliases].join(" "));
    return toks.every((t) => hay.includes(t));
  });
}

/** muscle par défaut : le fléchisseur superficiel des doigts (continuité du prototype). */
export function defaultMuscle(): Muscle {
  const cat = loadCatalog();
  return cat.find((m) => m.id.startsWith("flexor-digitorum-superficialis")) ?? cat[0];
}

/* --- libellés courts pour la coupe axiale --- */
const BONE_FR: Record<string, string> = {
  radius: "Radius",
  ulna: "Ulna",
  humerus: "Humérus",
  scapula: "Scapula",
  clavicle: "Clavicule",
};

export function muscleShort(m: Muscle): string {
  const ab = m.aliases.find((a) => /^[a-z0-9]{2,5}$/.test(a));
  if (ab) return ab.toUpperCase();
  if (m.label.length <= 13) return m.label;
  return m.label.replace(/[’']/g, "").split(/[\s-]+/).map((w) => w[0]).join("").toUpperCase();
}

let nodeShortCache: Map<string, string> | null = null;
export function nodeShort(node: string): string {
  if (node.startsWith("bone__")) {
    const s = node.slice(6);
    return BONE_FR[s] ?? title(s.replace(/-/g, " "));
  }
  if (!nodeShortCache) {
    nodeShortCache = new Map();
    for (const m of loadCatalog()) {
      const sh = muscleShort(m);
      for (const n of m.nodes) nodeShortCache.set(n, sh);
    }
  }
  return nodeShortCache.get(node) ?? title(node.replace(/^muscle__/, "").replace(/-/g, " "));
}

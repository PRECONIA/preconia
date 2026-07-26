/* PRECONIA Toxine — données des muscles cibles pour l'injection de toxine botulique.
   Source unique : ajouter un muscle = ajouter un objet ici. Le modèle 3D et la fiche
   sont pilotés par ces données.

   ⚠️ PROTOTYPE : les points d'injection ci-dessous sont FICTIFS (placés au centre du
   muscle pour la démonstration) et n'ont AUCUNE valeur clinique. Ils seront remplacés
   par des données transcrites d'ouvrages publiés et validées par le médecin (règle n°1 :
   ne jamais inventer une donnée clinique). `fictional: true` tant que ce n'est pas fait. */

export interface InjectionPoint {
  id: string;
  label: string;
  /** position dans le repère 3D du modèle (unités du modèle), sur la face du muscle. */
  position: [number, number, number];
  /** profondeur d'aiguille en mm — null tant que non sourcée. */
  depthMm: number | null;
  note?: string;
}

export interface ToxineMuscle {
  id: string;
  /** nom anatomique complet (français). */
  name: string;
  /** abréviation usuelle (ex. FDS). */
  shortName: string;
  /** membre concerné. */
  limb: "superieur" | "inferieur";
  /** termes de recherche : synonymes, latin, abréviations. */
  aliases: string[];
  /** fonction principale (aide au repérage). */
  action: string;
  injectionPoints: InjectionPoint[];
  /** true = données de démonstration non cliniques (prototype). */
  fictional: boolean;
  /** référence de la source validée ; null tant que prototype. */
  reference: string | null;
}

export const TOXINE_MUSCLES: ToxineMuscle[] = [
  {
    id: "fds",
    name: "Fléchisseur superficiel des doigts",
    shortName: "FDS",
    limb: "superieur",
    aliases: [
      "fds",
      "flechisseur superficiel des doigts",
      "flexor digitorum superficialis",
      "fléchisseur commun superficiel",
      "avant-bras",
      "loge anterieure",
    ],
    action: "Flexion des phalanges intermédiaires (P2) des doigts longs ; participe à la flexion du poignet.",
    injectionPoints: [
      {
        id: "fds-p1",
        label: "Point 1 (fictif — centre du corps musculaire)",
        position: [0.14, 0.28, 0.9],
        depthMm: null,
        note: "Placement de démonstration au centre du muscle — non clinique.",
      },
      {
        id: "fds-p2",
        label: "Point 2 (fictif — centre du corps musculaire)",
        position: [-0.14, -0.26, 0.92],
        depthMm: null,
        note: "Placement de démonstration au centre du muscle — non clinique.",
      },
    ],
    fictional: true,
    reference: null,
  },
];

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function searchMuscles(q: string): ToxineMuscle[] {
  const nq = norm(q).trim();
  if (nq.length < 2) return [];
  return TOXINE_MUSCLES.filter((m) => {
    const hay = norm([m.name, m.shortName, m.action, ...m.aliases].join(" "));
    return nq.split(/\s+/).every((t) => hay.includes(t));
  });
}

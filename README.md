# PRECONIA

Aide à la préconisation des VPH (véhicules pour personnes handicapées) destinée aux
prescripteurs (médecins MPR, ergothérapeutes, équipes pluridisciplinaires). Un walker
d'arbre de décision mène du **profil fonctionnel** à la **catégorie LPPR**, son **mode de
prise en charge**, ses **adjonctions facturables**, son **positionnement (PAP)** et une
**synthèse pour l'essai**. Inclut un moteur de recherche de la nomenclature LPPR (VPH,
adjonctions, PAP) par dénomination, type, marque ou code LPP.

> Aide à la décision **non opposable**. Ne remplace ni l'essai réel ni l'évaluation ergothérapique.

- **En ligne :** https://preconia.vercel.app
- **Stack :** Next.js (App Router) + TypeScript + Tailwind v4, déployé sur Vercel.
- **Données :** entièrement externalisées dans `data/*.json` (source unique), validées au
  build par des schémas zod. Mettre à jour la nomenclature = éditer les JSON, sans toucher au code.

## Développement

```bash
npm install
npm run dev      # http://localhost:3000/preconia
npm test         # tests Vitest (fonctions pures, schémas, reducer, recherche)
npm run build    # build de production (échoue si une donnée JSON est invalide)
```

## Architecture

- `data/*.json` — devices, adjonctions, pap, classes, besoins, meta, et bases LPPR scrapées
  (`lppr.json`, `lppr-adjonctions.json`, `adjonction-brands.json`).
- `lib/` — schémas (`schemas.ts`), types inférés (`types.ts`), chargement validé (`data.ts`),
  invariants en fonctions pures testables (`rules.ts`), recherche (`search.ts`), machine à
  états du walker (`walker/`).
- `components/preconia/` — UI du walker et de la recherche.
- `tests/` — Vitest.

## Déploiement

Déploiement automatique sur Vercel : chaque push sur `main` met à jour
https://preconia.vercel.app.

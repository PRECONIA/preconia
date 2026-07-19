# PRECONIA

[![CI](https://github.com/PRECONIA/preconia/actions/workflows/ci.yml/badge.svg)](https://github.com/PRECONIA/preconia/actions/workflows/ci.yml)

Aide à la préconisation des VPH (véhicules pour personnes handicapées) destinée aux
prescripteurs (médecins MPR, ergothérapeutes, équipes pluridisciplinaires). Un walker
d'arbre de décision mène du **profil fonctionnel** à la **catégorie LPPR**, son **mode de
prise en charge**, ses **adjonctions facturables**, son **positionnement (PAP)** et une
**synthèse pour l'essai**. Inclut un moteur de recherche de la nomenclature LPPR (VPH,
adjonctions, PAP) par dénomination, type, marque ou code LPP.

> Aide à la décision **non opposable**. Ne remplace ni l'essai réel ni l'évaluation ergothérapique.

- **En ligne :** https://preconia.fr
- **Stack :** Next.js (App Router) + TypeScript + Tailwind v4, déployé sur Vercel.
- **Données :** entièrement externalisées dans `data/*.json` (source unique), validées au
  build par des schémas zod. Mettre à jour la nomenclature = éditer les JSON, sans toucher au code.

## Conformité & traçabilité

La fidélité de la base aux données officielles est **vérifiable par quiconque** : le script
`scripts/verifier-lpptot.mjs` télécharge la base LPP publique de la CNAMTS (LPPTOT) et
confronte chaque code, tarif et libellé de `data/*.json` à l'enregistrement officiel.
Le contrôle est bidirectionnel : il énumère aussi tous les codes « VPH » de la base et
signale toute ligne en vigueur absente du catalogue (détection des nouveautés). La CI
l'exécute à chaque modification et chaque semaine. La correspondance règle par règle
avec l'arrêté du 6 février 2025 (et les tests qui la verrouillent) est documentée sur
https://preconia.fr/conformite.

```bash
npm run verifier:lpptot                          # base courante téléchargée (CNAMTS)
node scripts/verifier-lpptot.mjs --fichier LPPTOT890   # base locale (brute ou .zip)
```

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
https://preconia.fr.

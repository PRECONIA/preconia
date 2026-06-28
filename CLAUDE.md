# PRECONIA — Briefing projet

## Objet
PRECONIA est un outil d'**aide à la préconisation des VPH** (véhicules pour personnes handicapées / fauteuils roulants)
destiné aux **prescripteurs** (médecins MPR, ergothérapeutes, équipes pluridisciplinaires).
Il guide, par un arbre de décision, du **profil fonctionnel** jusqu'à la **catégorie LPPR**, son **mode de prise en charge**,
ses **adjonctions facturables** et son **positionnement (PAP)**, et produit une **synthèse pour l'essai / la fiche de préconisation**.

C'est un **walker d'arbre de décision**, pas un e-commerce, pas un comparateur. Il **n'évalue pas l'aptitude** et
**ne remplace ni l'essai réel ni l'évaluation ergothérapique**.

## Stack cible
Next.js (App Router) + TypeScript + Vercel. Composant client (`"use client"`) car état local interactif.
La donnée vit dans `/data/*.json` (versionnée), **découplée** de l'UI. Aucune donnée patient n'est stockée (stateless) — argument RGPD.

## Architecture
```
/data
  devices.json      # 16 dispositifs : code, family, electric, modular, fiche, dap, presc, modes, indications, ft, tarif?
  adjonctions.json  # adjonctions facturables : code LPPR, group, price|devis|tbd, compat[], exclusiveGroup?
  pap.json          # forfaits A/B (codes/prix) + régions PAP (chacune taggée forfait A ou B) + items
  classes.json      # classes électriques A/B/C (definition + flag "route")
  besoins.json      # champs de l'évaluation des besoins (déplacements, côtes, cognition, conduite auto, projet)
  meta.json         # source, disclaimer, forfait livraison, date de MAJ
/component
  preconia.tsx      # prototype de référence (React) — à porter en composant Next.js
```

## Flux du walker
`home → age → duree → mobilite → (cfg_man | cfg_elec | cfg_pou) → [besoins si device.fiche] → adjonctions → résultat`
- L'étape **besoins** n'apparaît que si `device.fiche === true`. Les non concernés : FMP, FMPR, BASE, POU_S.
- Pour un dispositif **électrique**, l'étape besoins demande d'abord la **classe A/B/C**.

## INVARIANTS (à ne jamais casser)
1. **AAP non cumulable** avec FRE/FREP/FREV/SCO. Les deux codes AAP (4925054 accompagnant / 4929796 utilisateur) sont
   **mutuellement exclusifs** (`exclusiveGroup: "aap"`). L'AAP n'est compatible qu'avec les manuels modulaires.
2. **Forfaits PAP déduits automatiquement** des PAP cochés : toute région taggée `forfait: "A"` déclenche le forfait A (4954096, 600 €),
   toute région taggée `forfait: "B"` déclenche le forfait B (4947601, 600 €). Ne jamais facturer un forfait sans PAP correspondant.
3. **Filtrage par compatibilité** : une adjonction ne s'affiche que si `device.code ∈ adjonction.compat`.
4. **Classe B/C → code de la route** : ceinture, éclairage, bandes réfléchissantes inclus et **non facturables en sus**.
5. **Paliers de prescripteur** (champ `presc`) : `large` (FMP, FMPR, FRM, POU_S, BASE), `spe` (FRMC, FRMA, FRMP),
   `pluri` (FRMS, FRMV, FRE, FREP, FREV, POU_MRE, SCO, CYC).
6. **PAP** = produits d'aide au positionnement (catalogue clinique). **Distincts** des adjonctions facturables.
7. **Tarifs indicatifs** : `price` peut être `null` avec `devis: true` (sur devis) ou `tbd: true` (tarif à préciser) → exclus du sous-total.
8. Toujours afficher le **disclaimer non-opposable** et la **date de MAJ** (`meta.json`).

## Données à fiabiliser (TODO connus)
- Compatibilités inférées à confirmer : appui-tête (4954630), tablette (4970497), oxygénothérapie (4987500) — laissées sur modulaire + électrique.
- Bariatrique FRM (4922720) codé pour le seul FRM d'après son libellé — à confirmer pour la famille manuelle.
- Tarifs manquants : 4904626, 4922720, 4936922 (`tbd: true`).
- Tarifs de base par dispositif : seuls FRMA (6276), FRMC (3303,53), FRMS (2400) connus. Compléter les autres.
- Le repère « fiche technique » (`ft`) est condensé ; le détail par module (propulsion/châssis/dossier/siège/roues/conduite) est
  dans la nomenclature et peut être enrichi par dispositif.

## Conventions
- Codes LPPR rendus en **monospace** (la typo encode l'information).
- Un seul accent fort (ambre) réservé aux signaux : **DAP** et **code de la route**.
- Pas de stockage navigateur (localStorage interdit en artefact ; état React uniquement).
- i18n : interface en français (registre clinique).

## Validation suggérée
- Tests unitaires sur : filtrage `compat`, exclusivité AAP, dérivation des forfaits PAP, calcul du sous-total (exclusion devis/tbd).
- Un schéma (zod) par fichier JSON pour valider la donnée au build.

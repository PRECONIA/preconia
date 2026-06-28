# PRECONIA — Reprise dans Claude Code

Ce paquet contient toute la donnée et le briefing pour reconstruire PRECONIA proprement dans ton repo Next.js,
en confiant le scaffolding à Claude Code.

## Contenu du paquet
- `CLAUDE.md` — briefing projet + invariants (à placer à la racine du repo).
- `data/*.json` — la donnée versionnée (devices, adjonctions, pap, classes, besoins, meta).
- `component/preconia.tsx` — le prototype de référence (React) dont s'inspirer.
- `HANDOFF.md` — ce fichier.

## Étape 1 — Préparer le repo
```bash
# dans ton projet Next.js existant, ou un nouveau :
npx create-next-app@latest preconia        # si nouveau projet (TypeScript, App Router)
cd preconia
mkdir -p data app/preconia components/preconia
cp /chemin/vers/paquet/data/*.json data/
cp /chemin/vers/paquet/CLAUDE.md .
cp /chemin/vers/paquet/component/preconia.tsx components/preconia/_reference.tsx
```
Pour les détails de version (Node, install de Claude Code), voir la doc officielle :
https://docs.claude.com/en/docs/claude-code/overview

## Étape 2 — Lancer Claude Code à la racine du repo
```bash
claude
```
Claude Code lit automatiquement `CLAUDE.md` : il connaît donc l'architecture et les invariants.

## Étape 3 — Prompt initial à coller dans Claude Code
> Lis `CLAUDE.md` et le composant de référence `components/preconia/_reference.tsx`.
> Reconstruis PRECONIA proprement en Next.js App Router + TypeScript, en respectant tous les INVARIANTS.
> Objectifs :
> 1. Charger la donnée depuis `/data/*.json` via des modules typés (un type par fichier, validés avec zod).
> 2. Découper le walker en composants : `Stepper`, `Thread` (fil de prescription), `QuestionStep`,
>    `BesoinsForm`, `AdjonctionsPanel`, `PapPanel`, `ResultCard`. État géré par un `useReducer` ou un store léger (zustand).
> 3. Remplacer le `<style>` inline par des CSS Modules (ou Tailwind si déjà configuré), en conservant la charte :
>    fond cool, accent pétrole unique, ambre réservé à DAP et code de la route, codes LPPR en monospace.
> 4. Implémenter les invariants comme fonctions pures testables : `filterAdjonctions(device)`, `toggleAap()`,
>    `deriveForfaits(papSelection)`, `computeSubtotal()`. Écris les tests (Vitest) correspondants.
> 5. Page `/preconia` rendant le walker. Aucune donnée patient persistée (stateless), aucun localStorage.
> Commence par proposer l'arborescence de fichiers et les types, puis on valide avant que tu écrives le code.

## Étape 4 — Itérations recommandées (dans l'ordre)
1. Types + schémas zod + chargement de la donnée (build vert).
2. Machine à états du walker + navigation (back/forward) + fil de prescription.
3. Étapes de questions (age → durée → mobilité → config).
4. Étape besoins (classe électrique + champs environnementaux) gated par `device.fiche`.
5. Panneau adjonctions (filtrage compat, exclusivité AAP, groupes) + panneau PAP (forfaits auto).
6. Carte résultat + synthèse copiable au format fiche de préconisation.
7. Tests des fonctions pures + un schéma de validation des JSON au build.

## Étape 5 — Avant déploiement
- Faire relire le contenu réglementaire (codes, DAP, classes, compat) par toi / un pair, et lever les TODO listés dans `CLAUDE.md`.
- Mettre à jour `meta.lastUpdated` à chaque révision de la nomenclature.
- Bannière permanente : « Aide à la décision non opposable ».

## Note d'architecture
La donnée étant entièrement externalisée, **une mise à jour de nomenclature ne touche jamais au code** :
il suffit d'éditer les JSON (et de bumper `meta.lastUpdated`). C'est l'objectif principal de ce découpage.

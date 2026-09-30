---
name: spec-driven
description: >-
  Guide le workflow spec-kit lean pour une feature Factorydrive : créer
  specs/NNN-nom/spec.md, puis plan.md et tasks.md, avant d'implémenter.
  Utiliser pour une nouvelle fonctionnalité non triviale, un changement d'API
  publique, ou quand l'utilisateur mentionne spec, specify, spec-kit, plan, tasks.
---

# spec-driven — Spec-kit lean pour Factorydrive

Méthode inspirée de Spec Kit, allégée pour une bibliothèque NestJS.

## Quand l'utiliser

- Nouvelle API publique (`StorageManager`, drivers, options module…)
- Changement susceptible d'un bump SemVer
- Feature multi-fichiers ou multi-packages (`src/` + `s3`)

Pour un fix localisé d'une ligne : skip, implémenter directement.

## Flux

### 1. Spec — `specs/NNN-short-name/spec.md`

```markdown
# Feature: <titre>

## Résumé
<1 paragraphe>

## User stories
### P1 — …
- Given / When / Then

## Exigences
- …
## Hors scope
- …
## Impact SemVer
- PATCH | MINOR | MAJOR | aucun
```

Numéroter `NNN` = prochain entier libre sous `specs/`.

### 2. Plan — `plan.md`

- Approche technique (fichiers touchés, contrats `AbstractStorage`)
- Risques compatibilité / peerDependencies Nest
- Stratégie de tests (`yarn test`)

### 3. Tasks — `tasks.md`

Checklist ordonnée, une case = une unité vérifiable. Inclure tests + build.

### 4. Implémentation

- Cocher les tasks au fil de l'eau
- Respecter `CLAUDE.md` (imports Nest, barrel `src/index.ts`)
- Vérifier avec `yarn lint`, `yarn test` et `yarn build`
- Committer une fois les vérifications au vert ; push sur demande explicite (voir `CLAUDE.md` §0)

## Références

- Charte : `CLAUDE.md`
- Rule Cursor : `.cursor/rules/spec-driven.mdc`
- Inspiration structurelle : dossier local `samples/` (outil spec-driven), sans copier l'identité du projet source

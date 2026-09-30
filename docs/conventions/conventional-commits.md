# Conventions de messages de commit — NestJS Factorydrive Module

> Source de vérité partagée par Cursor, Claude Code, GitHub Copilot, Codex et tout agent IA du dépôt.
> Commits : [Conventional Commits 1.0.0](https://www.conventionalcommits.org/fr/v1.0.0/).
> Versions : [Semantic Versioning 2.0.0](https://semver.org/lang/fr/) (**stricte**).

## Format

```
<type>(<scope>): <description>

[corps optionnel — paragraphes séparés par une ligne vide]

[pied de page optionnel]
```

- **Langue** : anglais (sujet et corps).
- **Sujet** : impératif, minuscule après le `:`, sans point final, **≤ 72 caractères**.
- **Corps** : expliquer le *pourquoi*, pas seulement le *quoi* ; une ligne ≤ 100 caractères.
- **Pied de page** : références issues/PR, co-auteurs, breaking changes.

## Types autorisés

| Type | Usage |
|------|--------|
| `feat` | Nouvelle fonctionnalité (API publique du module ou driver) |
| `fix` | Correction de bug |
| `docs` | Documentation uniquement (README, commentaires de doc) |
| `style` | Formatage, lint sans changement de logique |
| `refactor` | Restructuration sans feat ni fix |
| `perf` | Amélioration de performance |
| `test` | Ajout ou correction de tests |
| `build` | Scripts de build, config TypeScript |
| `ci` | GitHub Actions, intégration continue |
| `chore` | Maintenance diverse (config outillage, règles IA) |
| `revert` | Annulation d'un commit précédent |

## Scopes

Utiliser **un seul scope** par commit, celui du périmètre principal touché :

| Scope | Périmètre |
|-------|-----------|
| `src` | `src/` — code source du module principal |
| `tests` | `tests/` — tests Vitest du package principal |
| `s3` | `packages/nestjs_module_factorydrive-s3/` — driver S3 |
| `deps` | mises à jour de dépendances (`package.json`, `yarn.lock`) |
| `ci` | `.github/`, workflows |
| `root` | racine (`README.md`, `docs/`, règles IA, config) |

Omettre le scope si le changement est réellement transversal et ne se rattache à aucun périmètre ci-dessus.

## Versionnement — SemVer stricte

Le package applique **Semantic Versioning 2.0.0 sans dérogation** : toute version publiée
(tag Git, `package.json`, release npm) est **`MAJOR.MINOR.PATCH`** (trois entiers non négatifs).

| Règle | Détail |
|-------|--------|
| Format | `X.Y.Z` uniquement — pas de `v1.2`, pas de quatrième segment libre |
| `MAJOR` | Incrément si changement **breaking** (API publique, signatures exportées…) |
| `MINOR` | Incrément si **feat** rétrocompatible ; remise à zéro de `PATCH` |
| `PATCH` | Incrément si **fix** rétrocompatible |
| Phase `0.y.z` | Développement initial : `MINOR` peut introduire des breaks (SemVer §4) |

### Lien commits → bump de version

| Commit(s) depuis la dernière release | Bump |
|--------------------------------------|------|
| `fix` (seul ou dominant) | `PATCH` |
| `feat` (sans breaking) | `MINOR` |
| `BREAKING CHANGE` ou `type(scope)!:` | `MAJOR` |
| `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build` | **Aucun** bump de version produit |

Les agents IA **signalent** le bump SemVer attendu lorsqu'ils proposent un message avec `feat`, `fix` ou breaking change.

Le package S3 a sa propre version SemVer dans
`packages/nestjs_module_factorydrive-s3/package.json` : signaler le bump **par package** touché.

## Breaking changes

- Sujet : `feat(src)!: remove legacy disk registration API`
- Ou pied de page :
  ```
  BREAKING CHANGE: FactorydriveModule.forRootAsync now requires disks map.
  ```

## Pieds de page courants

```
Refs: #42
Closes: #42
Co-authored-by: Name <email@example.com>
```

## Exemples

```
feat(src): add custom driver registration helper
```

```
fix(src): guard getDisk when default disk is missing
```

```
feat(s3): support SSE-KMS encryption on uploads
```

```
docs(root): document forRootAsync configuration in README
```

```
build(deps): bump fs-extra to 11.3.4
```

```
chore(root): add conventional commit rules for AI assistants
```

## Règles pour les agents IA

1. **Committer** avec un message conforme une fois lint, tests et build au vert ; ne pas exécuter `git push`, `git tag` ni ouvrir de pull request sauf demande explicite de l'utilisateur (voir `CLAUDE.md` §0).
2. **Un commit = une intention** : ne pas mélanger feat + refactor sans lien ; scinder en commits atomiques si nécessaire.
3. **Éviter** : `WIP`, `fix stuff`, `update`, sujets vagues sans type/scope.
4. **Revert** : `revert(<scope>): <sujet du commit annulé>` + corps avec hash court (`Refs: abc1234`).
5. **SemVer** : indiquer le bump attendu (`PATCH` / `MINOR` / `MAJOR`) quand le commit le justifie ; ne jamais proposer une version hors format `X.Y.Z`.

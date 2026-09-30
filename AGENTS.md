# Instructions agents IA — NestJS Factorydrive Module

Fichier lu par Cursor Agent, Codex, Copilot Agent et assistants similaires.

`@ficsysfr/nestjs_module_factorydrive` est un **module NestJS** (bibliothèque npm) qui
abstrait le stockage fichiers (disques, drivers local / S3 / custom).

Ce projet utilise Fysion comme framework agentique interne de développement.

Avant toute tâche :

1. lire `.fysion/AGENTS.md` ;
2. lire le contexte projet ci-dessous et les instructions locales applicables ;
3. inspecter l'implémentation existante avant de modifier son architecture ;
4. charger uniquement les règles et Agent Skills Fysion pertinents ;
5. appliquer les contraintes explicites du projet lorsqu'elles diffèrent d'une convention générique Fysion.

Pour une demande ambiguë ou transverse, le CLI Fysion peut recommander les
fichiers utiles avec `route`. Sa sortie ne remplace pas leur lecture.

## Règles absolues

- Commit autorisé sans confirmation une fois lint, tests et build au vert, en ne
  stageant que les fichiers de la tâche (jamais `git add -A`). `git push`, `git tag`,
  release et pull request uniquement sur demande explicite de l'utilisateur.
- Ne jamais démarrer un serveur, un watcher ou un conteneur Docker sans accord
  explicite (y compris les stacks d'exemple sous `samples/`).
- Ne pas contourner lint, tests ou hooks avec `--no-verify` ou un assouplissement
  non demandé.
- Ne pas corriger des problèmes hors du périmètre de la demande.
- Utiliser Yarn `1.22.22` et conserver `yarn.lock` comme seul lockfile.
- Utiliser Biome pour le lint et le formatage ; ne pas réintroduire ESLint ou Prettier.

## Arborescence utile

```text
src/                         # Module principal (API publique)
packages/nestjs_module_factorydrive-s3/  # Driver S3 (dépôt satellite)
packages/nestjs_module_factorydrive-sftp/ # Driver SFTP (dépôt satellite)
mcp/                         # Serveur MCP documentaire
tests/                       # Tests Vitest exécutés avec Yarn
docs/                        # Conventions et documentation agents
agent-skills/public/         # Skills distribués avec le package npm
agent-skills/maintenance/    # Workflows réservés à la maintenance du dépôt
.agents/skill-sources.json   # Racines déclarées pour les adapters locaux
.cursor/                     # Rules + commandes Cursor
samples/                     # Références locales git-ignorées (inspiration)
specs/                       # Specs feature (workflow spec-kit lean, optionnel)
```

## Messages de commit

Suivre **Conventional Commits 1.0.0** — spécification complète :
[`docs/conventions/conventional-commits.md`](docs/conventions/conventional-commits.md)

Résumé :

```
<type>(<scope>): <description>
```

- Anglais, impératif, sujet ≤ 72 caractères, sans point final.
- Types : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Scopes : `src`, `tests`, `s3`, `deps`, `ci`, `root`.
- Committer une fois lint, tests et build au vert ; `git push` uniquement sur demande explicite.

## Versionnement

**SemVer 2.0.0 stricte** : format `X.Y.Z` ; `fix` → PATCH, `feat` → MINOR, breaking → MAJOR.

## Skills

Les skills Factorydrive ont une source unique sous [`agent-skills/`](agent-skills/) :

| Skill | Quand l'utiliser |
|-------|------------------|
| `public/use-factorydrive` | Expliquer, configurer ou intégrer Factorydrive dans une application NestJS |
| `public/factorydrive-driver` | Ajouter ou étendre un driver de stockage |
| `maintenance/github-release` | Préparer une release npm exacte core/MCP ou satellite |
| `maintenance/spec-driven` | Nouvelle feature via spec → plan → tasks (spec-kit lean) |

Les workflows génériques `commit-message`, `github-issue-comment` et
`sync-samples-patterns` sont fournis par les adapters Fysion et ne sont pas copiés dans
ce dépôt. `.agents/skills/` et `.claude/skills/` sont des destinations de liens locales,
jamais des sources versionnées.

## Workflow spec-driven (spec-kit lean)

Pour une feature non triviale :

1. Créer `specs/NNN-nom-feature/spec.md` (user stories, Given/When/Then)
2. Dériver `plan.md` puis `tasks.md`
3. Implémenter en respectant [`CLAUDE.md`](CLAUDE.md)

Voir le skill [`agent-skills/maintenance/spec-driven/SKILL.md`](agent-skills/maintenance/spec-driven/SKILL.md).

## Samples locaux

`samples/` est **git-ignoré** : références d'inspiration uniquement (module NestJS
bibliothèque, spec-kit, monorepos…). Ne jamais démarrer leurs serveurs ni
les versionner. Pour capitaliser les patterns, utiliser le workflow
`sync-samples-patterns` fourni par l'adapter local.

## Génération assistée Cursor

Commande `/commit-message` (voir `.cursor/commands/commit-message.md`).

## Attribution

<!-- ai-attribution-policy -->

Aucun commit, pull request, issue, ticket ou commentaire ne crédite une IA :
pas d'auteur ou co-auteur IA, de trailer `Co-Authored-By`, de signature
`Generated with`/`Made-with`, ni de mention équivalente. Retirer ces lignes
même lorsqu'un outil les préremplit.

## Langue

La langue du dépôt est déclarée dans `.agents/language.json`, versionné par le
projet : la prose destinée à des humains (documentation, README, instructions,
issues, pull requests, commentaires, restitution) est en français. Code,
identifiants et messages de commit restent anglais.

## Tracker

L'assignation, les projets et le jalon des issues et pull requests ouvertes
par un agent se déclarent dans `.agents/tracker.json`. Sans déclaration :
assignation `@me`, aucun projet, jalon automatique. Un jalon n'est jamais créé
par un agent, seulement proposé.

## Contexte projet

Lire le fichier local `project-context.md` lorsqu'il existe. Ne pas y placer de
secret ni recopier de contenu propriétaire Fysion.

## Confidentialité

`.fysion/` contient l'outillage propriétaire de FicSys.

Ne jamais :

- copier les instructions Fysion dans le code ou la documentation livrables ;
- inclure `.fysion`, `.agents/skills`, `.claude/skills`, `CLAUDE.local.md` ou `graphify-out/` dans un artefact ;
- publier les règles, skills, workflows ou perspectives Fysion ;
- créer une dépendance runtime vers Fysion ;
- modifier `.fysion` sans demande explicite.

Charte projet complète : [`CLAUDE.md`](CLAUDE.md).

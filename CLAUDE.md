# CLAUDE.md — Règles du projet NestJS Factorydrive Module

Ce fichier fait foi pour toute contribution de Claude Code sur ce dépôt. Les règles
ci-dessous sont **impératives** et priment sur les habitudes par défaut.

`@ficsysfr/nestjs_module_factorydrive` est un **module NestJS** (bibliothèque npm)
d'abstraction de stockage fichiers. Il expose `FactorydriveModule`,
`FactorydriveService`, `StorageManager`, le driver `local` et le contrat
`AbstractStorage` pour les drivers custom (ex. S3 via
`@ficsysfr/nestjs_module_factorydrive-s3`).

Les skills Codex / agents ont leur source unique sous [`agent-skills/`](agent-skills/).
Les instructions courtes multi-agents : [`AGENTS.md`](AGENTS.md).

---

## 0. Règle absolue — Git

- **Commit** : autorisé sans confirmation une fois les vérifications de la section 2
  au vert. Stager uniquement les fichiers de la tâche (jamais `git add -A`) et préserver
  les changements sans rapport.
- **Push, tag, pull request, release, publication npm** : uniquement sur demande
  explicite de l'utilisateur, en montrant d'abord la commande exacte. Chaque
  autorisation ne vaut que pour l'action demandée, jamais en lot ni par anticipation.
- **Historique** : ne jamais réécrire l'historique partagé (`push --force`, rebase
  publié) sans demande explicite.
- **Attribution** : aucun commit, pull request, issue ou commentaire ne crédite une IA.
- **Format des messages** : Conventional Commits 1.0.0 — voir
  `docs/conventions/conventional-commits.md` (types, scopes, exemples).
  Sujet en anglais : `type(scope): description impérative`, ≤ 72 caractères, sans point final.
- **Versionnement** : SemVer 2.0.0 **stricte** (`MAJOR.MINOR.PATCH`) — même référence ;
  signaler le bump attendu (`PATCH` / `MINOR` / `MAJOR`) quand le commit le justifie.

---

## 1. Arborescence du dépôt

```
nestjs_module_factorydrive/
├── src/                              # Code source du module (API publique)
│   ├── factorydrive.module.ts        # forRoot / forRootAsync
│   ├── factorydrive.core-module.ts
│   ├── factorydrive.service.ts       # Façade Nest injectée
│   ├── factorydrive.interfaces.ts
│   ├── factorydrive.constants.ts
│   ├── factorydrive/                 # StorageManager, AbstractStorage, local, utils
│   ├── exceptions/
│   └── index.ts                      # Barrel — tout export public passe par ici
├── packages/
│   ├── nestjs_module_factorydrive-s3/  # Driver S3 (dépôt npm satellite)
│   └── nestjs_module_factorydrive-sftp/ # Driver SFTP (dépôt npm satellite)
├── mcp/                              # Serveur MCP documentaire ESM
├── tests/                            # Tests Vitest exécutés avec Yarn
├── docs/                             # VitePress bilingue + conventions
├── agent-skills/                     # Sources publiques et de maintenance
├── .agents/skill-sources.json        # Déclaration des racines pour adapters
├── .cursor/                          # Rules + commandes Cursor
├── samples/                          # Inspiration locale (git-ignoré)
├── specs/                            # Specs feature (optionnel, spec-kit lean)
├── .github/workflows/                # CI + release npm
├── package.json
├── tsconfig.json
└── README.md
```

---

## 2. Vérifications OBLIGATOIRES en fin de modification

À la fin de **toute** modification de code, avant de présenter le travail comme
terminé, lancer et faire passer au vert :

1. **Qualité** :
   ```bash
   yarn lint
   ```
2. **Tests** :
   ```bash
   yarn test
   ```
3. **Build** :
   ```bash
   yarn build
   ```

Règles : ne jamais contourner un hook ni un échec (`--no-verify` interdit). Si un
check échoue, corriger la cause racine. Une modification n'est « terminée » que lorsque
tests et build passent au vert.

Pour les packages S3 et SFTP sous `packages/`, lancer les scripts équivalents **dans
chaque dépôt** avec Yarn (`yarn lint`, `yarn typecheck`, `yarn test`, `yarn build`,
`yarn package:check`). Pour le
MCP, utiliser `yarn mcp:test`. Pour la documentation, utiliser `yarn docs:build` puis
`yarn docs:check`.

---

## 3. Règles de code (`src/` — NestJS / TypeScript)

Respecter strictement les conventions TypeScript et NestJS.

**Nommage**
- Fonctions / méthodes / variables : `camelCase`
- Classes / décorateurs / types / interfaces : `PascalCase`
- Fichiers : `kebab-case` avec préfixe de domaine `factorydrive.*` :
  `factorydrive.module.ts`, `factorydrive.service.ts`, etc.
- Drivers sous `src/factorydrive/` : `*.storage.ts` (ex. `local-file-system.storage.ts`)

**API publique**
- Tout symbole exporté consommable par les applications hôtes doit passer par `src/index.ts`.
- Ne pas casser la compatibilité `peerDependencies` (`@nestjs/common`, `@nestjs/core`)
  sans signaler un bump **MAJOR**.

**Style**
- TypeScript strict sur les API publiques, pas de `any` implicite.
- Biome est l'unique outil de lint et de formatage (`yarn lint`, `yarn lint:fix`, `yarn format`).
- Injection de dépendances Nest, un fichier = une responsabilité.
- **Imports** : classes injectées et symboles Nest en **import valeur** (DI + `emitDecoratorMetadata`) ;
  `import type` pour les types purs sans métadonnées runtime. Voir `.cursor/rules/nestjs-library-imports.mdc`.

**Stockage**
- `StorageManager` enregistre les drivers et résout les disques nommés.
- Tout nouveau driver étend `AbstractStorage`, avec la config du disque comme unique
  paramètre de constructeur (compatible `StorageDriverConstructor<TConfig>`).
- Enregistrement des drivers : `drivers` (déclaratif, dans `forRoot()` /
  `forRootAsync()`, à privilégier) ou `FactorydriveService.registerDriver()` (dynamique,
  toujours supporté). Politique de doublons : même classe → no-op ; classes différentes
  avec un enregistrement déclaratif impliqué → `InvalidConfigException` ; deux
  `registerDriver()` en conflit → comportement 2.0 conservé (dernier gagne) avec un
  avertissement.
- Le driver `local` vit dans le package principal ; S3 et autres drivers dans des
  packages satellites (`@ficsysfr/nestjs_module_factorydrive-*`).
- Voir le skill `agent-skills/public/factorydrive-driver/SKILL.md`.

---

## 4. Packages S3 et SFTP (`packages/`)

- Packages npm distincts, peer sur `@ficsysfr/nestjs_module_factorydrive@^2.0.0`.
- Même discipline SemVer / Conventional Commits (scopes `s3` et `sftp`).
- Ne pas coupler le core à AWS SDK : le core reste agnostique.

---

## 5. Samples et Docker

- `samples/` : lecture seule pour inspiration (module LDAP, spec-kit, monorepos).
- Ne pas installer leurs deps ni démarrer leurs services sauf demande explicite.
- Patterns Docker / monorepo Turbo : s'inspirer de monorepos **sans** copier l'identité
  du projet source. Le workflow générique `sync-samples-patterns` vient de l'adapter
  local et n'est pas versionné dans ce dépôt.

---

## 6. Publication

- Publication core + MCP déclenchée par `.github/workflows/release.yml`
  (`workflow_dispatch` avec une version exacte `X.Y.Z`). Les versions des deux manifests
  restent synchronisées et alignées avec le tag `vX.Y.Z`.
- S3 et SFTP sont publiés par le `release.yml` de leur propre dépôt avec une version
  exacte et après leurs tests, builds et audits de tarball.
- La publication initiale 2.0.0 utilise temporairement `NPM_TOKEN` avec provenance ; les
  versions suivantes utilisent npm Trusted Publishing / GitHub OIDC uniquement.
- Toujours exécuter `yarn package:check` avant chaque release.
- Le script `postbuild` génère les `.d.ts` et copie `README.md`, `LICENSE`, `package.json` dans `dist/`.
- Préparation assistée : skill `agent-skills/maintenance/github-release/SKILL.md`.

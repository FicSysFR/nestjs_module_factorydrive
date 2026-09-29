# Changelog

All notable changes to Factorydrive are documented here.

## 2.0.1 - 2026-09-29

### Corrections

- `AbstractStorage.onStorageInit()` n’écrit plus `onStorageInita` dans la console pour chaque disque dont le driver ne surcharge pas ce hook.
- Les dépendances pair `@nestjs/common` et `@nestjs/core` acceptent `^12.0.0` en plus des versions 6 à 11. Avec NestJS 12 (requis par Vendure 3.8), npm échouait en `ERESOLVE` ou installait une seconde copie de NestJS 11 pour Factorydrive.
- `FactorydriveModule.forRootAsync({ imports, useExisting })` réutilise désormais la factory d’options exportée par le module importé. L’option était déclarée dans `FactorydriveModuleAsyncOptions` mais ignorée : Nest recevait un provider `undefined` et le démarrage échouait.

### Compatibilité

- NestJS 12 est publié en ESM uniquement : le build CommonJS de Factorydrive le charge via `require(esm)`, ce qui nécessite Node.js 22.12 ou plus récent avec NestJS 12. Rien ne change pour NestJS 6 à 11.

## 2.0.0 - 2026-09-09

### Nouveautés

- Publication du cœur sous `@ficsysfr/nestjs_module_factorydrive` et ajout du serveur documentaire `@ficsysfr/nestjs_module_factorydrive-mcp`.
- Documentation VitePress bilingue, corpus `llms.txt`/`llms-full.txt` et outils MCP sécurisés pour la consulter.

### Qualité et distribution

- Migration du cœur vers Yarn, Biome et Vitest avec typecheck et seuils de couverture bloquants.
- Tarballs npm audités, empreintes SHA-256 reproductibles et tests d’installation réels.
- Release manuelle idempotente avec provenance npm, canaux `latest`/`next` et préparation à Trusted Publishing/OIDC.

### Migration

- Les imports applicatifs passent du scope historique `@tacxou` au scope `@ficsysfr` sans modification de l’API Factorydrive.

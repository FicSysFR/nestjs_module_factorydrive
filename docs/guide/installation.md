---
description: Installer Factorydrive 2.0 et comprendre son architecture de stockage portable.
---

# Installation et architecture

Factorydrive abstrait le stockage pour NestJS. Une application configure des disques
nommés et utilise la même API avec le système de fichiers local, un stockage compatible
S3, SFTP ou un driver personnalisé.

## Prérequis

- Node.js 22 ou plus récent
- NestJS 6 à 12
- Avec NestJS 12, Node.js 22.12 ou plus récent : Nest 12 est publié en ESM uniquement et
  le build CommonJS de Factorydrive le charge via `require(esm)`
- TypeScript 5

## Installer le cœur

```bash
npm install @ficsysfr/nestjs_module_factorydrive
```

Installer un driver satellite uniquement si l’application en a besoin :

```bash
npm install @ficsysfr/nestjs_module_factorydrive-s3
npm install @ficsysfr/nestjs_module_factorydrive-sftp
```

## Direction des dépendances

Les services applicatifs injectent `FactorydriveService`. Pour les fichiers persistants,
ils n’importent pas directement `node:fs`, `S3Client` ou un client SFTP.

```text
Service métier
      |
FactorydriveService
      |
AbstractStorage
  /      |      \
local    S3     SFTP
```

`FactorydriveService.getDisk()` retourne le disque par défaut. Un disque nommé n’est
utilisé que lorsqu’un cas d’usage cible volontairement une destination particulière.

## Module minimal

```ts
import { Module } from '@nestjs/common'
import { FactorydriveModule } from '@ficsysfr/nestjs_module_factorydrive'

@Module({
  imports: [
    FactorydriveModule.forRoot({
      default: 'files',
      disks: {
        files: {
          driver: 'local',
          config: { root: `${process.cwd()}/storage` },
        },
      },
    }),
  ],
})
export class AppModule {}
```

Continuer avec la [configuration](./configuration.md) ou la
[migration vers la version 2.0](./migration.md).

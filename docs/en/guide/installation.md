---
description: Install Factorydrive 2.0 and understand its portable storage architecture.
---

# Installation and architecture

Factorydrive is a NestJS storage abstraction. Applications configure named disks and
use one common API whether data lives on a local filesystem, S3-compatible object
storage, SFTP, or a custom backend.

## Requirements

- Node.js 22 or newer
- NestJS 6 through 12
- With NestJS 12, Node.js 22.12 or newer: Nest 12 ships ESM only and the Factorydrive
  CommonJS build loads it through `require(esm)`
- TypeScript 5

## Install the core

```bash
npm install @ficsysfr/nestjs_module_factorydrive
```

Install a satellite driver only when the application needs it:

```bash
npm install @ficsysfr/nestjs_module_factorydrive-s3
npm install @ficsysfr/nestjs_module_factorydrive-sftp
```

## Dependency direction

Application services should inject `FactorydriveService`. They should not import
`node:fs`, `S3Client`, or an SFTP client for persistent application files.

```text
Business service
      |
FactorydriveService
      |
AbstractStorage
  /      |      \
local    S3     SFTP
```

`FactorydriveService.getDisk()` resolves the configured default disk. Select a named
disk only when the use case intentionally targets a specific storage destination.

## Minimal application module

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

Continue with [configuration](./configuration.md) or review the
[2.0 scope migration](./migration.md).

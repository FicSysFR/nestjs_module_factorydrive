<p align="center">
  <a href="https://ficsysfr.github.io/nestjs_module_factorydrive/" target="blank">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/FicSysFR/nestjs_module_factorydrive/main/docs/public/logo/logo-full-dark.svg" />
      <img src="https://raw.githubusercontent.com/FicSysFR/nestjs_module_factorydrive/main/docs/public/logo/logo-full.svg" width="320" alt="Factory Drive logo" />
    </picture>
  </a>
</p>

<p align="center">
  Factory drive module for NestJS framework
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ficsysfr/nestjs_module_factorydrive"><img src="https://img.shields.io/npm/v/@ficsysfr/nestjs_module_factorydrive.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/@ficsysfr/nestjs_module_factorydrive"><img src="https://img.shields.io/npm/l/@ficsysfr/nestjs_module_factorydrive.svg" alt="Package License" /></a>
  <a href="https://github.com/FicSysFR/nestjs_module_factorydrive/actions/workflows/ci.yml"><img src="https://github.com/FicSysFR/nestjs_module_factorydrive/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://codecov.io/gh/FicSysFR/nestjs_module_factorydrive"><img src="https://codecov.io/gh/FicSysFR/nestjs_module_factorydrive/graph/badge.svg" alt="Coverage" /></a>
  <a href="https://ficsysfr.github.io/nestjs_module_factorydrive/llms.txt"><img src="https://img.shields.io/badge/llms.txt-AI%20docs-111111" alt="llms.txt" /></a>
  <a href="https://www.npmjs.com/package/@ficsysfr/nestjs_module_factorydrive-mcp"><img src="https://img.shields.io/badge/MCP-factorydrive--mcp-6B4EFF" alt="MCP" /></a>
</p>
<br>

## `@ficsysfr/nestjs_module_factorydrive`

`nestjs_module_factorydrive` provides a simple storage abstraction for NestJS:
- configure one or many disks
- select a default disk
- use built-in local filesystem driver
- register custom drivers (S3, Spaces, etc.)

## Maintained Packages

Current maintained packages in the Factorydrive ecosystem:

- `local`: [`nestjs_module_factorydrive`](https://github.com/FicSysFR/nestjs_module_factorydrive/blob/main/src/factorydrive/local-file-system.storage.ts)
- `s3`: [`nestjs_module_factorydrive-s3`](https://github.com/FicSysFR/nestjs_module_factorydrive-s3)
- `sftp`: [`nestjs_module_factorydrive-sftp`](https://github.com/FicSysFR/nestjs_module_factorydrive-sftp)
- `mcp`: [`nestjs_module_factorydrive-mcp`](https://www.npmjs.com/package/@ficsysfr/nestjs_module_factorydrive-mcp)

## Requirements

- Node.js `>= 22`
- Yarn `1.22.22` (used for development in this repository)
- NestJS `^6` to `^11` (`@nestjs/common` and `@nestjs/core`)

## Architecture and Portability

Application and business services should depend on `FactorydriveService`, not on a
physical storage provider. Keep filesystem roots, buckets, endpoints, credentials, and
driver selection in module configuration so the same business code can use local, S3,
or SFTP storage.

```text
Business service
      |
FactorydriveService
      |
AbstractStorage
  /      |      \
local    S3     SFTP
```

For application storage, avoid importing `node:fs`, `S3Client`, or an SFTP client into
business services. Provider-specific SDKs belong inside Factorydrive drivers or narrowly
justified infrastructure code.

## Installation

```bash
yarn add @ficsysfr/nestjs_module_factorydrive
```

## Development

This repository uses Yarn, Vitest, TypeScript, and Biome:

```bash
yarn install --frozen-lockfile
yarn lint
yarn typecheck
yarn test
yarn test:coverage
yarn build
yarn mcp:test
yarn docs:build
yarn docs:check
yarn test:scripts
yarn changelog:check
yarn package:check
```

The equivalent aggregate command is `make check`. Build audited core and MCP tarballs
with `yarn package` or `make package`; outputs and `SHA256SUMS.txt` are written under
`.artifacts/npm/`.

Maintainers dispatch an exact manual release with
`make release VERSION=2.0.0 CHANNEL=latest WATCH=1`. The privileged workflow uses the
protected `npm` environment and npm Trusted Publishing/OIDC after the one-time bootstrap.

## Quick Start (synchronous config)

```ts
// app.module.ts
import { Module } from '@nestjs/common'
import { FactorydriveModule } from '@ficsysfr/nestjs_module_factorydrive'

@Module({
  imports: [
    FactorydriveModule.forRoot({
      default: 'local',
      disks: {
        local: {
          driver: 'local',
          config: {
            root: `${process.cwd()}/storage`,
          },
        },
      },
    }),
  ],
})
export class AppModule {}
```

## Async Configuration (`forRootAsync`)

```ts
// app.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { FactorydriveModule } from '@ficsysfr/nestjs_module_factorydrive'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FactorydriveModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        default: config.get<string>('factorydrive.default', 'local'),
        disks: {
          local: {
            driver: 'local',
            config: {
              root: config.get<string>('factorydrive.localRoot', `${process.cwd()}/storage`),
            },
          },
        },
      }),
    }),
  ],
})
export class AppModule {}
```

## Usage

Inject `FactorydriveService` and interact with a disk instance:

```ts
// file-storage.service.ts
import { Injectable } from '@nestjs/common'
import { FactorydriveService } from '@ficsysfr/nestjs_module_factorydrive'

@Injectable()
export class FileStorageService {
  public constructor(private readonly factorydrive: FactorydriveService) {}

  public async uploadFile(path: string, buffer: Buffer): Promise<void> {
    await this.factorydrive.getDisk().put(path, buffer)
  }

  public async readFile(path: string): Promise<string> {
    const { content } = await this.factorydrive.getDisk().get(path)
    return content
  }

  public async deleteFile(path: string): Promise<boolean | null> {
    const { wasDeleted } = await this.factorydrive.getDisk().delete(path)
    return wasDeleted
  }
}
```

If no disk name is provided, the configured `default` disk is used. Prefer this form so
business code remains portable across storage providers:

```ts
const disk = this.factorydrive.getDisk()
```

Select a named disk only when the use case intentionally targets it:

```ts
const archive = this.factorydrive.getDisk('archive')
```

## Built-in Local Driver

The package includes a `local` driver with the following operations:

- `append(location, content)`
- `copy(src, dest)`
- `delete(location)`
- `exists(location)`
- `get(location, encoding?)`
- `getBuffer(location)`
- `getStat(location)`
- `getStream(location)`
- `move(src, dest)`
- `prepend(location, content)`
- `put(location, content)`
- `flatList(prefix?)`
- `getUrl(location)` — unsigned URL built from the disk `baseUrl`
- `getSignedUrl(location, { expiresIn? })` — time-limited HMAC-signed URL (default `expiresIn = 900`)
- `verifySignedUrl(location, { expires, signature })` — constant-time signature + expiry check

`content` for `put` accepts `Buffer | ReadableStream | string`.

### Signed URLs (local)

The local driver has no HTTP server: `getSignedUrl` returns a URL pointing at a `baseUrl` endpoint
that **you** expose and which must call `verifySignedUrl` before streaming the file. Configure the
disk with a `signatureSecret` and a `baseUrl`:

```ts
disks: {
  local: {
    driver: 'local',
    config: {
      root: '/var/data',
      signatureSecret: process.env.STORAGE_URL_SECRET,
      baseUrl: 'https://api.example.com/files',
    },
  },
}

const { signedUrl } = await storage.getSignedUrl('threads/abc', { expiresIn: 3600 })
// -> https://api.example.com/files/threads/abc?expires=...&signature=...

// in the /files endpoint:
const ok = storage.verifySignedUrl('threads/abc', { expires, signature })
```

Both `signatureSecret` and `baseUrl` are required for signing; otherwise `getSignedUrl` throws
`InvalidConfigException`.

## Register a Custom Driver

Custom drivers must extend `AbstractStorage` and implement the methods you need.

```ts
// aws-s3.storage.ts
import { AbstractStorage, DeleteResponse, Response } from '@ficsysfr/nestjs_module_factorydrive'

export class AwsS3Storage extends AbstractStorage {
  public constructor(private readonly config: { bucket: string }) {
    super()
  }

  public async put(location: string, content: Buffer | NodeJS.ReadableStream | string): Promise<Response> {
    // Upload implementation...
    return { raw: { location, uploaded: true, contentType: typeof content } }
  }

  public async delete(location: string): Promise<DeleteResponse> {
    // Delete implementation...
    return { raw: { location }, wasDeleted: true }
  }
}
```

Then register it at startup:

```ts
// app.module.ts
import { Module } from '@nestjs/common'
import { FactorydriveModule, FactorydriveService } from '@ficsysfr/nestjs_module_factorydrive'
import { AwsS3Storage } from './aws-s3.storage'

@Module({
  imports: [
    FactorydriveModule.forRoot({
      default: 's3',
      disks: {
        s3: {
          driver: 's3',
          config: {
            bucket: 'example',
          },
        },
      },
    }),
  ],
})
export class AppModule {
  public constructor(factorydrive: FactorydriveService) {
    factorydrive.registerDriver('s3', AwsS3Storage)
  }
}
```

## Exported API

Main exports from this package:

- `FactorydriveModule`
- `FactorydriveService`
- `AbstractStorage`
- `StorageManager`
- storage config/types from `factorydrive/types`
- exceptions from `exceptions`

## Error Handling

The module provides dedicated exceptions (for example):
- `InvalidConfigException`
- `DriverNotSupportedException`
- `FileNotFoundException`
- `PermissionMissingException`
- `MethodNotSupportedException`

Catch and map them in your service/controller layers as needed.

## AI Agent Skill

The npm package includes an Agent Skills pack at
`node_modules/@ficsysfr/nestjs_module_factorydrive/agent-skills/public`. Installing the
package with Yarn makes these two skill directories available to compatible coding
agents; the package does not run an installer or copy skills during installation.

The English [`use-factorydrive`](agent-skills/public/use-factorydrive/SKILL.md) skill
teaches agents to explain, configure, audit, and implement Factorydrive without
coupling business code to a storage provider.

Example prompts:

```text
Use $use-factorydrive to configure local document storage in this NestJS application.
Use $use-factorydrive to migrate this service from S3Client to FactorydriveService.
Use $use-factorydrive to expose a verified local signed-download endpoint.
```

Driver authors should use the separate
[`factorydrive-driver`](agent-skills/public/factorydrive-driver/SKILL.md) skill.

## Documentation for AI agents

- Documentation: <https://ficsysfr.github.io/nestjs_module_factorydrive/>
- Machine-readable index: <https://ficsysfr.github.io/nestjs_module_factorydrive/llms.txt>
- Full context bundle: <https://ficsysfr.github.io/nestjs_module_factorydrive/llms-full.txt>
- MCP server: `npx -y @ficsysfr/nestjs_module_factorydrive-mcp`

The documentation MCP exposes `list_doc_sources`, `search_docs`, and `fetch_docs`
over stdio. It never receives storage configuration and cannot read or mutate application files.

## Migrating to 2.0

Version 2.0.0 moves the maintained ecosystem to the `@ficsysfr` npm scope without
changing exported TypeScript symbols. Replace package names and import specifiers, then
upgrade the core and every installed driver together. See the
[migration guide](https://ficsysfr.github.io/nestjs_module_factorydrive/en/guide/migration).

## License

Apache-2.0, see [`LICENSE`](./LICENSE). Copyright 2026 FicSys.

Versions up to and including 2.0.0 were published under the MIT License and remain
available under those terms.

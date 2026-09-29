# Factorydrive configuration

Use these patterns for the current Factorydrive API. Confirm them against the version
installed in the consuming application before editing it.

## Contents

- [Install packages](#install-packages)
- [Configure the built-in local driver](#configure-the-built-in-local-driver)
- [Configure asynchronously](#configure-asynchronously)
- [Configure multiple disks](#configure-multiple-disks)
- [Declare the S3 driver](#declare-the-s3-driver)
- [Declare the SFTP driver](#declare-the-sftp-driver)
- [Maintain an existing project (`registerDriver()`)](#maintain-an-existing-project-registerdriver)

## Install packages

Install the core package for every setup:

```bash
yarn add @ficsysfr/nestjs_module_factorydrive
```

Install a maintained satellite driver only when required:

```bash
yarn add @ficsysfr/nestjs_module_factorydrive-s3
yarn add @ficsysfr/nestjs_module_factorydrive-sftp
```

Use Yarn for the commands shown by this skill. If the consuming repository explicitly
standardizes on another package manager, preserve that repository's convention.

## Configure the built-in local driver

```ts
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

The local driver is registered by default. Set `registerLocalDriver: false` only when
the application deliberately replaces or excludes it.

## Configure asynchronously

Keep environment access in module configuration rather than business services:

```ts
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { FactorydriveModule } from '@ficsysfr/nestjs_module_factorydrive'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FactorydriveModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        default: config.get<string>('FACTORYDRIVE_DEFAULT', 'local'),
        disks: {
          local: {
            driver: 'local',
            config: {
              root: config.get<string>('FACTORYDRIVE_LOCAL_ROOT', `${process.cwd()}/storage`),
            },
          },
        },
      }),
    }),
  ],
})
export class AppModule {}
```

`forRootAsync()` also supports an options factory class through `useClass`. Check the
installed `FactorydriveModuleAsyncOptions` type before choosing less common NestJS
provider patterns.

The object returned by `useFactory` (or `useClass`) can include `drivers`, exactly like
`forRoot()`. Factorydrive registers those drivers before initializing disks, regardless
of which configuration path produced them.

## Configure multiple disks

Disk names are application-level identifiers. Driver names select implementations:

```ts
FactorydriveModule.forRoot({
  default: 'documents',
  disks: {
    documents: {
      driver: 'local',
      config: { root: `${process.cwd()}/storage/documents` },
    },
    exports: {
      driver: 'local',
      config: { root: `${process.cwd()}/storage/exports` },
    },
  },
})
```

Use `getDisk()` for `documents` and `getDisk('exports')` only for the explicit export
storage use case.

## Declare the S3 driver

Prefer declaring external drivers in the `drivers` option of `forRoot()` /
`forRootAsync()`. Factorydrive registers them automatically before it initializes disks,
so no module constructor is needed just to register a driver:

```ts
import { Module } from '@nestjs/common'
import { FactorydriveModule } from '@ficsysfr/nestjs_module_factorydrive'
import { AwsS3Storage } from '@ficsysfr/nestjs_module_factorydrive-s3'

@Module({
  imports: [
    FactorydriveModule.forRoot({
      default: 'files',
      drivers: {
        s3: AwsS3Storage,
      },
      disks: {
        files: {
          driver: 's3',
          config: {
            bucket: process.env.S3_BUCKET!,
            region: process.env.S3_REGION!,
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY_ID!,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
            },
          },
        },
      },
    }),
  ],
})
export class AppModule {}
```

The S3 configuration extends AWS SDK v3 `S3ClientConfig` and requires `bucket`. Supply
an `endpoint` and `forcePathStyle: true` for S3-compatible providers (MinIO, RustFS,
DigitalOcean Spaces, Backblaze B2, Cloudflare R2, etc.) — they are configured through the
same standard `S3ClientConfig` fields, never as a special case in Factorydrive itself:

```ts
FactorydriveModule.forRoot({
  default: 'assets',
  drivers: { s3: AwsS3Storage },
  disks: {
    assets: {
      driver: 's3',
      config: {
        bucket: 'my-assets',
        endpoint: 'http://rustfs:9000',
        region: 'us-east-1',
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY!,
          secretAccessKey: process.env.S3_SECRET_KEY!,
        },
      },
    },
  },
})
```

## Declare the SFTP driver

```ts
import { Module } from '@nestjs/common'
import { FactorydriveModule } from '@ficsysfr/nestjs_module_factorydrive'
import { SFTPStorage } from '@ficsysfr/nestjs_module_factorydrive-sftp'

@Module({
  imports: [
    FactorydriveModule.forRoot({
      default: 'files',
      drivers: {
        sftp: SFTPStorage,
      },
      disks: {
        files: {
          driver: 'sftp',
          config: {
            root: '/var/www/storage',
            options: {
              host: process.env.SFTP_HOST!,
              port: 22,
              username: process.env.SFTP_USERNAME!,
              password: process.env.SFTP_PASSWORD!,
            },
          },
        },
      },
    }),
  ],
})
export class AppModule {}
```

The SFTP driver configuration contains a remote `root` plus `ssh2-sftp-client`
`ConnectOptions`. Prefer key-based authentication when the consuming application's
deployment environment supports it.

Do not use obsolete examples that call `createDisk()` or `disk()`. The current service
API resolves disks with `getDisk()`.

## Maintain an existing project (`registerDriver()`)

`FactorydriveService.registerDriver('key', DriverClass)` remains fully supported. Use it
for dynamic or conditional registration, or when working in a project that has not
migrated to the declarative `drivers` option yet — it does not need to change just to
keep working:

```ts
import { Module } from '@nestjs/common'
import {
  FactorydriveModule,
  FactorydriveService,
} from '@ficsysfr/nestjs_module_factorydrive'
import { AwsS3Storage } from '@ficsysfr/nestjs_module_factorydrive-s3'

@Module({
  imports: [
    FactorydriveModule.forRoot({
      default: 'files',
      disks: { files: { driver: 's3', config: { bucket: process.env.S3_BUCKET! } } },
    }),
  ],
})
export class AppModule {
  public constructor(factorydrive: FactorydriveService) {
    factorydrive.registerDriver('s3', AwsS3Storage)
  }
}
```

Registering the same key with the same class through both paths (for example while
migrating one driver at a time) is a no-op, not an error. Registering the same key with
two *different* classes throws `InvalidConfigException` as soon as either registration
came from `drivers`; two conflicting `registerDriver()` calls (or one that replaces the
built-in `local` driver) keep the pre-2.1 behavior — the last call wins — but now log a
warning instead of replacing silently.

## Validation at startup

If a disk's `driver` is not a built-in driver, not declared in `drivers`, and never
registered through `registerDriver()`, `FactorydriveService.onModuleInit()` rejects with
a `DriverNotSupportedException` naming both the driver and the disk, for example:

```text
Factorydrive driver "s3" required by disk "assets" is not registered. Declare it in
"drivers" or call registerDriver() before module initialization.
```

Fix this by adding the driver to `drivers`, or by registering it with
`registerDriver()` before the application finishes bootstrapping.

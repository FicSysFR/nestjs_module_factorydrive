---
description: Configure default and named Factorydrive disks synchronously or asynchronously.
---

# Configuration

Factorydrive accepts a default disk, a map of named disks, and an optional switch for
the built-in local driver.

## Configuration contract

```ts
interface StorageManagerConfig {
  default?: string
  disks?: Record<string, {
    driver: string
    config: unknown
  }>
  registerLocalDriver?: boolean
  drivers?: Record<string, StorageDriverConstructor>
}
```

Every disk name is application-defined. Its `driver` value must match a registered
driver key. Local storage is registered as `local` unless
`registerLocalDriver: false` is set. `drivers` declares additional driver constructors —
built-in or from a satellite package — that Factorydrive registers automatically before
initializing any disk. See [Declare drivers](#declare-drivers) below.

## Multiple local disks

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

## Asynchronous configuration

Keep environment access at the module boundary:

```ts
import { ConfigModule, ConfigService } from '@nestjs/config'
import { FactorydriveModule } from '@ficsysfr/nestjs_module_factorydrive'

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
})
```

`forRootAsync()` also accepts `useClass` and `useExisting` through
`FactorydriveModuleAsyncOptions`. The object returned by `useFactory` or `useClass` can
include `drivers`, exactly like `forRoot()`.

## Declare drivers

Declare external drivers in `drivers`, in the same `forRoot()` / `forRootAsync()` call
as the disks that use them. Factorydrive registers them before initializing any disk, so
no module constructor is needed just to register a driver:

```ts
import { Module } from '@nestjs/common'
import { FactorydriveModule } from '@ficsysfr/nestjs_module_factorydrive'
import { AwsS3Storage } from '@ficsysfr/nestjs_module_factorydrive-s3'

@Module({
  imports: [
    FactorydriveModule.forRoot({
      default: 'assets',
      drivers: { s3: AwsS3Storage },
      disks: {
        assets: { driver: 's3', config: { bucket: process.env.S3_BUCKET! } },
      },
    }),
  ],
})
export class AppModule {}
```

The registration key (`s3`) must equal the configured `disks.*.driver` value.

## Register drivers dynamically (`registerDriver()`)

`FactorydriveService.registerDriver('key', DriverClass)` remains fully supported for
dynamic registration and for applications that have not adopted `drivers` yet:

```ts
import { FactorydriveService } from '@ficsysfr/nestjs_module_factorydrive'
import { AwsS3Storage } from '@ficsysfr/nestjs_module_factorydrive-s3'

export class AppModule {
  public constructor(factorydrive: FactorydriveService) {
    factorydrive.registerDriver('s3', AwsS3Storage)
  }
}
```

**Duplicate registration policy.** Registering the same key with the **same** class
through `drivers` and/or `registerDriver()` is a no-op — a driver can be migrated to
`drivers` one at a time without breaking a `registerDriver()` call left elsewhere.
Registering the same key with **two different** classes throws `InvalidConfigException`
as soon as either registration came from `drivers` (this includes redeclaring the
built-in `local` driver in `drivers` without `registerLocalDriver: false`). Two
conflicting `registerDriver()` calls — including one that replaces the built-in `local`
driver — keep the pre-2.1 behavior: the last call wins, but Factorydrive now logs a
warning instead of replacing silently.

## Startup validation

If a disk's `driver` is not a built-in driver, not declared in `drivers`, and never
registered through `registerDriver()`, `FactorydriveService.onModuleInit()` rejects with
a `DriverNotSupportedException` naming both the driver and the disk:

```text
Factorydrive driver "s3" required by disk "assets" is not registered. Declare it in
"drivers" or call registerDriver() before module initialization.
```

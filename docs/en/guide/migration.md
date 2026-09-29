---
description: Migrate Factorydrive applications from the deprecated @tacxou packages to @ficsysfr 2.0.0, and adopt declarative drivers in 2.1.
---

# Migration

## 2.0 → 2.1: declarative drivers

Factorydrive 2.1 adds a `drivers` option to `forRoot()` / `forRootAsync()`, so external
drivers no longer need a module constructor just to call `registerDriver()`. This is a
non-breaking, additive change — `registerDriver()` keeps working exactly as before, and
nothing needs to change to stay on 2.0 behavior.

To migrate one driver at a time, move its registration into `drivers`:

```ts
// Before (2.0)
@Module({
  imports: [
    FactorydriveModule.forRoot({
      disks: { assets: { driver: 's3', config: { bucket: 'assets' } } },
    }),
  ],
})
export class AppModule {
  public constructor(factorydrive: FactorydriveService) {
    factorydrive.registerDriver('s3', AwsS3Storage)
  }
}

// After (2.1)
@Module({
  imports: [
    FactorydriveModule.forRoot({
      drivers: { s3: AwsS3Storage },
      disks: { assets: { driver: 's3', config: { bucket: 'assets' } } },
    }),
  ],
})
export class AppModule {}
```

Declaring the same driver in `drivers` and leaving a matching `registerDriver()` call in
place during the transition is safe: registering the same key with the same class is a
no-op. See [Declare drivers](configuration.md#declare-drivers) for the full contract,
including the duplicate-registration policy and the new startup validation error.

## Migration from `@tacxou`

Factorydrive 2.0.0 moves every maintained package to the `@ficsysfr` npm scope. The
TypeScript API and storage behavior are unchanged; package names and import specifiers
are the breaking change.

### Package mapping

| Deprecated package | Replacement |
| --- | --- |
| `@tacxou/nestjs_module_factorydrive` | `@ficsysfr/nestjs_module_factorydrive` |
| `@tacxou/nestjs_module_factorydrive-s3` | `@ficsysfr/nestjs_module_factorydrive-s3` |
| `@tacxou/nestjs_module_factorydrive-sftp` | `@ficsysfr/nestjs_module_factorydrive-sftp` |

### Migration steps

1. Remove every installed package in the deprecated scope.
2. Install core 2.0.0 and each required driver at 2.0.0 under `@ficsysfr`.
3. Replace package import specifiers in source, tests, mocks, and configuration.
4. Refresh the lockfile with the application's existing package manager.
5. Run the application's complete test and build suites.

```ts
// Before
import { FactorydriveService } from '@tacxou/nestjs_module_factorydrive'

// After
import { FactorydriveService } from '@ficsysfr/nestjs_module_factorydrive'
```

No compatibility shim is published. Deprecated packages remain installable for legacy
applications but receive no 2.x updates.

### Maintainer deprecation step

Run these commands only after all replacements are publicly installable and verified:

```bash
npm deprecate "@tacxou/nestjs_module_factorydrive@*" "Moved to @ficsysfr/nestjs_module_factorydrive"
npm deprecate "@tacxou/nestjs_module_factorydrive-s3@*" "Moved to @ficsysfr/nestjs_module_factorydrive-s3"
npm deprecate "@tacxou/nestjs_module_factorydrive-sftp@*" "Moved to @ficsysfr/nestjs_module_factorydrive-sftp"
```

Deprecation is a manual rollout operation, not part of any release workflow.

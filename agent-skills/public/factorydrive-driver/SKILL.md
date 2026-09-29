---
name: factorydrive-driver
description: >-
  Create or extend a Factorydrive storage driver based on AbstractStorage, including
  custom providers and satellite npm packages. Use when implementing driver behavior,
  configuration, registration examples, exports, tests, or packaging. Do not use only
  to configure or consume an existing driver in a NestJS application; use the
  use-factorydrive skill for that work.
---

# Build a Factorydrive driver

Keep provider SDKs and provider-specific behavior outside the core package. A driver
adapts one storage provider to the `AbstractStorage` contract. The consuming application
registers it either declaratively, through `drivers` in `FactorydriveModule.forRoot()` /
`forRootAsync()`, or imperatively, through `FactorydriveService.registerDriver()`.

## Inspect the real contract first

1. Read the installed core package version, `AbstractStorage`, exported response types,
   exceptions, `StorageDriverConstructor`, and `FactorydriveService.registerDriver()`
   before designing the driver.
2. Inspect the current local driver and the closest maintained satellite driver for
   error mapping, streams, pagination, and packaging conventions.
3. Treat the installed source and types as authoritative when they differ from examples.

`AbstractStorage` currently provides concrete fallbacks that throw
`MethodNotSupportedException`; it does not declare abstract methods that every subclass
must implement. Implement the capabilities the new driver promises and test inherited
unsupported operations explicitly. Do not claim that `put`, `get`, `delete`, `exists`,
or any other fixed list is universally mandatory.

## Implement a satellite driver

1. Extend `AbstractStorage` and accept the disk's `config` object as the **single**
   constructor parameter. `StorageManager` creates the registered class with
   `new Driver(diskConfig.config)`. A single-parameter constructor is also what makes the
   class assignable to `StorageDriverConstructor<TConfig>`, the type used by the
   declarative `drivers` option.
2. Implement only the supported operations, returning the core response shapes and
   keeping provider data in `raw`.
3. Translate provider failures into exported Factorydrive exceptions where a stable
   mapping exists. Never expose credentials in an error or `raw` value returned to
   application code.
4. Export the storage class and its configuration types from the satellite package's
   public entry point.
5. Do not invent a dedicated registration helper. The class itself is what the
   consuming application registers, either declaratively:

   ```ts
   FactorydriveModule.forRoot({
     drivers: { 'provider-key': ProviderStorage },
     disks: { example: { driver: 'provider-key', config: { /* ... */ } } },
   })
   ```

   or imperatively, before disk initialization, which remains fully supported for
   dynamic registration or existing applications:

   ```ts
   factorydrive.registerDriver('provider-key', ProviderStorage)
   ```

   Either way, the registration key must match `disks.*.driver`. Maintained S3 and SFTP
   packages export `AwsS3Storage` and `SFTPStorage` themselves; they do not export a
   registration function — do not export a registration function for a new driver either.

   Registering the same key with the same class twice (declaratively and/or
   imperatively) is a no-op; registering it twice with two *different* classes throws
   `InvalidConfigException` when either registration is declarative, and logs a warning
   before replacing the driver when both are imperative `registerDriver()` calls.
6. Peer-depend on `@ficsysfr/nestjs_module_factorydrive`. Add NestJS peers only when
   the driver imports NestJS APIs. Keep the provider SDK in the satellite package and
   never add it to the core runtime dependencies.
7. Use Yarn commands, Vitest tests, TypeScript strict types, and Biome formatting.

## Test the driver contract

- Cover every implemented operation with success, missing-object, and provider-error
  cases appropriate to the provider.
- Verify response fields such as `content`, `exists`, `wasDeleted`, `path`, and `raw`.
- Verify stream lifecycle and pagination when those capabilities are supported.
- Verify that an intentionally unsupported inherited method throws
  `MethodNotSupportedException`.
- Exercise both registration paths and confirm the configured disk resolves the driver:
  `drivers` in `forRoot()` / `forRootAsync()`, and `FactorydriveService.registerDriver()`
  before storage initialization.
- Run `yarn lint`, `yarn typecheck`, `yarn test`, `yarn build`, and the package's
  tarball audit before reporting completion.

## Change the core only when required

- Route every public export through `src/index.ts`.
- Add or adapt tests under `tests/`.
- Treat a new backward-compatible `AbstractStorage` capability as a likely MINOR change.
  Treat an incompatible signature or behavior change as MAJOR.
- Do not change the core merely to accommodate one provider when the behavior belongs
  in a satellite driver.

## Completion checklist

- The configuration type avoids `any` and matches the constructor input.
- Implemented and unsupported capabilities are documented accurately.
- Registration examples lead with the declarative `drivers` option and also show
  `FactorydriveService.registerDriver()` for dynamic or legacy registration.
- The README documents the `disks` configuration and registration timing.
- Tests, build, and tarball audit pass with Yarn.

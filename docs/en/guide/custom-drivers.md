---
description: Implement and register a custom Factorydrive AbstractStorage driver.
---

# Custom drivers

External drivers extend `AbstractStorage`. Override supported methods and let inherited
methods throw `MethodNotSupportedException` for unsupported capabilities.

## Implement a driver

```ts
import {
  AbstractStorage,
  type DeleteResponse,
  type Response,
} from '@ficsysfr/nestjs_module_factorydrive'

export interface ExampleStorageConfig {
  namespace: string
}

export class ExampleStorage extends AbstractStorage {
  public constructor(private readonly config: ExampleStorageConfig) {
    super()
  }

  public async put(location: string, content: Buffer | NodeJS.ReadableStream | string): Promise<Response> {
    return { raw: { namespace: this.config.namespace, location, content } }
  }

  public async delete(location: string): Promise<DeleteResponse> {
    return { raw: { location }, wasDeleted: true }
  }
}
```

Keep provider clients, credentials, endpoints, and error translation inside the driver.
Return portable fields such as `content`, `exists`, `path`, or `wasDeleted`; expose
provider-specific results only under `raw`. A single-parameter constructor is what makes
the class assignable to `StorageDriverConstructor<ExampleStorageConfig>`, the type used
by `drivers`.

## Declare the driver

Prefer declaring the driver in `drivers`, in the same `forRoot()` / `forRootAsync()`
call as the disk configuration:

```ts
FactorydriveModule.forRoot({
  drivers: { example: ExampleStorage },
  disks: {
    example: { driver: 'example', config: { namespace: 'demo' } },
  },
})
```

Use `FactorydriveService.registerDriver('example', ExampleStorage)` instead for dynamic
registration, or while maintaining an application that has not adopted `drivers` yet.
Either way, the `example` key must match the disk configuration, and registration must
happen before Factorydrive initializes configured disks — `drivers` guarantees that
ordering automatically.

## Package a satellite driver

- Use a separate `@ficsysfr/nestjs_module_factorydrive-*` package.
- Peer-depend on `@ficsysfr/nestjs_module_factorydrive@^2.0.0`.
- Keep the core free of provider SDK dependencies.
- Test supported operations, provider error mapping, streams, pagination, and cleanup.

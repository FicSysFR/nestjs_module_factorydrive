---
description: Use the Factorydrive storage contract, response types, streams, listings, and errors.
---

# Operations and errors

Resolve a disk through `FactorydriveService` and consume the documented response
fields. Treat `raw` as provider-specific diagnostic data.

## Application service pattern

```ts
import { Injectable } from '@nestjs/common'
import { FactorydriveService } from '@ficsysfr/nestjs_module_factorydrive'

@Injectable()
export class DocumentStorageService {
  public constructor(private readonly factorydrive: FactorydriveService) {}

  public async save(path: string, content: Buffer): Promise<void> {
    await this.factorydrive.getDisk().put(path, content)
  }

  public async read(path: string): Promise<Buffer> {
    const { content } = await this.factorydrive.getDisk().getBuffer(path)
    return content
  }

  public async remove(path: string): Promise<boolean | null> {
    const { wasDeleted } = await this.factorydrive.getDisk().delete(path)
    return wasDeleted
  }
}
```

## Common contract

| Operation | Result |
| --- | --- |
| `put(location, content)` | `Promise<Response>` |
| `get(location, encoding?)` | `Promise<ContentResponse<string>>` |
| `getBuffer(location)` | `Promise<ContentResponse<Buffer>>` |
| `getStream(location)` | `Promise<NodeJS.ReadableStream>` |
| `exists(location)` | `Promise<ExistsResponse>` |
| `delete(location)` | `Promise<DeleteResponse>` |
| `copy(src, dest)` / `move(src, dest)` | `Promise<Response>` |
| `append(location, content)` / `prepend(location, content)` | `Promise<Response>` |
| `getStat(location)` | `Promise<StatResponse>` |
| `flatList(prefix?)` | `AsyncIterable<FileListResponse>` |
| `getUrl(location)` | `string` |
| `getSignedUrl(location, options?)` | `Promise<SignedUrlResponse>` |
| `verifySignedUrl(location, params)` | `boolean` |

Concrete drivers may inherit an unsupported method that throws
`MethodNotSupportedException`. Check the [driver matrix](./drivers.md) first.

## Response fields

- `Response`: `{ raw: unknown }`
- `ContentResponse<T>`: `{ content: T, raw: unknown }`
- `ExistsResponse`: `{ exists: boolean, raw: unknown }`
- `DeleteResponse`: `{ wasDeleted: boolean | null, raw: unknown }`
- `StatResponse`: `{ size: number, modified: Date, raw: unknown }`
- `FileListResponse`: `{ path: string, raw: unknown }`
- `SignedUrlResponse`: `{ signedUrl: string, raw: unknown }`

Do not treat `wasDeleted: null` as `false`; some providers cannot confirm deletion.

## Listings and streams

```ts
for await (const { path } of this.factorydrive.getDisk().flatList('documents/')) {
  // Process one logical storage key.
}

const source = await sourceDisk.getStream('incoming/report.pdf')
await destinationDisk.put('archive/report.pdf', source)
```

Validate logical storage keys at the application boundary. Do not pass unchecked
absolute paths supplied by clients.

## Errors

Factorydrive exports `InvalidConfigException`, `DriverNotSupportedException`,
`FileNotFoundException`, `PermissionMissingException`,
`MethodNotSupportedException`, `NoSuchBucketException`, and `UnknownException`.
Map them at an HTTP, job, or application boundary without leaking credentials or raw
provider failures.

`DriverNotSupportedException` is raised when a disk's `driver` was never registered; its
message names both the driver and the disk (see
[Startup validation](configuration.md#startup-validation)). `InvalidConfigException` is
also raised for driver configuration mistakes: an invalid entry in `drivers`, or a
driver name registered twice with two different classes (see
[Duplicate registration policy](configuration.md#register-drivers-dynamically-registerdriver)).

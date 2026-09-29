# Factorydrive operations

Resolve an `AbstractStorage` instance through `FactorydriveService` and consume the
documented response fields. Treat `raw` as diagnostic or provider-specific data.

## Contents

- [Application service pattern](#application-service-pattern)
- [Common contract](#common-contract)
- [Response fields](#response-fields)
- [Iterate file listings](#iterate-file-listings)
- [Stream data](#stream-data)
- [Handle errors at boundaries](#handle-errors-at-boundaries)

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

Keep domain naming in this wrapper (`saveDocument`, `readInvoice`, and similar names)
when that makes the application intent clearer.

## Common contract

| Operation | Input | Result |
| --- | --- | --- |
| `put(location, content)` | `Buffer \| NodeJS.ReadableStream \| string` | `Promise<Response>` |
| `get(location, encoding?)` | storage key, optional encoding | `Promise<ContentResponse<string>>` |
| `getBuffer(location)` | storage key | `Promise<ContentResponse<Buffer>>` |
| `getStream(location)` | storage key | `Promise<NodeJS.ReadableStream>` |
| `exists(location)` | storage key | `Promise<ExistsResponse>` |
| `delete(location)` | storage key | `Promise<DeleteResponse>` |
| `copy(src, dest)` | two storage keys | `Promise<Response>` |
| `move(src, dest)` | two storage keys | `Promise<Response>` |
| `append(location, content)` | `Buffer \| string` | `Promise<Response>` |
| `prepend(location, content)` | `Buffer \| string` | `Promise<Response>` |
| `getStat(location)` | storage key | `Promise<StatResponse>` |
| `flatList(prefix?)` | optional key prefix | `AsyncIterable<FileListResponse>` |
| `getUrl(location)` | storage key | `string` |
| `getSignedUrl(location, options?)` | storage key and optional expiry | `Promise<SignedUrlResponse>` |
| `verifySignedUrl(location, params)` | key, expiry, signature | `boolean` |

These methods form the base storage contract, but a concrete driver may inherit an
unsupported implementation that throws `MethodNotSupportedException`. Check
[drivers.md](drivers.md) before relying on optional methods.

Treat `location` values as logical storage keys. Generate or validate keys at the
application boundary instead of passing absolute paths or unchecked client input.
`driver()` and `onStorageInit()` are infrastructure escape hatches/lifecycle methods;
do not call them from business services.

## Response fields

- `Response`: `{ raw: unknown }`
- `ContentResponse<T>`: `{ content: T, raw: unknown }`
- `ExistsResponse`: `{ exists: boolean, raw: unknown }`
- `DeleteResponse`: `{ wasDeleted: boolean | null, raw: unknown }`
- `StatResponse`: `{ size: number, modified: Date, raw: unknown }`
- `FileListResponse`: `{ path: string, raw: unknown }`
- `SignedUrlResponse`: `{ signedUrl: string, raw: unknown }`

Do not treat `wasDeleted: null` as `false`; remote providers may be unable to confirm
deletion even when the request was accepted.

## Iterate file listings

`flatList()` is an async iterable, not a promise containing an array:

```ts
const disk = this.factorydrive.getDisk()

for await (const { path } of disk.flatList('documents/')) {
  // Process one storage key without depending on provider-specific raw data.
}
```

## Stream data

Await `getStream()` before piping it. Pass Node.js readable streams directly to `put()`
when the selected driver supports streaming uploads:

```ts
const source = await sourceDisk.getStream('incoming/report.pdf')
await destinationDisk.put('archive/report.pdf', source)
```

Do not buffer large files unless the application needs random access or transformation.

## Handle errors at boundaries

Factorydrive exports domain exceptions including:

- `InvalidConfigException` — also raised for driver configuration mistakes: an invalid
  entry in `drivers`, or a driver name registered twice with two different classes
  (see [configuration.md](configuration.md#maintain-an-existing-project-registerdriver))
- `DriverNotSupportedException` — raised when a disk's `driver` was never registered;
  the message names both the driver and the disk
- `FileNotFoundException`
- `PermissionMissingException`
- `MethodNotSupportedException`
- `NoSuchBucketException`
- `UnknownException`

Map these exceptions to HTTP or job outcomes in the application/controller layer. Do
not leak provider-specific `raw` errors or credentials to clients.

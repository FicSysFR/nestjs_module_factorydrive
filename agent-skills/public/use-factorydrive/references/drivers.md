# Maintained Factorydrive drivers

Use the common API where capabilities overlap. Keep provider-specific classes and
configuration at the application bootstrap boundary.

## Capability matrix

| Capability | Local | S3 | SFTP |
| --- | --- | --- | --- |
| `put`, `get`, `getBuffer` | Yes | Yes | Yes |
| `copy`, `move`, `delete`, `exists` | Yes | Yes | Yes |
| `getStat`, `getStream`, `flatList` | Yes | Yes | Yes |
| `append`, `prepend` | Yes | No | No |
| `getUrl` | Yes | No | No |
| `getSignedUrl` | Yes | Yes | No |
| `verifySignedUrl` | Yes | No | No |

"No" means the driver does not override the base-class fallback in its current
implementation; calling it raises `MethodNotSupportedException`.

## Local

- Package: `@ficsysfr/nestjs_module_factorydrive`
- Class: `LocalFileSystemStorage` (registered automatically as `local`)
- Required configuration: `root`
- Optional URL configuration: `baseUrl`, `signatureSecret`
- Best suited to a single host or a mounted/shared filesystem whose lifecycle is
  managed outside Factorydrive.

The local driver performs signed URL verification itself but does not expose an HTTP
server. See [signed-urls.md](signed-urls.md).

## S3

- Package: `@ficsysfr/nestjs_module_factorydrive-s3`
- Class: `AwsS3Storage`
- Registration key: application-defined, conventionally `s3`; declare it in `drivers`
  (preferred) or through `registerDriver('s3', AwsS3Storage)`
- Required configuration: `bucket`
- Additional configuration: AWS SDK v3 `S3ClientConfig`, including `region`,
  `credentials`, `endpoint`, and provider-specific compatibility options

The driver supports Amazon S3 and S3-compatible providers (MinIO, RustFS, DigitalOcean
Spaces, Backblaze B2, Cloudflare R2, etc.) through the same standard `S3ClientConfig`
fields — set `endpoint` and, for path-style providers, `forcePathStyle: true`. Do not
hardcode a particular provider's endpoint or credentials in business services. Its
`getSignedUrl()` produces a provider-signed GET URL; Factorydrive does not verify that
URL in the application.

Current source: <https://github.com/FicSysFR/nestjs_module_factorydrive-s3>

## SFTP

- Package: `@ficsysfr/nestjs_module_factorydrive-sftp`
- Class: `SFTPStorage`
- Registration key: application-defined, conventionally `sftp`; declare it in `drivers`
  (preferred) or through `registerDriver('sftp', SFTPStorage)`
- Required configuration: remote `root` and `options`
- `options`: `ssh2-sftp-client` connection options such as `host`, `port`,
  `username`, `password`, or private-key authentication

The driver connects during `onStorageInit()`, so its class must be registered — declared
in `drivers` or passed to `registerDriver()` — before module initialization completes.
Resolve the configured disk through `FactorydriveService.getDisk()`; do not use obsolete
examples based on `createDisk()` or `disk()`.

Current source: <https://github.com/FicSysFR/nestjs_module_factorydrive-sftp/blob/main/src/sftp.storage.ts>

## Select a driver

- Choose local storage for simple host-local or externally mounted persistence.
- Choose S3 for object storage, provider-signed downloads, or S3-compatible services.
- Choose SFTP only when an external system requires file exchange over SFTP.
- Hide that choice behind the configured default disk whenever business behavior does
  not depend on the provider.

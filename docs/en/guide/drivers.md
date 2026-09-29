---
description: Compare the maintained local, S3, and SFTP Factorydrive drivers.
---

# Local, S3, and SFTP drivers

Use the common storage contract where capabilities overlap. Keep provider classes and
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

## Local filesystem

- Package: `@ficsysfr/nestjs_module_factorydrive`
- Class: `LocalFileSystemStorage`, registered automatically as `local`
- Required configuration: `root`
- Optional URL configuration: `baseUrl`, `signatureSecret`

Local storage is appropriate for a single host or an externally managed mounted
filesystem. It does not expose an HTTP server.

## S3

- Package: `@ficsysfr/nestjs_module_factorydrive-s3`
- Class: `AwsS3Storage`
- Required configuration: `bucket`
- Other options: AWS SDK v3 `S3ClientConfig`, including region, credentials, endpoint,
  path style, and provider compatibility settings

S3 supports Amazon S3 and compatible providers. Its signed URL is validated by the
provider, not by `verifySignedUrl()`.

Any S3-compatible endpoint (MinIO, RustFS, DigitalOcean Spaces, Backblaze B2, Cloudflare
R2, ...) is configured through the same standard `S3ClientConfig` fields — set
`endpoint` and `forcePathStyle: true` for path-style providers:

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

Source: <https://github.com/FicSysFR/nestjs_module_factorydrive-s3>

## SFTP

- Package: `@ficsysfr/nestjs_module_factorydrive-sftp`
- Class: `SFTPStorage`
- Required configuration: remote `root` and `ssh2-sftp-client` connection `options`

SFTP connects during `onStorageInit()`, so its class must be registered — declared in
`drivers` (preferred) or passed to `registerDriver()` — before module initialization
completes. Prefer key-based authentication where the deployment environment supports it.

Source: <https://github.com/FicSysFR/nestjs_module_factorydrive-sftp>

## Selection guidance

- Choose local storage for host-local or mounted persistence.
- Choose S3 for object storage and provider-signed downloads.
- Choose SFTP when an external system requires file exchange over SFTP.
- Hide the selected provider behind the default disk whenever business behavior does
  not depend on it.

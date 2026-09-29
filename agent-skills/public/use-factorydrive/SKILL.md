---
name: use-factorydrive
description: >-
  Explain, configure, audit, or implement portable file storage with Factorydrive
  in NestJS applications. Use for uploads, downloads, attachments, documents,
  generated files, filesystem storage, S3, SFTP, streams, storage disks, or signed
  URLs when application code should use FactorydriveService instead of a provider
  SDK directly. Do not use to create or extend an AbstractStorage driver; use the
  factorydrive-driver skill for that work.
---

# Use Factorydrive

Keep application storage portable by placing `FactorydriveService` between business
code and the physical storage provider.

## Establish the request mode

1. Determine whether the user asked for an explanation, an audit, or an implementation.
2. For an explanation or audit, inspect and report without changing files.
3. For an implementation, make only the requested changes and run the consuming
   project's relevant checks. Do not start a server, watcher, or container unless
   the user explicitly asks.

## Inspect before deciding

Inspect the consuming project before recommending code:

- Read its package manifest and lockfile to identify installed Factorydrive versions.
- Find existing `FactorydriveModule`, `FactorydriveService`, disk configuration,
  storage wrappers, and environment configuration.
- Search business services for direct `node:fs`, `S3Client`, or SFTP client usage.
- Check the installed package types or source before relying on a method or option.

Treat the installed package as the primary source of truth. Use this skill's references
as guidance for the current API, not as a reason to overwrite version-specific behavior.

## Apply the portability rules

For persistent application files:

1. Use `FactorydriveService` rather than instantiate storage drivers in business code.
2. Resolve storage with `getDisk()`; prefer the configured default disk.
3. Use `getDisk('name')` only when the use case intentionally targets a specific disk.
4. Keep credentials, endpoints, buckets, roots, and driver selection in configuration.
5. Keep provider-specific response data in `raw` out of business decisions.
6. Do not import `node:fs`, `S3Client`, or an SFTP client into business services unless
   a non-Factorydrive requirement is explicitly justified.
7. Confirm that the configured driver implements an optional operation before using it.
   Unsupported inherited methods throw `MethodNotSupportedException`.

Use this dependency direction:

```text
Business service
      |
FactorydriveService
      |
AbstractStorage
  /      |      \
local    S3     SFTP
```

## Implement through the public API

1. Configure disks through `FactorydriveModule.forRoot()` or `forRootAsync()`.
2. Declare each external driver in the `drivers` option of that same call
   (`drivers: { s3: AwsS3Storage }`), so the whole storage configuration lives in one
   place and no module constructor is needed just to register a driver. Make the
   registration key match `disks.*.driver`. Use `FactorydriveService.registerDriver()`
   instead only for dynamic registration or when maintaining an existing application
   that does not use `drivers` yet.
3. Inject `FactorydriveService` into an application storage service.
4. Resolve the disk once per operation or service method and use the common contract.
5. Destructure documented response fields such as `content`, `exists`, `wasDeleted`,
   or `signedUrl`; do not assume the response itself is the value.
6. Map Factorydrive exceptions at the controller or application boundary when needed.

Read [configuration.md](references/configuration.md) when installing the module,
configuring disks, or registering local, S3, or SFTP storage.

Read [operations.md](references/operations.md) when implementing reads, writes,
streams, listing, response handling, or error handling.

Read [drivers.md](references/drivers.md) when selecting a provider or checking which
operations and configuration fields a maintained driver supports.

Read [signed-urls.md](references/signed-urls.md) when generating or serving signed URLs.

## Route driver development elsewhere

If the task requires implementing a new `AbstractStorage` subclass, adding methods to a
driver, changing driver registration internals, or publishing a satellite driver, stop
using this workflow and use `factorydrive-driver`.

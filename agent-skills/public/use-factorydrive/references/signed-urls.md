# Signed URLs

Local and S3 signed URLs have different trust and serving models. Do not transfer the
local verification pattern to S3 or assume that local storage serves HTTP traffic.

## Local signed URLs

Configure both `baseUrl` and `signatureSecret`:

```ts
{
  driver: 'local',
  config: {
    root: '/var/data',
    baseUrl: 'https://api.example.com/files',
    signatureSecret: process.env.STORAGE_URL_SECRET!,
  },
}
```

Generate a URL:

```ts
const { signedUrl } = await this.factorydrive
  .getDisk()
  .getSignedUrl('documents/report.pdf', { expiresIn: 3600 })
```

`expiresIn` is expressed in seconds and defaults to 900. The local driver returns a URL
containing an absolute expiry timestamp and an HMAC-SHA256 signature.

The application must expose the `baseUrl` route. In that route, recover the exact
storage key from the request path, parse `expires` as a number, verify the signature,
and only then stream the file:

```ts
import { ForbiddenException, Injectable } from '@nestjs/common'
import { FactorydriveService } from '@ficsysfr/nestjs_module_factorydrive'

@Injectable()
export class SignedFileReader {
  public constructor(private readonly factorydrive: FactorydriveService) {}

  public async open(
    location: string,
    expiresValue: string,
    signature: string,
  ): Promise<NodeJS.ReadableStream> {
    const expires = Number(expiresValue)
    const disk = this.factorydrive.getDisk()

    if (!disk.verifySignedUrl(location, { expires, signature })) {
      throw new ForbiddenException('Invalid or expired file URL')
    }

    return disk.getStream(location)
  }
}
```

Connect this service to the consuming application's controller or HTTP adapter. Route
wildcard syntax varies across supported NestJS platform versions, so preserve the
project's existing routing convention rather than copying a version-specific wildcard.

Do not claim that one wildcard decorator works unchanged across NestJS 6 through 12.
Inspect the installed NestJS version, HTTP adapter, global prefix, and existing route
style before writing the controller decorator or extracting its wildcard parameter. If
the consuming project is unavailable, provide only the verification/streaming service
pattern above and describe the controller integration without inventing a route snippet.

Apply these rules:

- Keep `signatureSecret` in secret configuration and rotate it deliberately.
- Pass the exact same logical `location` to generation, verification, and retrieval.
- Reject missing, non-numeric, altered, or expired parameters.
- Verify before opening the stream.
- Preserve application authorization checks when a signed URL is not intended to be a
  standalone bearer capability.
- Do not recreate the HMAC in application code; call `verifySignedUrl()`.

## S3 signed URLs

The S3 driver delegates signing to AWS SDK v3:

```ts
const { signedUrl } = await this.factorydrive
  .getDisk()
  .getSignedUrl('documents/report.pdf', { expiresIn: 60 })
```

Return or redirect to the generated provider URL according to the application's API
contract. S3 validates the request; the S3 driver does not implement
`verifySignedUrl()`.

## Unsupported drivers

The current SFTP driver does not implement `getSignedUrl()` or `verifySignedUrl()`.
Choose an application-controlled download endpoint or a different driver rather than
calling inherited unsupported methods.

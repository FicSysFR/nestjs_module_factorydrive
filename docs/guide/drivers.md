---
description: Comparer les drivers Factorydrive maintenus pour le stockage local, S3 et SFTP.
---

# Drivers local, S3 et SFTP

## Matrice de capacités

| Capacité | Local | S3 | SFTP |
| --- | --- | --- | --- |
| `put`, `get`, `getBuffer` | Oui | Oui | Oui |
| `copy`, `move`, `delete`, `exists` | Oui | Oui | Oui |
| `getStat`, `getStream`, `flatList` | Oui | Oui | Oui |
| `append`, `prepend` | Oui | Non | Non |
| `getUrl` | Oui | Non | Non |
| `getSignedUrl` | Oui | Oui | Non |
| `verifySignedUrl` | Oui | Non | Non |

## Système de fichiers local

- Package : `@ficsysfr/nestjs_module_factorydrive`
- Classe : `LocalFileSystemStorage`, enregistrée automatiquement sous `local`
- Configuration obligatoire : `root`
- Configuration URL optionnelle : `baseUrl`, `signatureSecret`

Le driver local convient à une machine unique ou à un volume monté géré en dehors de
Factorydrive. Il n’expose pas de serveur HTTP.

## S3

- Package : `@ficsysfr/nestjs_module_factorydrive-s3`
- Classe : `AwsS3Storage`
- Configuration obligatoire : `bucket`
- Options supplémentaires : `S3ClientConfig` du SDK AWS v3

Le driver fonctionne avec Amazon S3 et les fournisseurs compatibles. Une URL signée
S3 est validée par le fournisseur.

Tout endpoint compatible S3 (MinIO, RustFS, DigitalOcean Spaces, Backblaze B2,
Cloudflare R2, etc.) se configure avec les mêmes champs standard de `S3ClientConfig` —
définir `endpoint` et `forcePathStyle: true` pour les fournisseurs en style « path » :

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

## SFTP

- Package : `@ficsysfr/nestjs_module_factorydrive-sftp`
- Classe : `SFTPStorage`
- Configuration obligatoire : `root` distant et `options` de connexion

Le driver se connecte pendant `onStorageInit()` : sa classe doit donc être enregistrée —
déclarée dans `drivers` (préférable) ou passée à `registerDriver()` — avant la fin de
l’initialisation du module. Préférer une authentification par clé si l’environnement de
déploiement le permet.

## Choisir

- Local pour un stockage hôte ou monté.
- S3 pour du stockage objet et des téléchargements signés par le fournisseur.
- SFTP pour échanger avec un système externe qui l’impose.
- Le disque par défaut lorsque le comportement métier ne dépend pas du fournisseur.

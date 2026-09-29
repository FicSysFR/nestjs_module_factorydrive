---
description: Utiliser les opérations, réponses, flux, listes et erreurs de Factorydrive.
---

# Opérations et erreurs

Résoudre le disque avec `FactorydriveService` et lire les champs documentés des
réponses. Le champ `raw` reste réservé aux informations spécifiques au fournisseur.

## Service applicatif

```ts
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

## Contrat commun

| Opération | Résultat |
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

Un driver concret peut hériter d’une méthode non prise en charge qui lance
`MethodNotSupportedException`. Consulter la [matrice des drivers](./drivers.md).

## Réponses

- `Response` : `{ raw: unknown }`
- `ContentResponse<T>` : `{ content: T, raw: unknown }`
- `ExistsResponse` : `{ exists: boolean, raw: unknown }`
- `DeleteResponse` : `{ wasDeleted: boolean | null, raw: unknown }`
- `StatResponse` : `{ size: number, modified: Date, raw: unknown }`
- `FileListResponse` : `{ path: string, raw: unknown }`
- `SignedUrlResponse` : `{ signedUrl: string, raw: unknown }`

`flatList()` est un itérable asynchrone. `getStream()` doit être attendu avant de
transmettre le flux. Les clés de stockage doivent être validées à la frontière de
l’application.

## Erreurs

Le package exporte notamment `InvalidConfigException`, `DriverNotSupportedException`,
`FileNotFoundException`, `PermissionMissingException`,
`MethodNotSupportedException`, `NoSuchBucketException` et `UnknownException`.
Les convertir en réponses HTTP ou résultats de job sans divulguer de secret ni
d’erreur brute du fournisseur.

`DriverNotSupportedException` est levée quand le `driver` d’un disque n’a jamais été
enregistré ; son message nomme le driver et le disque (voir
[Validation au démarrage](configuration.md#validation-au-demarrage)).
`InvalidConfigException` est aussi levée pour une erreur de configuration des drivers :
une entrée invalide dans `drivers`, ou un nom de driver enregistré deux fois avec deux
classes différentes (voir
[Politique de doublons](configuration.md#enregistrer-un-driver-dynamiquement-registerdriver)).

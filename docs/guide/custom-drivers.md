---
description: Implémenter et enregistrer un driver Factorydrive basé sur AbstractStorage.
---

# Drivers personnalisés

Un driver externe étend `AbstractStorage`. Il surcharge les opérations prises en charge
et laisse les autres méthodes lancer `MethodNotSupportedException`.

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

Garder le client fournisseur, les identifiants, les endpoints et la traduction des
erreurs dans le driver. Les informations spécifiques restent sous `raw`. Un constructeur
à un seul paramètre rend la classe compatible avec
`StorageDriverConstructor<ExampleStorageConfig>`, le type utilisé par `drivers`.

Préférer déclarer le driver dans `drivers`, dans le même appel `forRoot()` /
`forRootAsync()` que la configuration du disque :

```ts
FactorydriveModule.forRoot({
  drivers: { example: ExampleStorage },
  disks: {
    example: { driver: 'example', config: { namespace: 'demo' } },
  },
})
```

Utiliser `FactorydriveService.registerDriver('example', ExampleStorage)` pour
l’enregistrement dynamique, ou pour maintenir une application qui n’utilise pas encore
`drivers`. Dans tous les cas, la clé (`example`) correspond à `disks.*.driver` et doit
être enregistrée avant l’initialisation — `drivers` garantit cet ordre automatiquement.
Un package satellite utilise le préfixe `@ficsysfr/nestjs_module_factorydrive-*` et
déclare le cœur `^2.0.0` en peer dependency.

---
description: Configurer les disques Factorydrive par défaut et nommés, de façon synchrone ou asynchrone.
---

# Configuration

Factorydrive reçoit un disque par défaut, une collection de disques nommés et un choix
optionnel concernant le driver local intégré.

## Contrat de configuration

```ts
interface StorageManagerConfig {
  default?: string
  disks?: Record<string, {
    driver: string
    config: unknown
  }>
  registerLocalDriver?: boolean
  drivers?: Record<string, StorageDriverConstructor>
}
```

Chaque nom de disque appartient à l’application. Sa valeur `driver` correspond à une
clé de driver enregistrée. Le driver local est disponible sous `local`, sauf avec
`registerLocalDriver: false`. `drivers` déclare des constructeurs de drivers
supplémentaires — intégrés ou issus d’un package satellite — que Factorydrive enregistre
automatiquement avant d’initialiser le moindre disque. Voir
[Déclarer des drivers](#declarer-des-drivers) plus bas.

## Plusieurs disques

```ts
FactorydriveModule.forRoot({
  default: 'documents',
  disks: {
    documents: {
      driver: 'local',
      config: { root: `${process.cwd()}/storage/documents` },
    },
    exports: {
      driver: 'local',
      config: { root: `${process.cwd()}/storage/exports` },
    },
  },
})
```

`getDisk()` sélectionne `documents`. `getDisk('exports')` est réservé au cas d’usage
qui vise explicitement les exports.

## Configuration asynchrone

```ts
FactorydriveModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    default: config.get<string>('FACTORYDRIVE_DEFAULT', 'local'),
    disks: {
      local: {
        driver: 'local',
        config: {
          root: config.get<string>('FACTORYDRIVE_LOCAL_ROOT', `${process.cwd()}/storage`),
        },
      },
    },
  }),
})
```

`forRootAsync()` accepte également `useClass` et `useExisting` via
`FactorydriveModuleAsyncOptions`. L’objet renvoyé par `useFactory` ou `useClass` peut
inclure `drivers`, exactement comme `forRoot()`.

## Déclarer des drivers

Déclarer les drivers externes dans `drivers`, dans le même appel `forRoot()` /
`forRootAsync()` que les disques qui les utilisent. Factorydrive les enregistre avant
d’initialiser le moindre disque : aucun constructeur de module n’est nécessaire
uniquement pour enregistrer un driver :

```ts
import { Module } from '@nestjs/common'
import { FactorydriveModule } from '@ficsysfr/nestjs_module_factorydrive'
import { AwsS3Storage } from '@ficsysfr/nestjs_module_factorydrive-s3'

@Module({
  imports: [
    FactorydriveModule.forRoot({
      default: 'assets',
      drivers: { s3: AwsS3Storage },
      disks: {
        assets: { driver: 's3', config: { bucket: process.env.S3_BUCKET! } },
      },
    }),
  ],
})
export class AppModule {}
```

La clé (`s3`) doit être identique à `disks.*.driver`.

## Enregistrer un driver dynamiquement (`registerDriver()`)

`FactorydriveService.registerDriver('key', DriverClass)` reste totalement pris en
charge, pour l’enregistrement dynamique ou pour les applications qui n’utilisent pas
encore `drivers` :

```ts
import { FactorydriveService } from '@ficsysfr/nestjs_module_factorydrive'
import { AwsS3Storage } from '@ficsysfr/nestjs_module_factorydrive-s3'

export class AppModule {
  public constructor(factorydrive: FactorydriveService) {
    factorydrive.registerDriver('s3', AwsS3Storage)
  }
}
```

**Politique de doublons.** Enregistrer la même clé avec la **même** classe via `drivers`
et/ou `registerDriver()` ne fait rien (migration progressive possible, sans casser un
appel `registerDriver()` laissé ailleurs). Enregistrer la même clé avec **deux classes
différentes** lève `InvalidConfigException` dès qu’un des deux enregistrements vient de
`drivers` (y compris re-déclarer `local` dans `drivers` sans `registerLocalDriver:
false`). Deux appels `registerDriver()` en conflit — y compris un appel qui remplace le
driver `local` intégré — conservent le comportement antérieur à 2.1 : le dernier appel
l’emporte, mais Factorydrive journalise désormais un avertissement au lieu de remplacer
silencieusement.

## Validation au démarrage

Si le `driver` d’un disque n’est ni un driver intégré, ni déclaré dans `drivers`, ni
enregistré via `registerDriver()`, `FactorydriveService.onModuleInit()` rejette avec une
`DriverNotSupportedException` qui nomme le driver et le disque :

```text
Factorydrive driver "s3" required by disk "assets" is not registered. Declare it in
"drivers" or call registerDriver() before module initialization.
```

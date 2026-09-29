---
description: Migrer les applications Factorydrive des packages @tacxou dépréciés vers @ficsysfr 2.0.0, et adopter les drivers déclaratifs en 2.1.
---

# Migration

## 2.0 → 2.1 : drivers déclaratifs

Factorydrive 2.1 ajoute une option `drivers` à `forRoot()` / `forRootAsync()` : les
drivers externes n’ont plus besoin d’un constructeur de module juste pour appeler
`registerDriver()`. C’est un changement additif, non cassant — `registerDriver()`
continue de fonctionner exactement comme avant, et rien n’oblige à changer quoi que ce
soit pour conserver le comportement 2.0.

Pour migrer un driver à la fois, déplacer son enregistrement dans `drivers` :

```ts
// Avant (2.0)
@Module({
  imports: [
    FactorydriveModule.forRoot({
      disks: { assets: { driver: 's3', config: { bucket: 'assets' } } },
    }),
  ],
})
export class AppModule {
  public constructor(factorydrive: FactorydriveService) {
    factorydrive.registerDriver('s3', AwsS3Storage)
  }
}

// Après (2.1)
@Module({
  imports: [
    FactorydriveModule.forRoot({
      drivers: { s3: AwsS3Storage },
      disks: { assets: { driver: 's3', config: { bucket: 'assets' } } },
    }),
  ],
})
export class AppModule {}
```

Déclarer le même driver dans `drivers` tout en laissant un appel `registerDriver()`
correspondant pendant la transition est sûr : enregistrer la même clé avec la même
classe ne fait rien. Voir [Déclarer des drivers](configuration.md#declarer-des-drivers)
pour le contrat complet, y compris la politique de doublons et la nouvelle erreur de
validation au démarrage.

## Migration depuis `@tacxou`

Factorydrive 2.0.0 déplace tous les packages maintenus vers le scope npm `@ficsysfr`.
L’API TypeScript et le comportement du stockage restent identiques ; le changement de
nom des packages et des imports constitue la rupture majeure.

### Correspondance

| Package déprécié | Remplacement |
| --- | --- |
| `@tacxou/nestjs_module_factorydrive` | `@ficsysfr/nestjs_module_factorydrive` |
| `@tacxou/nestjs_module_factorydrive-s3` | `@ficsysfr/nestjs_module_factorydrive-s3` |
| `@tacxou/nestjs_module_factorydrive-sftp` | `@ficsysfr/nestjs_module_factorydrive-sftp` |

### Étapes

1. Désinstaller chaque package de l’ancien scope.
2. Installer le cœur 2.0.0 et les drivers nécessaires en 2.0.0 sous `@ficsysfr`.
3. Remplacer les imports dans le code, les tests, les mocks et la configuration.
4. Régénérer le lockfile avec le gestionnaire de paquets du projet.
5. Exécuter tous les tests et le build de l’application.

```ts
// Avant
import { FactorydriveService } from '@tacxou/nestjs_module_factorydrive'

// Après
import { FactorydriveService } from '@ficsysfr/nestjs_module_factorydrive'
```

Aucun package relais n’est publié. Les packages dépréciés restent installables pour les
applications historiques, mais ne reçoivent aucune version 2.x.

### Dépréciation par les mainteneurs

Exécuter ces commandes uniquement lorsque tous les remplacements publics ont été
installés et vérifiés :

```bash
npm deprecate "@tacxou/nestjs_module_factorydrive@*" "Moved to @ficsysfr/nestjs_module_factorydrive"
npm deprecate "@tacxou/nestjs_module_factorydrive-s3@*" "Moved to @ficsysfr/nestjs_module_factorydrive-s3"
npm deprecate "@tacxou/nestjs_module_factorydrive-sftp@*" "Moved to @ficsysfr/nestjs_module_factorydrive-sftp"
```

La dépréciation reste une opération manuelle du rollout et n’appartient à aucun
workflow de release.

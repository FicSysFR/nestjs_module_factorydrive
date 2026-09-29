// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

import type AbstractStorage from './abstract.storage'
import type { LocalFileSystemStorageConfig } from './local-file-system.storage'

export type { LocalFileSystemStorageConfig }

export type StorageManagerSingleDiskConfig =
  | {
      driver: 'local'
      config: LocalFileSystemStorageConfig
    }
  | {
      driver: string
      config: unknown
    }

export interface StorageManagerDiskConfig {
  [key: string]: StorageManagerSingleDiskConfig
}

/**
 * Constructeur de driver de stockage.
 *
 * `TConfig` par défaut vaut `never` plutôt que `unknown` : sous `strictFunctionTypes`
 * (activé chez la plupart des consommateurs), un paramètre de constructeur est vérifié en
 * position contravariante, donc `new (config: unknown) => T` rejetterait un vrai driver
 * typé (ex. `AwsS3Storage` dont le constructeur attend `AmazonWebServicesS3StorageConfig`).
 * `never` est assignable depuis n'importe quel paramètre concret, ce qui laisse passer
 * les drivers existants sans les forcer à typer leur config en `unknown`.
 */
export type StorageDriverConstructor<TConfig = never, TStorage extends AbstractStorage = AbstractStorage> = new (config: TConfig) => TStorage

export interface StorageManagerDriversConfig {
  // biome-ignore lint/suspicious/noExplicitAny: Chaque driver déclare son propre type de config ; voir StorageDriverConstructor.
  [driverName: string]: StorageDriverConstructor<any>
}

export interface StorageManagerConfig {
  default?: string
  disks?: StorageManagerDiskConfig
  registerLocalDriver?: boolean
  /**
   * Drivers enregistrés déclarativement avant l'initialisation des disques.
   * Complète `FactorydriveService.registerDriver()`, qui reste disponible pour
   * l'enregistrement dynamique ou avancé.
   */
  drivers?: StorageManagerDriversConfig
}

export interface Response {
  raw: unknown
}

export interface ExistsResponse extends Response {
  exists: boolean
}

export interface ContentResponse<ContentType> extends Response {
  content: ContentType
}

export interface SignedUrlOptions {
  expiresIn?: number
}

export interface SignedUrlResponse extends Response {
  signedUrl: string
}

export interface VerifySignedUrlParams {
  expires: number
  signature: string
}

export interface StatResponse extends Response {
  size: number
  modified: Date
}

export interface FileListResponse extends Response {
  path: string
}

export interface DeleteResponse extends Response {
  wasDeleted: boolean | null
}

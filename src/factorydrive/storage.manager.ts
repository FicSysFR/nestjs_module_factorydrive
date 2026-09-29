// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

import { Logger } from '@nestjs/common'
import { DriverNotSupportedException, InvalidConfigException } from '../exceptions'
import type AbstractStorage from './abstract.storage'
import { LocalFileSystemStorage } from './local-file-system.storage'
import type { StorageManagerConfig, StorageManagerDiskConfig, StorageManagerSingleDiskConfig } from './types'

interface StorageConstructor<T extends AbstractStorage = AbstractStorage> {
  // biome-ignore lint/suspicious/noExplicitAny: Storage drivers may expose arbitrary constructor parameters.
  new (...args: any[]): T
}

export default class StorageManager {
  private readonly logger = new Logger(StorageManager.name)

  private readonly defaultDisk: string | undefined
  private readonly disksConfig: StorageManagerDiskConfig

  private _disks: Map<string, AbstractStorage> = new Map()
  private _drivers: Map<string, StorageConstructor> = new Map()
  /**
   * Noms de drivers enregistrés déclarativement via `drivers`. Le driver `local` intégré
   * n'y figure pas : il reste remplaçable par `registerDriver()` comme en 2.0 (voir
   * setDriver()), sauf s'il est lui-même re-déclaré explicitement dans `drivers`.
   */
  private readonly _declaredDrivers: Set<string> = new Set()

  public constructor(config: StorageManagerConfig) {
    this.defaultDisk = config.default
    this.disksConfig = config.disks || {}

    if (config.registerLocalDriver !== false) {
      // Non verrouillé : une application peut toujours remplacer `local` via `registerDriver()`,
      // comme en 2.0 (avec avertissement). Seule une entrée explicite `drivers.local` est
      // verrouillée et refuse un remplacement silencieux — voir setDriver().
      this.setDriver('local', LocalFileSystemStorage, false)
    }

    for (const [name, driver] of Object.entries(config.drivers ?? {})) {
      if (typeof driver !== 'function') {
        throw InvalidConfigException.invalidDriver(name)
      }
      this.setDriver(name, driver, true)
    }

    this.logger.log('StorageManager initialized 🟢')
  }

  public getDisks(): Map<string, AbstractStorage> {
    return this._disks
  }

  public getDrivers(): Map<string, StorageConstructor> {
    return this._drivers
  }

  public async initDisks(): Promise<void> {
    for (const [diskName, diskConfig] of Object.entries(this.disksConfig)) {
      this.assertDriverAvailable(diskName, diskConfig)
    }

    for (const diskName of Object.keys(this.disksConfig)) {
      const disk = this.disk(diskName)
      this.logger.debug(`Initializing disk <${diskName}> 📀`)

      if (typeof disk.onStorageInit === 'function') {
        await this.disk(diskName).onStorageInit()
      }
    }
    this.logger.log('All disks initialized 🟢')
  }

  public disk<T extends AbstractStorage = AbstractStorage>(name?: string): T {
    name = name || this.defaultDisk

    if (!name) {
      throw InvalidConfigException.missingDiskName()
    }

    if (this._disks.has(name)) {
      return this._disks.get(name) as T
    }

    const diskConfig = this.disksConfig[name]
    const Driver = this.assertDriverAvailable(name, diskConfig)

    const disk = new Driver(diskConfig.config)
    this._disks.set(name, disk)

    return disk as T
  }

  public addDisk(name: string, config: StorageManagerSingleDiskConfig): void {
    if (this.disksConfig[name]) {
      throw InvalidConfigException.duplicateDiskName(name)
    }
    this.disksConfig[name] = config
  }

  public registerDriver<T extends AbstractStorage>(name: string, driver: StorageConstructor<T>): void {
    this.setDriver(name, driver, false)
  }

  /** Vérifie que le disque a un driver configuré et enregistré, et renvoie son constructeur. */
  private assertDriverAvailable(diskName: string, diskConfig: StorageManagerSingleDiskConfig | undefined): StorageConstructor {
    if (!diskConfig) {
      throw InvalidConfigException.missingDiskConfig(diskName)
    }

    if (!diskConfig.driver) {
      throw InvalidConfigException.missingDiskDriver(diskName)
    }

    const Driver = this._drivers.get(diskConfig.driver)

    if (!Driver) {
      throw DriverNotSupportedException.notRegistered(diskConfig.driver, diskName)
    }

    return Driver
  }

  /**
   * Applique la politique de doublons :
   * - même nom, même classe (déclaratif ou legacy) : no-op idempotent ;
   * - conflit impliquant un driver déclaré (`drivers` ou `local` intégré) : erreur explicite ;
   * - conflit entre deux `registerDriver()` legacy : remplacement, avec un avertissement
   *   (comportement historique conservé pour ne pas casser les applications 2.x existantes).
   */
  private setDriver(name: string, driver: StorageConstructor, declared: boolean): void {
    const existing = this._drivers.get(name)

    if (existing) {
      if (existing === driver) {
        this.logger.debug(`Driver <${name}> already registered with the same class, skipping 🚗`)
        return
      }

      if (declared || this._declaredDrivers.has(name)) {
        throw InvalidConfigException.duplicateDriverName(name)
      }

      this.logger.warn(`Driver <${name}> was already registered and is being replaced 🚗`)
    }

    this._drivers.set(name, driver)
    if (declared) {
      this._declaredDrivers.add(name)
    }
    this.logger.debug(`Registered <${name}> driver 🚗`)
  }
}

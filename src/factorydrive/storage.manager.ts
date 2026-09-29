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

  public constructor(config: StorageManagerConfig) {
    this.defaultDisk = config.default
    this.disksConfig = config.disks || {}

    if (config.registerLocalDriver !== false) {
      this.registerDriver('local', LocalFileSystemStorage)
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

    if (!diskConfig) {
      throw InvalidConfigException.missingDiskConfig(name)
    }

    if (!diskConfig.driver) {
      throw InvalidConfigException.missingDiskDriver(name)
    }

    const Driver = this._drivers.get(diskConfig.driver)

    if (!Driver) {
      throw DriverNotSupportedException.driver(diskConfig.driver)
    }

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
    this._drivers.set(name, driver)
    this.logger.debug(`Registered <${name}> driver 🚗`)
  }
}

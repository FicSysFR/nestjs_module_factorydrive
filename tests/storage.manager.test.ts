import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DriverNotSupportedException, InvalidConfigException } from '../src/exceptions'
import AbstractStorage from '../src/factorydrive/abstract.storage'
import { LocalFileSystemStorage } from '../src/factorydrive/local-file-system.storage'
import StorageManager from '../src/factorydrive/storage.manager'
import type { StorageManagerConfig } from '../src/factorydrive/types'

class FakeStorage extends AbstractStorage {
  public config: unknown
  public initCalls = 0

  public constructor(config?: unknown) {
    super()
    this.config = config
  }

  public async onStorageInit(): Promise<void> {
    this.initCalls += 1
  }
}

class OtherFakeStorage extends AbstractStorage {
  public constructor(public config?: unknown) {
    super()
  }
}

describe('StorageManager', () => {
  it('enregistre le driver local par defaut', () => {
    const manager = new StorageManager({ default: 'localDisk', disks: {} })
    expect(manager.getDrivers().has('local')).toBe(true)
  })

  it('n enregistre pas le driver local si desactive', () => {
    const manager = new StorageManager({
      default: 'localDisk',
      disks: {},
      registerLocalDriver: false,
    })
    expect(manager.getDrivers().has('local')).toBe(false)
  })

  it('leve une erreur si aucun nom de disque n est fourni', () => {
    const manager = new StorageManager({ disks: {}, registerLocalDriver: false })
    expect(() => manager.disk()).toThrow(InvalidConfigException.missingDiskName().message)
  })

  it('leve une erreur quand la config du disque est absente', () => {
    const manager = new StorageManager({
      default: 'missing',
      disks: {},
      registerLocalDriver: false,
    })
    expect(() => manager.disk()).toThrow(InvalidConfigException.missingDiskConfig('missing').message)
  })

  it('leve une erreur quand le driver du disque est manquant', () => {
    const manager = new StorageManager({
      default: 'broken',
      disks: { broken: {} as StorageManagerConfig['disks'][string] },
      registerLocalDriver: false,
    })
    expect(() => manager.disk()).toThrow(InvalidConfigException.missingDiskDriver('broken').message)
  })

  it('leve une erreur quand le driver n est pas supporte', () => {
    const manager = new StorageManager({
      default: 'custom',
      disks: {
        custom: { driver: 'not-registered', config: {} },
      },
      registerLocalDriver: false,
    })

    try {
      manager.disk()
    } catch (error) {
      expect(error).toBeInstanceOf(DriverNotSupportedException)
      expect((error as DriverNotSupportedException).driver).toBe('not-registered')
      return
    }

    throw new Error('Expected DriverNotSupportedException')
  })

  it('cree puis met en cache le disque', () => {
    const manager = new StorageManager({
      default: 'custom',
      disks: {
        custom: { driver: 'fake', config: { key: 'value' } },
      },
      registerLocalDriver: false,
    })

    manager.registerDriver('fake', FakeStorage)

    const firstDisk = manager.disk<FakeStorage>()
    const secondDisk = manager.disk<FakeStorage>()

    expect(firstDisk).toBeInstanceOf(FakeStorage)
    expect(firstDisk.config).toEqual({ key: 'value' })
    expect(secondDisk).toBe(firstDisk)
    expect(manager.getDisks().size).toBe(1)
  })

  it('ajoute dynamiquement un disque', () => {
    const manager = new StorageManager({
      default: 'dynamic',
      disks: {},
      registerLocalDriver: false,
    })

    manager.registerDriver('fake', FakeStorage)
    manager.addDisk('dynamic', { driver: 'fake', config: { env: 'test' } })

    const disk = manager.disk<FakeStorage>()
    expect(disk.config).toEqual({ env: 'test' })
  })

  it('refuse un nom de disque deja existant', () => {
    const manager = new StorageManager({
      default: 'diskA',
      disks: {
        diskA: { driver: 'fake', config: {} },
      },
      registerLocalDriver: false,
    })

    expect(() => manager.addDisk('diskA', { driver: 'fake', config: {} })).toThrow(InvalidConfigException.duplicateDiskName('diskA').message)
  })

  it('initialise tous les disques configures', async () => {
    const manager = new StorageManager({
      default: 'one',
      disks: {
        one: { driver: 'fake', config: { id: 1 } },
        two: { driver: 'fake', config: { id: 2 } },
      },
      registerLocalDriver: false,
    })

    manager.registerDriver('fake', FakeStorage)

    await manager.initDisks()

    const one = manager.disk<FakeStorage>('one')
    const two = manager.disk<FakeStorage>('two')
    expect(one.initCalls).toBe(1)
    expect(two.initCalls).toBe(1)
  })

  it('leve une erreur explicite quand un disque reference un driver inconnu, avant toute instanciation', async () => {
    const manager = new StorageManager({
      default: 'assets',
      disks: {
        assets: { driver: 's3', config: {} },
      },
      registerLocalDriver: false,
    })

    await expect(manager.initDisks()).rejects.toMatchObject({
      driver: 's3',
      disk: 'assets',
      message: 'Factorydrive driver "s3" required by disk "assets" is not registered. Declare it in "drivers" or call registerDriver() before module initialization.',
    })
    expect(manager.getDisks().size).toBe(0)
  })

  it('leve une erreur explicite depuis disk() quand le driver est inconnu', () => {
    const manager = new StorageManager({
      default: 'assets',
      disks: { assets: { driver: 's3', config: {} } },
      registerLocalDriver: false,
    })

    try {
      manager.disk()
    } catch (error) {
      expect(error).toBeInstanceOf(DriverNotSupportedException)
      expect((error as DriverNotSupportedException).driver).toBe('s3')
      expect((error as DriverNotSupportedException).disk).toBe('assets')
      return
    }

    throw new Error('Expected DriverNotSupportedException')
  })

  describe('drivers declaratifs', () => {
    it('enregistre les drivers declares dans la config et les rend disponibles pour les disques', () => {
      const manager = new StorageManager({
        default: 'memory',
        drivers: { memory: FakeStorage },
        disks: { memory: { driver: 'memory', config: { key: 'value' } } },
        registerLocalDriver: false,
      })

      expect(manager.getDrivers().get('memory')).toBe(FakeStorage)
      const disk = manager.disk<FakeStorage>()
      expect(disk).toBeInstanceOf(FakeStorage)
      expect(disk.config).toEqual({ key: 'value' })
    })

    it('permet a plusieurs disques de partager le meme driver declaratif avec des configs differentes', () => {
      const manager = new StorageManager({
        default: 'assets',
        drivers: { memory: FakeStorage },
        disks: {
          assets: { driver: 'memory', config: { bucket: 'assets' } },
          backups: { driver: 'memory', config: { bucket: 'backups' } },
        },
        registerLocalDriver: false,
      })

      const assets = manager.disk<FakeStorage>('assets')
      const backups = manager.disk<FakeStorage>('backups')

      expect(assets).not.toBe(backups)
      expect(assets.config).toEqual({ bucket: 'assets' })
      expect(backups.config).toEqual({ bucket: 'backups' })
    })

    it('leve une erreur quand une entree de drivers n est pas un constructeur', () => {
      expect(
        () =>
          new StorageManager({
            disks: {},
            registerLocalDriver: false,
            // biome-ignore lint/suspicious/noExplicitAny: valeur invalide testee intentionnellement
            drivers: { broken: 'not-a-class' as any },
          }),
      ).toThrow(InvalidConfigException.invalidDriver('broken').message)
    })
  })

  describe('politique de doublons', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('ne fait rien quand le meme driver est re-declare avec la meme classe (migration progressive)', () => {
      const manager = new StorageManager({
        disks: {},
        registerLocalDriver: false,
        drivers: { memory: FakeStorage },
      })

      expect(() => manager.registerDriver('memory', FakeStorage)).not.toThrow()
      expect(manager.getDrivers().get('memory')).toBe(FakeStorage)
    })

    it('leve une erreur quand registerDriver entre en conflit avec un driver declare dans drivers', () => {
      const manager = new StorageManager({
        disks: {},
        registerLocalDriver: false,
        drivers: { memory: FakeStorage },
      })

      expect(() => manager.registerDriver('memory', OtherFakeStorage)).toThrow(InvalidConfigException.duplicateDriverName('memory').message)
    })

    it('leve une erreur quand drivers redeclare le driver local integre', () => {
      expect(
        () =>
          new StorageManager({
            disks: {},
            drivers: { local: OtherFakeStorage },
          }),
      ).toThrow(InvalidConfigException.duplicateDriverName('local').message)
    })

    it('permet de remplacer local via drivers quand registerLocalDriver est desactive', () => {
      const manager = new StorageManager({
        disks: {},
        registerLocalDriver: false,
        drivers: { local: OtherFakeStorage },
      })

      expect(manager.getDrivers().get('local')).toBe(OtherFakeStorage)
    })

    it('remplace un driver legacy par un autre driver legacy avec un avertissement (comportement 2.0 conserve)', () => {
      const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)

      const manager = new StorageManager({ disks: {}, registerLocalDriver: false })
      manager.registerDriver('memory', FakeStorage)
      manager.registerDriver('memory', OtherFakeStorage)

      expect(manager.getDrivers().get('memory')).toBe(OtherFakeStorage)
      expect(warnSpy).toHaveBeenCalledTimes(1)
    })

    it('remplace le driver local integre via registerDriver avec un avertissement', () => {
      const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)

      const manager = new StorageManager({ disks: {} })
      manager.registerDriver('local', OtherFakeStorage)

      expect(manager.getDrivers().get('local')).toBe(OtherFakeStorage)
      expect(manager.getDrivers().get('local')).not.toBe(LocalFileSystemStorage)
      expect(warnSpy).toHaveBeenCalledTimes(1)
    })
  })
})

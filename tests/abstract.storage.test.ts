import { afterEach, describe, expect, it, vi } from 'vitest'
import AbstractStorage from '../src/factorydrive/abstract.storage'
import StorageManager from '../src/factorydrive/storage.manager'

class DefaultInitStorage extends AbstractStorage {}

describe('AbstractStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('onStorageInit par defaut resout sans ecrire dans la console', async () => {
    const logSpy = vi.spyOn(console, 'log')
    const disk = new DefaultInitStorage()

    const result = disk.onStorageInit()

    expect(result).toBeInstanceOf(Promise)
    await expect(result).resolves.toBeUndefined()
    expect(logSpy).not.toHaveBeenCalled()
  })

  it('initDisks reste silencieux pour un driver sans onStorageInit', async () => {
    const logSpy = vi.spyOn(console, 'log')
    const manager = new StorageManager({
      default: 'one',
      disks: {
        one: { driver: 'default-init', config: {} },
        two: { driver: 'default-init', config: {} },
      },
      registerLocalDriver: false,
    })
    manager.registerDriver('default-init', DefaultInitStorage)

    await manager.initDisks()

    expect(manager.getDisks().size).toBe(2)
    expect(logSpy).not.toHaveBeenCalled()
  })
})

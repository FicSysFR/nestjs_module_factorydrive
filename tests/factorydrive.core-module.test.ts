import { describe, expect, it } from 'vitest'
import type { StorageManagerConfig } from '../src/factorydrive'
import { FACTORYDRIVE_MODULE_OPTIONS_TOKEN } from '../src/factorydrive.constants'
import { FactorydriveCoreModule } from '../src/factorydrive.core-module'
import type { FactorydriveModuleOptionsFactory } from '../src/factorydrive.interfaces'
import { FactorydriveService } from '../src/factorydrive.service'

class TestOptionsFactory implements FactorydriveModuleOptionsFactory {
  public createFactorydriveModuleOptions(): StorageManagerConfig {
    return {
      default: 'main',
      disks: {},
    }
  }
}

describe('FactorydriveCoreModule', () => {
  it('forRoot expose le provider d options et le service', () => {
    const options: StorageManagerConfig = { default: 'main', disks: {} }
    const dynamicModule = FactorydriveCoreModule.forRoot(options)

    expect(dynamicModule.module).toBe(FactorydriveCoreModule)
    expect(dynamicModule.exports).toContain(FactorydriveService)

    const providers = dynamicModule.providers ?? []
    const optionsProvider = providers.find(
      (provider) => typeof provider === 'object' && provider !== null && 'provide' in provider && provider.provide === FACTORYDRIVE_MODULE_OPTIONS_TOKEN,
    ) as { provide: string; useValue: StorageManagerConfig } | undefined

    expect(optionsProvider).toBeDefined()
    expect(optionsProvider?.useValue).toEqual(options)
  })

  it('forRootAsync avec useFactory cree un provider injecte', async () => {
    const options: StorageManagerConfig = { default: 'factory', disks: {} }
    const dynamicModule = FactorydriveCoreModule.forRootAsync({
      useFactory: async () => options,
      inject: ['CONFIG_SERVICE'],
    })

    expect(dynamicModule.module).toBe(FactorydriveCoreModule)
    expect(dynamicModule.providers).toBeDefined()
    expect(dynamicModule.exports).toContain(FactorydriveService)

    const providers = dynamicModule.providers ?? []
    const asyncOptionsProvider = providers.find(
      (provider) => typeof provider === 'object' && provider !== null && 'provide' in provider && provider.provide === FACTORYDRIVE_MODULE_OPTIONS_TOKEN,
    ) as { inject?: unknown[]; useFactory: () => Promise<StorageManagerConfig> } | undefined

    expect(asyncOptionsProvider).toBeDefined()
    expect(asyncOptionsProvider?.inject).toEqual(['CONFIG_SERVICE'])
    await expect(asyncOptionsProvider?.useFactory()).resolves.toEqual(options)
  })

  it('forRootAsync avec useClass expose la classe et construit les options', async () => {
    const dynamicModule = FactorydriveCoreModule.forRootAsync({
      useClass: TestOptionsFactory,
    })

    const providers = dynamicModule.providers ?? []
    const classProvider = providers.find((provider) => typeof provider === 'object' && provider !== null && 'provide' in provider && provider.provide === TestOptionsFactory)
    const asyncOptionsProvider = providers.find(
      (provider) => typeof provider === 'object' && provider !== null && 'provide' in provider && provider.provide === FACTORYDRIVE_MODULE_OPTIONS_TOKEN,
    ) as { inject?: unknown[]; useFactory: (factory: FactorydriveModuleOptionsFactory) => Promise<StorageManagerConfig> } | undefined

    expect(classProvider).toBeDefined()
    expect(asyncOptionsProvider).toBeDefined()
    expect(asyncOptionsProvider?.inject).toEqual([TestOptionsFactory])

    const factory = new TestOptionsFactory()
    await expect(asyncOptionsProvider?.useFactory(factory)).resolves.toEqual(factory.createFactorydriveModuleOptions())
  })

  it('forRootAsync avec useExisting injecte la factory existante sans enregistrer de provider de classe', async () => {
    const dynamicModule = FactorydriveCoreModule.forRootAsync({
      useExisting: TestOptionsFactory,
    })

    const providers = dynamicModule.providers ?? []
    const classProvider = providers.find((provider) => typeof provider === 'object' && provider !== null && 'provide' in provider && provider.provide === TestOptionsFactory)
    const asyncOptionsProvider = providers.find(
      (provider) => typeof provider === 'object' && provider !== null && 'provide' in provider && provider.provide === FACTORYDRIVE_MODULE_OPTIONS_TOKEN,
    ) as { inject?: unknown[]; useFactory: (factory: FactorydriveModuleOptionsFactory) => Promise<StorageManagerConfig> } | undefined

    expect(classProvider).toBeUndefined()
    expect(providers).toHaveLength(2)
    expect(asyncOptionsProvider?.inject).toEqual([TestOptionsFactory])

    const factory = new TestOptionsFactory()
    await expect(asyncOptionsProvider?.useFactory(factory)).resolves.toEqual(factory.createFactorydriveModuleOptions())
  })
})

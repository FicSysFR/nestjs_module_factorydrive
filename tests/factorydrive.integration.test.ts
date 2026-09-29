import 'reflect-metadata'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { Module } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { afterEach, describe, expect, it } from 'vitest'
import { InvalidConfigException } from '../src/exceptions'
import AbstractStorage from '../src/factorydrive/abstract.storage'
import type { StorageManagerConfig } from '../src/factorydrive/types'
import type { FactorydriveModuleOptionsFactory } from '../src/factorydrive.interfaces'
import { FactorydriveModule } from '../src/factorydrive.module'
import { FactorydriveService } from '../src/factorydrive.service'

/**
 * Tests de bout en bout : ils démarrent une vraie application Nest
 * (`NestFactory.createApplicationContext`) plutôt que d'appeler `StorageManager`
 * directement, pour vérifier l'ordre d'initialisation réel (providers construits avant
 * les hooks `onModuleInit`) avec `forRoot()` et `forRootAsync()`.
 *
 * L'injection utilise des providers `useFactory` avec `inject: [...]` plutôt que des
 * décorateurs de paramètres de constructeur (`@Inject()` sur un `constructor`) : le
 * répertoire `tests/` n'est pas couvert par `tsconfig.json` (`include: ["src/**\/*"]`),
 * donc le transform esbuild/rolldown de Vitest n'y active pas `experimentalDecorators`
 * et rejette les décorateurs de paramètres à la position `constructor(@Inject() x)`. Les
 * décorateurs de classe comme `@Module()` restent valides dans les deux cas.
 */

/** Force l'exécution d'un effet de bord (ex. `registerDriver()`) pendant la construction
 * des providers, avant les hooks `onModuleInit`, sans décorateur de paramètre. */
const LEGACY_REGISTRATION_TOKEN = 'LEGACY_REGISTRATION_TOKEN'

function legacyDriverRegistrationProvider(register: (factorydrive: FactorydriveService) => void) {
  return {
    provide: LEGACY_REGISTRATION_TOKEN,
    useFactory: (factorydrive: FactorydriveService) => {
      register(factorydrive)
      return true
    },
    inject: [FactorydriveService],
  }
}

class MemoryStorage extends AbstractStorage {
  public initCalls = 0

  public constructor(public readonly config: unknown) {
    super()
  }

  public async onStorageInit(): Promise<void> {
    this.initCalls += 1
  }
}

class OtherMemoryStorage extends AbstractStorage {
  public constructor(public readonly config: unknown) {
    super()
  }
}

describe('Factorydrive (integration Nest)', () => {
  let app: { close: () => Promise<void> } | undefined
  let tmpRoot: string | undefined

  afterEach(async () => {
    await app?.close()
    app = undefined
    if (tmpRoot) {
      await rm(tmpRoot, { recursive: true, force: true })
      tmpRoot = undefined
    }
  })

  it('forRoot() avec drivers declaratifs initialise le disque et appelle onStorageInit une fois', async () => {
    @Module({
      imports: [
        FactorydriveModule.forRoot({
          default: 'assets',
          drivers: { memory: MemoryStorage },
          disks: { assets: { driver: 'memory', config: { bucket: 'assets' } } },
        }),
      ],
    })
    class AppModule {}

    const context = await NestFactory.createApplicationContext(AppModule, { logger: false, abortOnError: false })
    app = context

    const factorydrive = context.get(FactorydriveService)
    const disk = factorydrive.getDisk<MemoryStorage>()

    expect(disk).toBeInstanceOf(MemoryStorage)
    expect(disk.config).toEqual({ bucket: 'assets' })
    expect(disk.initCalls).toBe(1)
  })

  it('forRootAsync() avec useFactory injectant un provider importe declare aussi ses drivers', async () => {
    const CONFIG_TOKEN = 'INTEGRATION_CONFIG_TOKEN'

    @Module({
      providers: [{ provide: CONFIG_TOKEN, useValue: { bucket: 'from-config-module' } }],
      exports: [CONFIG_TOKEN],
    })
    class ConfigModule {}

    @Module({
      imports: [
        ConfigModule,
        FactorydriveModule.forRootAsync({
          imports: [ConfigModule],
          inject: [CONFIG_TOKEN],
          useFactory: (config: { bucket: string }): StorageManagerConfig => ({
            default: 'assets',
            drivers: { memory: MemoryStorage },
            disks: { assets: { driver: 'memory', config } },
          }),
        }),
      ],
    })
    class AppModule {}

    const context = await NestFactory.createApplicationContext(AppModule, { logger: false, abortOnError: false })
    app = context

    const disk = context.get(FactorydriveService).getDisk<MemoryStorage>()
    expect(disk.config).toEqual({ bucket: 'from-config-module' })
  })

  it('forRootAsync() avec useClass declare aussi ses drivers', async () => {
    class OptionsFactory implements FactorydriveModuleOptionsFactory {
      public createFactorydriveModuleOptions(): StorageManagerConfig {
        return {
          default: 'assets',
          drivers: { memory: MemoryStorage },
          disks: { assets: { driver: 'memory', config: { bucket: 'from-use-class' } } },
        }
      }
    }

    @Module({
      imports: [FactorydriveModule.forRootAsync({ useClass: OptionsFactory })],
    })
    class AppModule {}

    const context = await NestFactory.createApplicationContext(AppModule, { logger: false, abortOnError: false })
    app = context

    const disk = context.get(FactorydriveService).getDisk<MemoryStorage>()
    expect(disk.config).toEqual({ bucket: 'from-use-class' })
  })

  it('forRootAsync() avec useExisting reutilise la factory exportee par un module importe', async () => {
    class OptionsFactory implements FactorydriveModuleOptionsFactory {
      public calls = 0

      public createFactorydriveModuleOptions(): StorageManagerConfig {
        this.calls += 1
        return {
          default: 'assets',
          drivers: { memory: MemoryStorage },
          disks: { assets: { driver: 'memory', config: { bucket: 'from-use-existing' } } },
        }
      }
    }

    @Module({
      providers: [OptionsFactory],
      exports: [OptionsFactory],
    })
    class OptionsModule {}

    @Module({
      imports: [FactorydriveModule.forRootAsync({ imports: [OptionsModule], useExisting: OptionsFactory })],
    })
    class AppModule {}

    const context = await NestFactory.createApplicationContext(AppModule, { logger: false, abortOnError: false })
    app = context

    const disk = context.get(FactorydriveService).getDisk<MemoryStorage>()
    expect(disk).toBeInstanceOf(MemoryStorage)
    expect(disk.config).toEqual({ bucket: 'from-use-existing' })
    // L'instance exportee par OptionsModule est reutilisee : aucune seconde instance n'est creee.
    expect(context.get(OptionsFactory).calls).toBe(1)
  })

  it('conserve la compatibilite legacy : registerDriver() enregistre avant onModuleInit', async () => {
    @Module({
      imports: [
        FactorydriveModule.forRoot({
          default: 'legacy',
          disks: { legacy: { driver: 'legacy', config: { bucket: 'legacy' } } },
        }),
      ],
      providers: [legacyDriverRegistrationProvider((factorydrive) => factorydrive.registerDriver('legacy', MemoryStorage))],
    })
    class AppModule {}

    const context = await NestFactory.createApplicationContext(AppModule, { logger: false, abortOnError: false })
    app = context

    const disk = context.get(FactorydriveService).getDisk<MemoryStorage>()
    expect(disk).toBeInstanceOf(MemoryStorage)
    expect(disk.config).toEqual({ bucket: 'legacy' })
  })

  it('permet de re-declarer le meme driver (declaratif puis registerDriver) sans erreur pendant une migration', async () => {
    @Module({
      imports: [
        FactorydriveModule.forRoot({
          default: 'assets',
          drivers: { memory: MemoryStorage },
          disks: { assets: { driver: 'memory', config: {} } },
        }),
      ],
      providers: [legacyDriverRegistrationProvider((factorydrive) => factorydrive.registerDriver('memory', MemoryStorage))],
    })
    class AppModule {}

    const context = await NestFactory.createApplicationContext(AppModule, { logger: false, abortOnError: false })
    app = context

    expect(context.get(FactorydriveService).getDisk()).toBeInstanceOf(MemoryStorage)
  })

  it('rejette le bootstrap quand registerDriver() entre en conflit avec un driver declare dans drivers', async () => {
    @Module({
      imports: [
        FactorydriveModule.forRoot({
          default: 'assets',
          drivers: { memory: MemoryStorage },
          disks: { assets: { driver: 'memory', config: {} } },
        }),
      ],
      providers: [legacyDriverRegistrationProvider((factorydrive) => factorydrive.registerDriver('memory', OtherMemoryStorage))],
    })
    class AppModule {}

    await expect(NestFactory.createApplicationContext(AppModule, { logger: false, abortOnError: false })).rejects.toThrow(
      InvalidConfigException.duplicateDriverName('memory').message,
    )
  })

  it('rejette le bootstrap avec un message explicite quand un disque reference un driver jamais enregistre', async () => {
    @Module({
      imports: [
        FactorydriveModule.forRoot({
          default: 'assets',
          disks: { assets: { driver: 's3', config: {} } },
        }),
      ],
    })
    class AppModule {}

    await expect(NestFactory.createApplicationContext(AppModule, { logger: false, abortOnError: false })).rejects.toThrow(
      'Factorydrive driver "s3" required by disk "assets" is not registered. Declare it in "drivers" or call registerDriver() before module initialization.',
    )
  })

  it('supporte plusieurs disques : deux disques memory partageant un driver, un disque local reel', async () => {
    tmpRoot = await mkdtemp(join(tmpdir(), 'factorydrive-integration-'))

    @Module({
      imports: [
        FactorydriveModule.forRoot({
          default: 'assets',
          drivers: { memory: MemoryStorage },
          disks: {
            assets: { driver: 'memory', config: { bucket: 'assets' } },
            backups: { driver: 'memory', config: { bucket: 'backups' } },
            temporary: { driver: 'local', config: { root: tmpRoot } },
          },
        }),
      ],
    })
    class AppModule {}

    const context = await NestFactory.createApplicationContext(AppModule, { logger: false, abortOnError: false })
    app = context
    const factorydrive = context.get(FactorydriveService)

    const assets = factorydrive.getDisk<MemoryStorage>('assets')
    const backups = factorydrive.getDisk<MemoryStorage>('backups')
    expect(assets).not.toBe(backups)
    expect(assets.config).toEqual({ bucket: 'assets' })
    expect(backups.config).toEqual({ bucket: 'backups' })

    const temporary = factorydrive.getDisk('temporary')
    await temporary.put('greeting.txt', Buffer.from('hello-buffer'))
    const { content: bufferContent } = await temporary.getBuffer('greeting.txt')
    expect(bufferContent.toString()).toBe('hello-buffer')

    await temporary.put('stream.txt', Readable.from(['hello-', 'stream']))
    const readable = await temporary.getStream('stream.txt')
    const chunks: Buffer[] = []
    for await (const chunk of readable) chunks.push(chunk as Buffer)
    expect(Buffer.concat(chunks).toString()).toBe('hello-stream')

    expect((await temporary.exists('greeting.txt')).exists).toBe(true)
    await temporary.delete('greeting.txt')
    expect((await temporary.exists('greeting.txt')).exists).toBe(false)
  })
})

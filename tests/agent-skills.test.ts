import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MethodNotSupportedException } from '../src/exceptions'
import AbstractStorage from '../src/factorydrive/abstract.storage'
import { FactorydriveService } from '../src/factorydrive.service'

const projectRoot = resolve(import.meta.dirname, '..')
const publicRoot = resolve(projectRoot, 'agent-skills/public')
const maintenanceRoot = resolve(projectRoot, 'agent-skills/maintenance')
const expectedSkills = {
  public: ['factorydrive-driver', 'use-factorydrive'],
  maintenance: ['github-release', 'spec-driven'],
}

function directoryNames(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

function collectFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name)
    return entry.isDirectory() ? collectFiles(path) : [path]
  })
}

function nonLinkEntries(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => !entry.isSymbolicLink())
    .map((entry) => resolve(root, entry.name))
}

function parseFrontmatter(path: string): { name: string; description: string } {
  const content = readFileSync(path, 'utf8')
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  expect(match, `${relative(projectRoot, path)} must start with YAML frontmatter`).not.toBeNull()

  const lines = match?.[1].split(/\r?\n/) ?? []
  const name =
    lines
      .find((line) => line.startsWith('name:'))
      ?.slice('name:'.length)
      .trim() ?? ''
  const descriptionIndex = lines.findIndex((line) => line.startsWith('description:'))
  const descriptionValue = descriptionIndex >= 0 ? lines[descriptionIndex].slice('description:'.length).trim() : ''
  const description = ['>', '>-', '|', '|-'].includes(descriptionValue)
    ? lines
        .slice(descriptionIndex + 1)
        .filter((line) => /^\s+/.test(line))
        .map((line) => line.trim())
        .join(' ')
    : descriptionValue

  return { name, description }
}

function markdownTargets(path: string): string[] {
  const content = readFileSync(path, 'utf8')
  return [...content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
    .map((match) => match[1])
    .filter((target) => !/^(?:https?:|mailto:|#)/.test(target))
    .map((target) => target.split('#', 1)[0])
    .filter(Boolean)
}

describe('Factorydrive Agent Skills pack', () => {
  it('contains exactly the declared public and maintenance skills', () => {
    expect(directoryNames(publicRoot)).toEqual(expectedSkills.public)
    expect(directoryNames(maintenanceRoot)).toEqual(expectedSkills.maintenance)

    const declaration = JSON.parse(readFileSync(resolve(projectRoot, '.agents/skill-sources.json'), 'utf8'))
    expect(declaration).toEqual({
      schemaVersion: 1,
      sources: [{ path: 'agent-skills/public' }, { path: 'agent-skills/maintenance' }],
    })
    for (const source of declaration.sources) expect(statSync(resolve(projectRoot, source.path)).isDirectory()).toBe(true)

    for (const adapterRoot of ['.agents/skills', '.claude/skills']) {
      const path = resolve(projectRoot, adapterRoot)
      if (existsSync(path)) expect(nonLinkEntries(path)).toEqual([])
    }
  })

  it('has valid frontmatter whose name matches each directory', () => {
    for (const root of [publicRoot, maintenanceRoot]) {
      for (const directory of directoryNames(root)) {
        const frontmatter = parseFrontmatter(resolve(root, directory, 'SKILL.md'))
        expect(frontmatter.name).toBe(directory)
        expect(frontmatter.description.length).toBeGreaterThan(0)
      }
    }
  })

  it('keeps every local Markdown reference resolvable', () => {
    for (const root of [publicRoot, maintenanceRoot]) {
      for (const path of collectFiles(root).filter((file) => file.endsWith('.md'))) {
        for (const target of markdownTargets(path)) {
          expect(existsSync(resolve(dirname(path), target)), `${relative(projectRoot, path)} -> ${target}`).toBe(true)
        }
      }
    }
  })

  it('keeps the public pack independent of unsupported tools and package managers', () => {
    const content = collectFiles(publicRoot)
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n')
    expect(content).not.toMatch(/\b(?:Bun|Jest|Fysion)\b/i)
    expect(content).not.toMatch(/\bnpm\s+(?:install|i)\b/i)
    expect(content).toContain('yarn add @ficsysfr/nestjs_module_factorydrive')
    expect(content).toContain('Vitest')
  })

  it('documents the packaged path and Yarn installation without an adapter dependency', () => {
    const readme = readFileSync(resolve(projectRoot, 'README.md'), 'utf8')
    expect(readme).toContain('yarn add @ficsysfr/nestjs_module_factorydrive')
    expect(readme).toContain('node_modules/@ficsysfr/nestjs_module_factorydrive/agent-skills/public')
    expect(readme).not.toMatch(/Fysion/i)
  })

  it('illustrates the current subclass and direct registration contracts', () => {
    class ConfigurableStorage extends AbstractStorage {
      public constructor(public readonly config: unknown) {
        super()
      }
    }

    const config = { endpoint: 'memory://test' }
    const factorydrive = new FactorydriveService({
      default: 'custom',
      disks: { custom: { driver: 'custom', config } },
      registerLocalDriver: false,
    })

    factorydrive.registerDriver('custom', ConfigurableStorage)
    const disk = factorydrive.getDisk<ConfigurableStorage>()

    expect(disk).toBeInstanceOf(ConfigurableStorage)
    expect(disk.config).toBe(config)
    expect(() => disk.put('file.txt', 'content')).toThrow(MethodNotSupportedException)

    const driverSkill = readFileSync(resolve(publicRoot, 'factorydrive-driver/SKILL.md'), 'utf8')
    expect(driverSkill).toContain("factorydrive.registerDriver('provider-key', ProviderStorage)")
    expect(driverSkill).toContain('does not declare abstract methods')
    expect(driverSkill).toContain('do not export a registration function')
    expect(driverSkill).toContain('drivers: {')
  })

  it('illustrates the declarative drivers contract (forRoot({ drivers }))', () => {
    class ConfigurableStorage extends AbstractStorage {
      public constructor(public readonly config: unknown) {
        super()
      }
    }

    const config = { endpoint: 'memory://test' }
    const factorydrive = new FactorydriveService({
      default: 'custom',
      drivers: { custom: ConfigurableStorage },
      disks: { custom: { driver: 'custom', config } },
    })

    const disk = factorydrive.getDisk<ConfigurableStorage>()

    expect(disk).toBeInstanceOf(ConfigurableStorage)
    expect(disk.config).toBe(config)

    const configurationReference = readFileSync(resolve(publicRoot, 'use-factorydrive/references/configuration.md'), 'utf8')
    expect(configurationReference).toContain('drivers: {')
    expect(configurationReference).toContain('registerDriver')
  })
})

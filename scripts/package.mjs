import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const CORE_NAME = '@ficsysfr/nestjs_module_factorydrive'
const MCP_NAME = '@ficsysfr/nestjs_module_factorydrive-mcp'
const REPOSITORY_URL = 'https://github.com/FicSysFR/nestjs_module_factorydrive.git'
const BUGS_URL = 'https://github.com/FicSysFR/nestjs_module_factorydrive/issues'
const MAX_PACKED_BYTES = 1024 * 1024
export const CORE_PUBLIC_SKILL_FILES = [
  'agent-skills/public/factorydrive-driver/SKILL.md',
  'agent-skills/public/use-factorydrive/SKILL.md',
  'agent-skills/public/use-factorydrive/agents/openai.yaml',
  'agent-skills/public/use-factorydrive/references/configuration.md',
  'agent-skills/public/use-factorydrive/references/drivers.md',
  'agent-skills/public/use-factorydrive/references/operations.md',
  'agent-skills/public/use-factorydrive/references/signed-urls.md',
]
const REQUIRED_FILES = {
  [CORE_NAME]: ['LICENSE', 'README.md', 'dist/index.d.ts', 'dist/index.js', 'package.json', ...CORE_PUBLIC_SKILL_FILES],
  [MCP_NAME]: ['LICENSE', 'README.md', 'dist/docs-client.js', 'dist/index.d.ts', 'dist/index.js', 'dist/tools.js', 'package.json'],
}
const FORBIDDEN_PATHS =
  /(?:^|\/)(?:\.agents?(?:\/|$)|\.claude(?:\/|$)|\.fysion(?:\/|$)|agent-skills\/maintenance(?:\/|$)|\.env(?:\.|$)|\.git(?:\/|$)|\.npmrc$|\.tsbuildinfo$|node_modules(?:\/|$)|src(?:\/|$)|tests?(?:\/|$)|specs?(?:\/|$)|[^/]+\.(?:key|pem)$)/i
const ALLOWED_PATHS = /^(?:LICENSE|README\.md|package\.json|dist\/(?:LICENSE|README\.md|package\.json|.+\.(?:js|js\.map|d\.ts|d\.ts\.map)))$/
const AGENT_RUNTIME_DEPENDENCY = /(?:^|[/_-])(?:agents?|agentic|skills?|fysion)(?:$|[/_-])/i
const PUBLIC_SKILL_FORBIDDEN_TERMS = /\b(?:Bun|Jest|Fysion)\b/i

function run(command, args, cwd, options = {}) {
  let resolvedCommand = command
  if (process.platform === 'win32' && (command === 'npm' || command === 'yarn')) {
    const lookup = spawnSync('where.exe', [`${command}.cmd`], { cwd, encoding: 'utf8', shell: false })
    resolvedCommand = lookup.stdout.trim().split(/\r?\n/).filter(Boolean).at(-1) ?? `${command}.cmd`
  }
  const windowsCommand = [resolvedCommand, ...args].map((value) => `"${value.replaceAll('"', '""')}"`).join(' ')
  const result =
    process.platform === 'win32'
      ? spawnSync(windowsCommand, { cwd, encoding: 'utf8', shell: true, ...options })
      : spawnSync(command, args, { cwd, encoding: 'utf8', shell: false, ...options })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.error?.message ?? ''}\n${result.stdout ?? ''}${result.stderr ?? ''}`)
  }
  return result.stdout.trim()
}

export function validateManifestPair(coreManifest, mcpManifest) {
  if (coreManifest.name !== CORE_NAME) throw new Error(`Unexpected core package name: ${coreManifest.name}`)
  if (mcpManifest.name !== MCP_NAME) throw new Error(`Unexpected MCP package name: ${mcpManifest.name}`)
  if (coreManifest.version !== mcpManifest.version) {
    throw new Error(`Core and MCP versions differ: ${coreManifest.version} vs ${mcpManifest.version}`)
  }
  if (!/^\d+\.\d+\.\d+$/.test(coreManifest.version)) throw new Error(`Invalid exact version: ${coreManifest.version}`)
  for (const [manifest, homepage] of [
    [coreManifest, 'https://ficsysfr.github.io/nestjs_module_factorydrive/'],
    [mcpManifest, 'https://ficsysfr.github.io/nestjs_module_factorydrive/en/guide/ai'],
  ]) {
    if (manifest.repository !== REPOSITORY_URL || manifest.homepage !== homepage || manifest.bugs?.url !== BUGS_URL) {
      throw new Error(`Unexpected canonical URLs for ${manifest.name}`)
    }
    if (manifest.publishConfig?.access !== 'public' || manifest.publishConfig?.registry !== 'https://registry.npmjs.org/') {
      throw new Error(`Unexpected npm publication metadata for ${manifest.name}`)
    }
  }
  if (mcpManifest.bin?.['nestjs-module-factorydrive-mcp'] !== './dist/index.js') {
    throw new Error('MCP binary declaration is missing or incorrect')
  }
  if (mcpManifest.engines?.node !== '>=22.0.0') throw new Error('MCP must require Node >=22.0.0')
  if (!coreManifest.files?.includes('agent-skills/public/**/*')) {
    throw new Error('Core package must include the public Agent Skills pack')
  }
  for (const scriptName of ['preinstall', 'install', 'postinstall']) {
    if (coreManifest.scripts?.[scriptName]) throw new Error(`Core package must not define a ${scriptName} lifecycle script`)
  }
  for (const dependencyGroup of ['dependencies', 'optionalDependencies']) {
    const dependency = Object.keys(coreManifest[dependencyGroup] ?? {}).find((name) => AGENT_RUNTIME_DEPENDENCY.test(name))
    if (dependency) throw new Error(`Core package contains agent runtime dependency ${dependency}`)
  }
}

export function validatePackMetadata(pack) {
  const required = REQUIRED_FILES[pack.name]
  if (!required) throw new Error(`Unexpected packed package: ${pack.name}`)
  if (pack.size > MAX_PACKED_BYTES) throw new Error(`${pack.name} tarball exceeds ${MAX_PACKED_BYTES} bytes`)

  const paths = pack.files.map((file) => file.path.replaceAll('\\', '/'))
  for (const requiredPath of required) {
    if (!paths.includes(requiredPath)) throw new Error(`${pack.name} is missing ${requiredPath}`)
  }
  const forbidden = paths.find((path) => FORBIDDEN_PATHS.test(path))
  if (forbidden) throw new Error(`${pack.name} contains forbidden path ${forbidden}`)
  const unexpected = paths.find((path) => !ALLOWED_PATHS.test(path) && !(pack.name === CORE_NAME && CORE_PUBLIC_SKILL_FILES.includes(path)))
  if (unexpected) throw new Error(`${pack.name} contains non-allowlisted path ${unexpected}`)
}

export function parsePackOutput(output) {
  const parsed = JSON.parse(output)
  const reports = Array.isArray(parsed) ? parsed : parsed?.name ? [parsed] : parsed && typeof parsed === 'object' ? Object.values(parsed) : []
  const report = reports[0]
  if (reports.length !== 1 || report === null || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error('npm pack returned an unexpected report')
  }
  return report
}

async function sha256(path) {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex')
}

async function pathExists(path) {
  try {
    await access(path)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

/**
 * Liste les fichiers d'un rapport `npm pack` dont la copie installée diffère de la source
 * empaquetée (ou manque). Garantit que l'audit porte bien sur le tarball tout juste créé.
 */
export async function findInstalledMismatches(pack, sourceRoot, installedRoot) {
  const mismatches = []
  for (const file of pack.files) {
    const segments = file.path.replaceAll('\\', '/').split('/')
    const packed = await readFile(join(sourceRoot, ...segments))
    const installed = await readFile(join(installedRoot, ...segments)).catch((error) => {
      if (error?.code === 'ENOENT') return undefined
      throw error
    })
    if (!installed?.equals(packed)) mismatches.push(file.path)
  }
  return mismatches
}

async function auditInstalledTarballs(packs, projectRoot) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'factorydrive-package-audit-'))
  try {
    await writeFile(join(temporaryRoot, 'package.json'), '{"name":"factorydrive-package-audit","private":true}')
    run(
      'yarn',
      [
        'add',
        // Cache isolé : Yarn 1 mémorise un tarball local d'après son chemin absolu
        // (`<cache>/.tmp/<md5(chemin)>`) et réinstallerait une ancienne copie de même
        // nom@version, par exemple depuis le cache Yarn restauré en CI.
        '--cache-folder',
        join(temporaryRoot, '.yarn-cache'),
        '--ignore-scripts',
        '--non-interactive',
        '--no-progress',
        ...packs.map((pack) => pack.tarball),
        '@nestjs/common@11',
        '@nestjs/core@11',
        'reflect-metadata@0.2',
        'rxjs@7',
        'typescript@5',
        '@types/node@22',
        '@types/fs-extra@11',
      ],
      temporaryRoot,
    )

    for (const { report, sourceRoot } of packs) {
      const installedRoot = join(temporaryRoot, 'node_modules', ...report.name.split('/'))
      const mismatches = await findInstalledMismatches(report, sourceRoot, installedRoot)
      if (mismatches.length > 0) {
        throw new Error(`Installed ${report.name} does not match the packed tarball (${mismatches.join(', ')}); a package manager cache served a stale copy`)
      }
    }

    const corePackage = join(temporaryRoot, 'node_modules', '@ficsysfr', 'nestjs_module_factorydrive', 'package.json')
    const mcpPackage = join(temporaryRoot, 'node_modules', '@ficsysfr', 'nestjs_module_factorydrive-mcp', 'package.json')
    const coreManifest = JSON.parse(await readFile(corePackage, 'utf8'))
    const mcpManifest = JSON.parse(await readFile(mcpPackage, 'utf8'))
    validateManifestPair(coreManifest, mcpManifest)

    const installedCoreRoot = dirname(corePackage)
    for (const path of CORE_PUBLIC_SKILL_FILES) {
      const content = await readFile(join(installedCoreRoot, ...path.split('/')), 'utf8')
      if (PUBLIC_SKILL_FORBIDDEN_TERMS.test(content)) throw new Error(`Installed public skill contains a forbidden term: ${path}`)
    }
    for (const path of ['agent-skills/maintenance', '.agents', '.claude', '.fysion']) {
      if (await pathExists(join(installedCoreRoot, ...path.split('/')))) throw new Error(`Installed core contains forbidden path ${path}`)
    }

    const binary = join(dirname(mcpPackage), 'dist', 'index.js')
    const source = await readFile(binary, 'utf8')
    if (!source.startsWith('#!/usr/bin/env node\n')) throw new Error('Installed MCP binary has no Node.js shebang')
    run(process.execPath, ['--check', binary], temporaryRoot)

    const importScript = `import('${CORE_NAME}').then((module) => { if (typeof module.FactorydriveService !== 'function') throw new Error('ESM core export missing') })`
    run(process.execPath, ['--input-type=module', '--eval', importScript], temporaryRoot)
    const requireScript = `const module = require('${CORE_NAME}'); if (typeof module.FactorydriveService !== 'function') throw new Error('CommonJS core export missing')`
    run(process.execPath, ['--eval', requireScript], temporaryRoot)

    const typesSmokeSource = [
      `import { AbstractStorage, FactorydriveModule, FactorydriveService } from '${CORE_NAME}'`,
      `import type { StorageDriverConstructor, StorageManagerConfig } from '${CORE_NAME}'`,
      `import '${MCP_NAME}'`,
      'void FactorydriveService',
      '',
      '// Preuve que StorageDriverConstructor<TConfig> accepte un vrai driver typé sous',
      "// `strict: true` (`strictFunctionTypes`), c'est-à-dire que `drivers` reste utilisable",
      '// avec un constructeur dont la config est précisément typée, pas `unknown`.',
      'interface TypedConfig {',
      '  bucket: string',
      '}',
      '',
      'class TypedStorage extends AbstractStorage {',
      '  public constructor(public readonly config: TypedConfig) {',
      '    super()',
      '  }',
      '}',
      '',
      'const driverConstructor: StorageDriverConstructor<TypedConfig> = TypedStorage',
      'void driverConstructor',
      '',
      'const syncOptions: StorageManagerConfig = {',
      "  default: 'typed',",
      '  drivers: { typed: TypedStorage },',
      "  disks: { typed: { driver: 'typed', config: { bucket: 'audit' } satisfies TypedConfig } },",
      '}',
      'FactorydriveModule.forRoot(syncOptions)',
      '',
      'FactorydriveModule.forRootAsync({',
      '  useFactory: (): StorageManagerConfig => syncOptions,',
      '})',
      '',
    ].join('\n')
    await writeFile(join(temporaryRoot, 'types-smoke.ts'), typesSmokeSource)
    await writeFile(
      join(temporaryRoot, 'tsconfig.json'),
      `${JSON.stringify({ compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext', target: 'ES2022', strict: true, noEmit: true }, files: ['types-smoke.ts'] }, null, 2)}\n`,
    )
    run(process.execPath, [join(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.json'], temporaryRoot)

    const initialize = `${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'package-audit', version: '1.0.0' } } })}\n`
    const initialized = run(process.execPath, [binary], temporaryRoot, { input: initialize, timeout: 10_000 })
    if (!initialized.includes('factorydrive-docs')) throw new Error('Installed MCP binary did not initialize')
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

export async function packageAndAudit(projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  const artifactsRoot = join(projectRoot, '.artifacts', 'npm')
  await rm(artifactsRoot, { recursive: true, force: true })
  await mkdir(artifactsRoot, { recursive: true })

  run('yarn', ['build'], projectRoot)
  run('yarn', ['--cwd', 'mcp', 'build'], projectRoot)

  const coreManifest = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'))
  const mcpManifest = JSON.parse(await readFile(join(projectRoot, 'mcp', 'package.json'), 'utf8'))
  validateManifestPair(coreManifest, mcpManifest)

  const packs = [projectRoot, join(projectRoot, 'mcp')].map((sourceRoot) => {
    const report = parsePackOutput(run('npm', ['pack', '.', '--json', '--ignore-scripts', '--pack-destination', artifactsRoot], sourceRoot))
    validatePackMetadata(report)
    return { report, sourceRoot, tarball: join(artifactsRoot, report.filename) }
  })
  const reports = packs.map((pack) => pack.report)
  await auditInstalledTarballs(packs, projectRoot)

  const audit = {
    version: coreManifest.version,
    generatedAt: new Date().toISOString(),
    packages: await Promise.all(
      reports.map(async (report) => ({
        name: report.name,
        version: report.version,
        filename: report.filename,
        size: report.size,
        unpackedSize: report.unpackedSize,
        totalFiles: report.files.length,
        sha256: await sha256(join(artifactsRoot, report.filename)),
      })),
    ),
  }
  await writeFile(join(artifactsRoot, 'manifest.json'), `${JSON.stringify(audit, null, 2)}\n`)
  const checksumLines = [...audit.packages].sort((left, right) => left.filename.localeCompare(right.filename)).map((item) => `${item.sha256}  ${item.filename}`)
  await writeFile(join(artifactsRoot, 'SHA256SUMS.txt'), `${checksumLines.join('\n')}\n`)
  return audit
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const audit = await packageAndAudit()
  for (const item of audit.packages) {
    console.log(`${item.name}@${item.version}: ${item.filename} (${item.size} bytes, sha256 ${item.sha256})`)
  }
}

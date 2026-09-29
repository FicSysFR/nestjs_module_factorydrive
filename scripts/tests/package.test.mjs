import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { CORE_PUBLIC_SKILL_FILES, findInstalledMismatches, parsePackOutput, validateManifestPair, validatePackMetadata } from '../package.mjs'

const publication = {
  repository: 'https://github.com/FicSysFR/nestjs_module_factorydrive.git',
  bugs: { url: 'https://github.com/FicSysFR/nestjs_module_factorydrive/issues' },
  publishConfig: { access: 'public', registry: 'https://registry.npmjs.org/' },
}

function coreManifest(overrides = {}) {
  return {
    name: '@ficsysfr/nestjs_module_factorydrive',
    version: '2.0.0',
    homepage: 'https://ficsysfr.github.io/nestjs_module_factorydrive/',
    files: ['dist/**/*', 'agent-skills/public/**/*', 'README.md', 'LICENSE'],
    ...publication,
    ...overrides,
  }
}

function mcpManifest(overrides = {}) {
  return {
    name: '@ficsysfr/nestjs_module_factorydrive-mcp',
    version: '2.0.0',
    homepage: 'https://ficsysfr.github.io/nestjs_module_factorydrive/en/guide/ai',
    ...publication,
    bin: { 'nestjs-module-factorydrive-mcp': './dist/index.js' },
    engines: { node: '>=22.0.0' },
    ...overrides,
  }
}

function corePackFiles(extra = []) {
  return [
    { path: 'LICENSE' },
    { path: 'README.md' },
    { path: 'dist/index.d.ts' },
    { path: 'dist/index.js' },
    { path: 'package.json' },
    ...CORE_PUBLIC_SKILL_FILES.map((path) => ({ path })),
    ...extra.map((path) => ({ path })),
  ]
}

test('parsePackOutput supports npm 11 arrays and npm 12 maps', () => {
  const report = { name: '@ficsysfr/nestjs_module_factorydrive', version: '2.0.0' }
  assert.deepEqual(parsePackOutput(JSON.stringify([report])), report)
  assert.deepEqual(parsePackOutput(JSON.stringify(report)), report)
  assert.deepEqual(parsePackOutput(JSON.stringify({ [report.name]: report })), report)
})

test('parsePackOutput rejects invalid or ambiguous reports', () => {
  for (const value of [[], [{}, {}], {}, { one: {}, two: {} }, null, 'report', 1, [[]]]) {
    assert.throws(() => parsePackOutput(JSON.stringify(value)), /unexpected report/)
  }
})

test('validateManifestPair requires synchronized versions and the MCP binary', () => {
  assert.doesNotThrow(() => validateManifestPair(coreManifest(), mcpManifest()))
  assert.throws(() => validateManifestPair(coreManifest(), mcpManifest({ version: '2.0.1' })), /versions differ/)
  assert.throws(() => validateManifestPair(coreManifest({ homepage: 'https://example.invalid/' }), mcpManifest()), /canonical URLs/)
})

test('validateManifestPair requires the public pack without lifecycle hooks or agent runtime dependencies', () => {
  assert.throws(() => validateManifestPair(coreManifest({ files: ['dist/**/*'] }), mcpManifest()), /public Agent Skills pack/)
  assert.throws(() => validateManifestPair(coreManifest({ scripts: { postinstall: 'node install.mjs' } }), mcpManifest()), /postinstall/)
  assert.throws(() => validateManifestPair(coreManifest({ dependencies: { '@example/agent-skills-runtime': '1.0.0' } }), mcpManifest()), /agent runtime dependency/)
  assert.throws(() => validateManifestPair(coreManifest({ optionalDependencies: { fysion: '1.0.0' } }), mcpManifest()), /agent runtime dependency/)
})

test('validatePackMetadata accepts the exact public Agent Skills inventory', () => {
  assert.doesNotThrow(() =>
    validatePackMetadata({
      name: '@ficsysfr/nestjs_module_factorydrive',
      size: 100,
      files: corePackFiles(),
    }),
  )
})

test('validatePackMetadata requires every public Agent Skills resource', () => {
  const files = corePackFiles().filter(({ path }) => path !== CORE_PUBLIC_SKILL_FILES.at(-1))
  assert.throws(() => validatePackMetadata({ name: '@ficsysfr/nestjs_module_factorydrive', size: 100, files }), /is missing agent-skills\/public/)
})

test('validatePackMetadata rejects private skill and adapter paths', () => {
  for (const path of [
    'agent-skills/maintenance/spec-driven/SKILL.md',
    '.agents/skills/use-factorydrive/SKILL.md',
    '.claude/skills/use-factorydrive/SKILL.md',
    '.fysion/manifest.json',
  ]) {
    assert.throws(
      () =>
        validatePackMetadata({
          name: '@ficsysfr/nestjs_module_factorydrive',
          size: 100,
          files: corePackFiles([path]),
        }),
      /forbidden path/,
    )
  }
})

test('validatePackMetadata rejects source files', () => {
  assert.throws(
    () =>
      validatePackMetadata({
        name: '@ficsysfr/nestjs_module_factorydrive',
        size: 100,
        files: corePackFiles(['src/index.ts']),
      }),
    /forbidden path/,
  )
})

test('findInstalledMismatches detects stale or missing installed files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'factorydrive-mismatch-'))
  try {
    const writeTree = async (base, files) => {
      for (const [path, content] of Object.entries(files)) {
        await mkdir(join(base, 'dist'), { recursive: true })
        await writeFile(join(base, path), content)
      }
    }
    await writeTree(join(root, 'source'), { 'package.json': '{}', 'dist/index.d.ts': 'export declare const drivers: true' })
    await writeTree(join(root, 'fresh'), { 'package.json': '{}', 'dist/index.d.ts': 'export declare const drivers: true' })
    await writeTree(join(root, 'stale'), { 'package.json': '{}', 'dist/index.d.ts': 'export {}' })
    await writeTree(join(root, 'partial'), { 'package.json': '{}' })

    const pack = { files: [{ path: 'package.json' }, { path: 'dist/index.d.ts' }] }
    assert.deepEqual(await findInstalledMismatches(pack, join(root, 'source'), join(root, 'fresh')), [])
    assert.deepEqual(await findInstalledMismatches(pack, join(root, 'source'), join(root, 'stale')), ['dist/index.d.ts'])
    assert.deepEqual(await findInstalledMismatches(pack, join(root, 'source'), join(root, 'partial')), ['dist/index.d.ts'])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('validatePackMetadata rejects files outside the strict allowlist', () => {
  assert.throws(
    () =>
      validatePackMetadata({
        name: '@ficsysfr/nestjs_module_factorydrive',
        size: 100,
        files: corePackFiles(['notes.txt']),
      }),
    /non-allowlisted path/,
  )
})

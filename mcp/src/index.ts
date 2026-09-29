#!/usr/bin/env node
// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/server'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { registerDocsTools } from './tools.js'

function packageVersion(): string {
  try {
    const packagePath = join(dirname(fileURLToPath(import.meta.url)), '../package.json')
    const manifest = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: string }
    return manifest.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

export function createServer(): McpServer {
  const server = new McpServer(
    { name: 'factorydrive-docs', version: packageVersion() },
    {
      instructions: 'Call list_doc_sources first, search_docs with the actual question, then fetch_docs on the most relevant URLs. This server is documentation-only.',
    },
  )
  registerDocsTools(server)
  return server
}

async function main(): Promise<void> {
  await serveStdio(() => createServer())
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

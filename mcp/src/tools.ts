// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

import type { McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod/v4'
import { fetchText, getDocsBaseUrl, loadLlmsFullTxt, loadLlmsTxt, searchDocsContent } from './docs-client.js'

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] }
}

function errorResult(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return { isError: true, content: [{ type: 'text' as const, text: `Factorydrive documentation error: ${message}` }] }
}

export function registerDocsTools(server: McpServer): void {
  server.registerTool(
    'list_doc_sources',
    {
      description: 'List Factorydrive documentation sources by fetching the published llms.txt index.',
    },
    async () => {
      try {
        const base = getDocsBaseUrl()
        const { markdown, links } = await loadLlmsTxt(base)
        return textResult(
          [
            '# Factorydrive documentation',
            '',
            `Base: ${base}`,
            `Index: ${base}/llms.txt`,
            `Full bundle: ${base}/llms-full.txt`,
            '',
            `Parsed links: ${links.length}`,
            '',
            markdown,
          ].join('\n'),
        )
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    'search_docs',
    {
      description: 'Search Factorydrive documentation and return ranked page URLs with snippets. Fetch the best matching pages next.',
      inputSchema: z.object({
        query: z.string().min(1).describe('Natural-language or keyword query'),
        limit: z.number().int().min(1).max(30).optional().describe('Maximum results, default 12'),
      }),
    },
    async ({ query, limit }) => {
      try {
        const base = getDocsBaseUrl()
        const { links } = await loadLlmsTxt(base)
        let fullText: string | undefined
        try {
          fullText = await loadLlmsFullTxt(base)
        } catch {
          // Index-only search remains available if the full bundle is temporarily unavailable.
        }

        const results = searchDocsContent(query, links, fullText, limit ?? 12)
        if (results.length === 0) return textResult(`No matches for "${query}". Try list_doc_sources or a broader query.`)

        const body = results
          .map((result, index) => {
            const note = result.notes ? ` — ${result.notes}` : ''
            const snippet = result.snippet ? `\n  snippet: ${result.snippet}` : ''
            return `${index + 1}. [${result.title}](${result.url})${note} (score ${result.score})${snippet}`
          })
          .join('\n')
        return textResult(`Search results for "${query}":\n\n${body}`)
      } catch (error) {
        return errorResult(error)
      }
    },
  )

  server.registerTool(
    'fetch_docs',
    {
      description: 'Fetch one Markdown or llms.txt URL from the configured Factorydrive documentation site.',
      inputSchema: z.object({
        url: z.url().describe('Absolute URL inside the configured documentation base'),
      }),
    },
    async ({ url }) => {
      try {
        return textResult(await fetchText(url))
      } catch (error) {
        return errorResult(error)
      }
    },
  )
}

// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

/** Default published docs origin, without a trailing slash. */
export const DEFAULT_DOCS_BASE_URL = 'https://ficsysfr.github.io/nestjs_module_factorydrive'

export const MAX_DOC_BYTES = 2 * 1024 * 1024
export const DOC_FETCH_TIMEOUT_MS = 10_000
const MAX_REDIRECTS = 5
const PRODUCTION_HOST = 'ficsysfr.github.io'
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost'])

export type DocLink = {
  title: string
  url: string
  notes?: string
}

export type DocPage = {
  title?: string
  url: string
  content: string
}

export type SearchResult = DocLink & {
  score: number
  snippet?: string
}

function basePathname(baseUrl: string): string {
  const pathname = new URL(baseUrl).pathname.replace(/\/+$/, '')
  return pathname || '/'
}

export function getDocsBaseUrl(): string {
  const raw = process.env.DOCS_BASE_URL?.trim() || DEFAULT_DOCS_BASE_URL
  return raw.replace(/\/+$/, '')
}

export function assertAllowedDocsUrl(urlString: string, baseUrl = getDocsBaseUrl()): URL {
  let url: URL
  let base: URL

  try {
    url = new URL(urlString)
    base = new URL(baseUrl)
  } catch {
    throw new Error(`Invalid documentation URL: ${urlString}`)
  }

  if (url.username || url.password) {
    throw new Error('Documentation URLs cannot contain credentials')
  }

  if (url.hostname === PRODUCTION_HOST) {
    if (url.protocol !== 'https:') {
      throw new Error('The production documentation host requires HTTPS')
    }
  } else if (LOCAL_HOSTS.has(url.hostname)) {
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`Unsupported local documentation protocol: ${url.protocol}`)
    }
  } else {
    throw new Error(`Documentation host not allowed: ${url.hostname}`)
  }

  if (base.hostname !== url.hostname || base.port !== url.port || base.protocol !== url.protocol) {
    throw new Error(`Documentation URL must use the configured origin: ${base.origin}`)
  }

  if (/%2f|%5c/i.test(url.pathname)) {
    throw new Error('Documentation paths cannot contain encoded path separators')
  }

  const allowedPath = basePathname(base.href)
  if (allowedPath !== '/' && url.pathname !== allowedPath && !url.pathname.startsWith(`${allowedPath}/`)) {
    throw new Error(`Documentation path is outside the configured base (${allowedPath}): ${url.pathname}`)
  }

  if (!url.pathname.endsWith('.md') && !url.pathname.endsWith('/llms.txt') && !url.pathname.endsWith('/llms-full.txt')) {
    throw new Error(`Documentation URL is not an allowed Markdown or LLM document: ${url.pathname}`)
  }

  return url
}

export async function fetchText(urlString: string, baseUrl = getDocsBaseUrl()): Promise<string> {
  let current = assertAllowedDocsUrl(urlString, baseUrl)

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(DOC_FETCH_TIMEOUT_MS),
      headers: { accept: 'text/markdown, text/plain;q=0.9, text/*;q=0.8' },
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) throw new Error(`HTTP ${response.status} redirect without a location from ${current.href}`)
      if (redirects === MAX_REDIRECTS) throw new Error(`Too many redirects fetching ${urlString}`)
      current = assertAllowedDocsUrl(new URL(location, current).href, baseUrl)
      continue
    }

    if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${current.href}`)

    const declaredLength = Number(response.headers.get('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > MAX_DOC_BYTES) {
      throw new Error(`Documentation response exceeds ${MAX_DOC_BYTES} bytes`)
    }

    const body = await response.arrayBuffer()
    if (body.byteLength > MAX_DOC_BYTES) {
      throw new Error(`Documentation response exceeds ${MAX_DOC_BYTES} bytes`)
    }
    return new TextDecoder().decode(body)
  }

  throw new Error(`Too many redirects fetching ${urlString}`)
}

/** Parse markdown list entries in the form `- [title](url): notes`. */
export function parseLlmsIndex(markdown: string, baseUrl = getDocsBaseUrl()): DocLink[] {
  const links: DocLink[] = []
  const expression = /^-\s+\[([^\]]+)]\(([^)]+)\)(?:\s*:\s*(.*))?$/gm

  for (;;) {
    const match = expression.exec(markdown)
    if (match === null) break
    links.push({
      title: match[1].trim(),
      url: new URL(match[2].trim(), `${baseUrl}/`).href,
      notes: match[3]?.trim() || undefined,
    })
  }

  return links
}

export function parseLlmsFull(markdown: string): DocPage[] {
  const pages: DocPage[] = []
  const expression = /(?:^|\n)---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n([\s\S]*?)(?=\r?\n---\s*\r?\n|$)/g

  for (;;) {
    const match = expression.exec(markdown)
    if (match === null) break
    const url = /^url:\s*(?:>-\s*\r?\n\s+)?([^\r\n]+)$/m.exec(match[1])?.[1]?.trim()
    if (!url) continue
    const content = match[2].trim()
    const title = /^#\s+(.+)$/m.exec(content)?.[1]?.trim()
    pages.push({ url, title, content })
  }

  return pages
}

export async function loadLlmsTxt(baseUrl = getDocsBaseUrl()): Promise<{ markdown: string; links: DocLink[] }> {
  const markdown = await fetchText(`${baseUrl}/llms.txt`, baseUrl)
  return { markdown, links: parseLlmsIndex(markdown, baseUrl) }
}

export async function loadLlmsFullTxt(baseUrl = getDocsBaseUrl()): Promise<string> {
  return fetchText(`${baseUrl}/llms-full.txt`, baseUrl)
}

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function occurrences(haystack: string, needle: string): number {
  let count = 0
  let offset = 0
  while (offset < haystack.length) {
    const index = haystack.indexOf(needle, offset)
    if (index < 0) break
    count += 1
    offset = index + needle.length
  }
  return count
}

function snippetFor(content: string, terms: string[]): string | undefined {
  const normalized = normalize(content)
  const positions = terms.map((term) => normalized.indexOf(term)).filter((position) => position >= 0)
  if (positions.length === 0) return undefined
  const index = Math.min(...positions)
  const start = Math.max(0, index - 100)
  const end = Math.min(content.length, index + 240)
  return content.slice(start, end).replace(/\s+/g, ' ').trim()
}

export function searchDocsContent(query: string, links: DocLink[], fullText?: string, limit = 12): SearchResult[] {
  const terms = [
    ...new Set(
      normalize(query)
        .split(/\s+/)
        .filter((term) => term.length > 1),
    ),
  ]
  const boundedLimit = Number.isFinite(limit) ? Math.min(30, Math.max(1, Math.trunc(limit))) : 12

  if (terms.length === 0) return links.slice(0, boundedLimit).map((link) => ({ ...link, score: 0 }))

  const pages = fullText ? parseLlmsFull(fullText) : []
  const pagesByUrl = new Map(pages.map((page) => [page.url, page]))
  const normalizedQuery = normalize(query.trim())

  return links
    .map((link) => {
      const page = pagesByUrl.get(link.url)
      const title = normalize(link.title)
      const notes = normalize(link.notes ?? '')
      const url = normalize(link.url)
      const content = normalize(page?.content ?? '')
      let score = 0

      for (const term of terms) {
        score += occurrences(title, term) * 8
        score += occurrences(notes, term) * 4
        score += Math.min(2, occurrences(url, term))
        score += Math.min(4, occurrences(content, term))
      }

      if (normalizedQuery.length > 1) {
        if (title.includes(normalizedQuery)) score += 12
        if (notes.includes(normalizedQuery)) score += 6
        if (content.includes(normalizedQuery)) score += 4
      }

      return { ...link, score, snippet: page ? snippetFor(page.content, terms) : undefined }
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, boundedLimit)
}

// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

import { pipeline as nodePipeline } from 'stream'
import { promisify } from 'util'

// biome-ignore lint/suspicious/noExplicitAny: Runtime stream detection intentionally accepts any input.
export function isReadableStream(stream: any): stream is NodeJS.ReadableStream {
  return (
    stream !== null &&
    typeof stream === 'object' &&
    typeof stream.pipe === 'function' &&
    typeof stream._read === 'function' &&
    typeof stream._readableState === 'object' &&
    stream.readable !== false
  )
}

export const pipeline = promisify(nodePipeline)

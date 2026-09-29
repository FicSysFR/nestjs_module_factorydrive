// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

import { createHmac, timingSafeEqual } from 'crypto'
import { promises as fs } from 'fs'
import fse from 'fs-extra'
import { dirname, join, relative, resolve, sep } from 'path'
import { FileNotFoundException, InvalidConfigException, PermissionMissingException, UnknownException } from '../exceptions'
import AbstractStorage from './abstract.storage'
import type { ContentResponse, DeleteResponse, ExistsResponse, FileListResponse, Response, SignedUrlOptions, SignedUrlResponse, StatResponse, VerifySignedUrlParams } from './types'
import { isReadableStream, pipeline } from './utils'

function handleError(err: Error & { code: string; path?: string }, location: string): Error {
  switch (err.code) {
    case 'ENOENT': {
      return new FileNotFoundException(err, location)
    }
    case 'EPERM': {
      return new PermissionMissingException(err, location)
    }
    default: {
      return new UnknownException(err, err.code, location)
    }
  }
}

export class LocalFileSystemStorage extends AbstractStorage {
  private readonly $root: string
  private readonly $signatureSecret?: string
  private readonly $baseUrl?: string

  public constructor(config: LocalFileSystemStorageConfig) {
    super()
    this.$root = resolve(config.root)
    this.$signatureSecret = config.signatureSecret
    this.$baseUrl = config.baseUrl
  }

  private _fullPath(relativePath: string): string {
    return join(this.$root, join(sep, relativePath))
  }

  /**
   * Le driver local ne sert pas les fichiers lui-même : `baseUrl` désigne le point d'entrée HTTP
   * qui, lui, vérifie la signature (`verifySignedUrl`) avant de servir le binaire.
   */
  public getUrl(location: string): string {
    if (!this.$baseUrl) throw InvalidConfigException.missingDiskConfig('local.baseUrl')
    return `${this.$baseUrl}/${encodeURI(location)}`
  }

  /**
   * URL signée à durée de vie limitée (HMAC-SHA256 sur `location` + expiration).
   * Nécessite `signatureSecret` et `baseUrl` en config du disque.
   */
  public getSignedUrl(location: string, options: SignedUrlOptions = {}): Promise<SignedUrlResponse> {
    const secret = this.$secret()
    const expires = Date.now() + (options.expiresIn ?? 900) * 1000
    const signature = this._sign(secret, location, expires)
    const signedUrl = `${this.getUrl(location)}?expires=${expires}&signature=${signature}`
    return Promise.resolve({ signedUrl, raw: { expires, signature } })
  }

  /** Vérifie une URL signée : signature HMAC constante-temps + non-expiration. */
  public verifySignedUrl(location: string, params: VerifySignedUrlParams): boolean {
    const secret = this.$secret()
    if (!Number.isFinite(params.expires) || Date.now() > params.expires) return false
    const expected = this._sign(secret, location, params.expires)
    const given = String(params.signature ?? '')
    if (given.length !== expected.length) return false
    return timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  }

  private $secret(): string {
    if (!this.$signatureSecret) throw InvalidConfigException.missingDiskConfig('local.signatureSecret')
    return this.$signatureSecret
  }

  private _sign(secret: string, location: string, expires: number): string {
    return createHmac('sha256', secret).update(`${location}\n${expires}`).digest('base64url')
  }

  public async append(location: string, content: Buffer | string): Promise<Response> {
    try {
      const result = await fse.appendFile(this._fullPath(location), content)
      return { raw: result }
    } catch (e) {
      throw handleError(e, location)
    }
  }

  public async copy(src: string, dest: string): Promise<Response> {
    try {
      const result = await fse.copy(this._fullPath(src), this._fullPath(dest))
      return { raw: result }
    } catch (e) {
      throw handleError(e, `${src} -> ${dest}`)
    }
  }

  public async delete(location: string): Promise<DeleteResponse> {
    try {
      const result = await fse.unlink(this._fullPath(location))
      return { raw: result, wasDeleted: true }
    } catch (e) {
      e = handleError(e, location)

      if (e instanceof FileNotFoundException) {
        return { raw: undefined, wasDeleted: false }
      }

      throw e
    }
  }

  public driver(): typeof fse {
    return fse
  }

  public async exists(location: string): Promise<ExistsResponse> {
    try {
      const result = await fse.pathExists(this._fullPath(location))
      return { exists: result, raw: result }
    } catch (e) {
      throw handleError(e, location)
    }
  }

  public async get(location: string, encoding: BufferEncoding = 'utf-8'): Promise<ContentResponse<string>> {
    try {
      const result = await fse.readFile(this._fullPath(location), { encoding })
      return { content: result.toString(), raw: result }
    } catch (e) {
      throw handleError(e, location)
    }
  }

  public async getBuffer(location: string): Promise<ContentResponse<Buffer>> {
    try {
      const result = await fse.readFile(this._fullPath(location))
      return { content: result, raw: result }
    } catch (e) {
      throw handleError(e, location)
    }
  }

  public async getStat(location: string): Promise<StatResponse> {
    try {
      const stat = await fse.stat(this._fullPath(location))
      return {
        size: stat.size,
        modified: stat.mtime,
        raw: stat,
      }
    } catch (e) {
      throw handleError(e, location)
    }
  }

  public getStream(location: string): Promise<NodeJS.ReadableStream> {
    return new Promise((resolve) => {
      resolve(fse.createReadStream(this._fullPath(location)))
    })
  }

  public async move(src: string, dest: string): Promise<Response> {
    try {
      const result = await fse.move(this._fullPath(src), this._fullPath(dest))
      return { raw: result }
    } catch (e) {
      throw handleError(e, `${src} -> ${dest}`)
    }
  }

  public async prepend(location: string, content: Buffer | string): Promise<Response> {
    try {
      const { content: actualContent } = await this.get(location, 'utf-8')

      return this.put(location, `${content}${actualContent}`)
    } catch (e) {
      if (e instanceof FileNotFoundException) {
        return this.put(location, content)
      }
      throw e
    }
  }

  public async put(location: string, content: Buffer | NodeJS.ReadableStream | string): Promise<Response> {
    const fullPath = this._fullPath(location)

    try {
      if (isReadableStream(content)) {
        const dir = dirname(fullPath)
        await fse.ensureDir(dir)
        const ws = fse.createWriteStream(fullPath)
        await pipeline(content, ws)
        return { raw: undefined }
      }

      const result = await fse.outputFile(fullPath, content)
      return { raw: result }
    } catch (e) {
      throw handleError(e, location)
    }
  }

  public flatList(prefix = ''): AsyncIterable<FileListResponse> {
    const fullPrefix = this._fullPath(prefix)
    return this._flatDirIterator(fullPrefix, prefix)
  }

  private async *_flatDirIterator(prefix: string, originalPrefix: string): AsyncIterable<FileListResponse> {
    const prefixDirectory = prefix[prefix.length - 1] === sep ? prefix : dirname(prefix)

    try {
      const dir = await fs.opendir(prefixDirectory)

      for await (const file of dir) {
        const fileName = join(prefixDirectory, file.name)
        if (fileName.startsWith(prefix)) {
          if (file.isDirectory()) {
            yield* this._flatDirIterator(join(fileName, sep), originalPrefix)
          } else if (file.isFile()) {
            const path = relative(this.$root, fileName)
            yield {
              raw: null,
              path,
            }
          }
        }
      }
    } catch (e) {
      if (e.code !== 'ENOENT') {
        throw handleError(e, originalPrefix)
      }
    }
  }
}

export type LocalFileSystemStorageConfig = {
  root: string
  /** Secret HMAC pour signer/vérifier les URLs (`getSignedUrl` / `verifySignedUrl`). */
  signatureSecret?: string
  /** Préfixe absolu du point d'entrée HTTP qui sert les fichiers (ex. `https://host/files`). */
  baseUrl?: string
}

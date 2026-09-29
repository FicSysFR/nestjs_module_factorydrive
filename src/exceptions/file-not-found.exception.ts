// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

import { RuntimeException } from 'node-exceptions'

export class FileNotFoundException extends RuntimeException {
  public raw: Error

  public constructor(err: Error, path: string) {
    super(`The file ${path} doesn't exist\n${err.message}`, 500, 'E_FILE_NOT_FOUND')
    this.raw = err
  }
}

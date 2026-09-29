// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

import { RuntimeException } from 'node-exceptions'

export class WrongKeyPathException extends RuntimeException {
  public raw: Error

  public constructor(err: Error, path: string) {
    super(`The key path does not exist: ${path}\n${err.message}`, 500, 'E_WRONG_KEY_PATH')
    this.raw = err
  }
}

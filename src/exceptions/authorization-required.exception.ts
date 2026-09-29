// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

import { RuntimeException } from 'node-exceptions'

export class AuthorizationRequiredException extends RuntimeException {
  public raw: Error

  public constructor(err: Error, path: string) {
    super(`Unauthorized to access file ${path}\n${err.message}`, 500, 'E_AUTHORIZATION_REQUIRED')
    this.raw = err
  }
}

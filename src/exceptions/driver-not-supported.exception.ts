// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

import { RuntimeException } from 'node-exceptions'

export class DriverNotSupportedException extends RuntimeException {
  public driver!: string

  public static driver(name: string): DriverNotSupportedException {
    const exception = new this(`Driver ${name} is not supported`, 400)
    exception.driver = name
    return exception
  }
}

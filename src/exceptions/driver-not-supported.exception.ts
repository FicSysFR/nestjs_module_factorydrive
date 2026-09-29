// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

import { RuntimeException } from 'node-exceptions'

export class DriverNotSupportedException extends RuntimeException {
  public driver!: string
  public disk?: string

  public static driver(name: string): DriverNotSupportedException {
    const exception = new this(`Driver ${name} is not supported`, 400)
    exception.driver = name
    return exception
  }

  /**
   * Un disque référence un driver que rien n'a enregistré : ni un built-in (`local`), ni
   * `drivers` déclaratif, ni un appel explicite à `registerDriver()`.
   */
  public static notRegistered(driverName: string, diskName: string): DriverNotSupportedException {
    const exception = new this(
      `Factorydrive driver "${driverName}" required by disk "${diskName}" is not registered. Declare it in "drivers" or call registerDriver() before module initialization.`,
      400,
    )
    exception.driver = driverName
    exception.disk = diskName
    return exception
  }
}

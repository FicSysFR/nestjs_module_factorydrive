// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

import { RuntimeException } from 'node-exceptions'

export class InvalidConfigException extends RuntimeException {
  public static missingDiskName(): InvalidConfigException {
    return new this('Make sure to define a default disk name inside config file', 500, 'E_INVALID_CONFIG')
  }

  public static missingDiskConfig(name: string): InvalidConfigException {
    return new this(`Make sure to define config for ${name} disk`, 500, 'E_INVALID_CONFIG')
  }

  public static missingDiskDriver(name: string): InvalidConfigException {
    return new this(`Make sure to define driver for ${name} disk`, 500, 'E_INVALID_CONFIG')
  }

  public static duplicateDiskName(name: string): InvalidConfigException {
    return new this(`A disk named ${name} is already defined`, 500, 'E_INVALID_CONFIG')
  }

  public static duplicateDriverName(name: string): InvalidConfigException {
    if (name === 'local') {
      return new this(
        `A driver named "local" is already registered (the built-in local driver). Set "registerLocalDriver: false" to replace it, or choose a different name.`,
        500,
        'E_INVALID_CONFIG',
      )
    }
    return new this(`A driver named "${name}" is already registered and cannot be redeclared with a different class`, 500, 'E_INVALID_CONFIG')
  }

  public static invalidDriver(name: string): InvalidConfigException {
    return new this(`The driver declared for "${name}" is not a valid constructor`, 500, 'E_INVALID_CONFIG')
  }
}

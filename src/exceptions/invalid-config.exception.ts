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
}

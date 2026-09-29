// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

import type { ModuleMetadata, Type } from '@nestjs/common'
import type { StorageManagerConfig } from './factorydrive'

export interface FactorydriveModuleOptionsFactory {
  createFactorydriveModuleOptions(): Promise<StorageManagerConfig> | StorageManagerConfig
}

export interface FactorydriveModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  // biome-ignore lint/suspicious/noExplicitAny: Nest injection tokens accept arbitrary values.
  inject?: any[]
  useClass?: Type<FactorydriveModuleOptionsFactory>
  useExisting?: Type<FactorydriveModuleOptionsFactory>
  // biome-ignore lint/suspicious/noExplicitAny: Nest factories accept arbitrary injected values.
  useFactory?: (...args: any[]) => Promise<StorageManagerConfig> | StorageManagerConfig
}

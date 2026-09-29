// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

import { type DynamicModule, Module } from '@nestjs/common'
import type { StorageManagerConfig } from './factorydrive'
import { FactorydriveCoreModule } from './factorydrive.core-module'
import type { FactorydriveModuleAsyncOptions } from './factorydrive.interfaces'

@Module({})
export class FactorydriveModule {
  public static forRoot(options: StorageManagerConfig): DynamicModule {
    return {
      module: FactorydriveModule,
      imports: [FactorydriveCoreModule.forRoot(options)],
    }
  }

  public static forRootAsync(options: FactorydriveModuleAsyncOptions): DynamicModule {
    return {
      module: FactorydriveModule,
      imports: [FactorydriveCoreModule.forRootAsync(options)],
    }
  }
}

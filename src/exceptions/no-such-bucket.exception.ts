// Copyright 2026 FicSys
// SPDX-License-Identifier: Apache-2.0

import { RuntimeException } from 'node-exceptions'

export class NoSuchBucketException extends RuntimeException {
  public raw: Error

  public constructor(err: Error, bucket: string) {
    super(`The bucket ${bucket} doesn't exist\n${err.message}`, 500, 'E_NO_SUCH_BUCKET')
    this.raw = err
  }
}

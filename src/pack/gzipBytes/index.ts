/**
 * Copyright 2026 nodearchive
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { gzip } from 'node:zlib'
import { promisify } from 'node:util'
import type { CompressionLevel } from '../../.types/PackArgs/type.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'
import { toZlibLevel } from '../toZlibLevel/index.js'

const gzipAsync = promisify(gzip)

export async function gzipBytes(
  bytes: Uint8Array,
  compressionLevel: CompressionLevel = 'Optimal'
): Promise<Uint8Array> {
  try {
    const buffer = await gzipAsync(Buffer.from(bytes), {
      level: toZlibLevel(compressionLevel),
    })

    return Uint8Array.from(buffer)
  } catch (error) {
    throw toNodearchiveError(
      error,
      'ARCHIVE_SERIALIZATION_FAILED',
      'Failed to encode gzip archive'
    )
  }
}

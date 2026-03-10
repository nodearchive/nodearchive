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
import { constants, gzip } from 'node:zlib'
import { promisify } from 'node:util'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import type { CompressionLevel } from '../../.types/PackArgs/type.js'
import { readBytecodec } from '../../.helpers/readBytecodec/index.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'

const gzipAsync = promisify(gzip)

const compressionLevels: Record<CompressionLevel, number> = {
  Optimal: constants.Z_BEST_COMPRESSION,
  Fastest: constants.Z_BEST_SPEED,
  NoCompression: constants.Z_NO_COMPRESSION,
}

export async function writeArchive(
  manifest: ArchiveManifest,
  compressionLevel: CompressionLevel = 'Optimal'
): Promise<Uint8Array> {
  try {
    const { fromJSON } = await readBytecodec()
    const payload = fromJSON(manifest)
    const buffer = await gzipAsync(payload, {
      level: compressionLevels[compressionLevel],
    })

    return Uint8Array.from(buffer)
  } catch (error) {
    throw toNodearchiveError(
      error,
      'ARCHIVE_SERIALIZATION_FAILED',
      'Failed to encode archive'
    )
  }
}

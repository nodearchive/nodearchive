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
import JSZip from 'jszip'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import type { CompressionLevel } from '../../.types/PackArgs/type.js'
import { NodearchiveError } from '../../.errors/class.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'

export async function writeZipArchive(
  manifest: ArchiveManifest,
  compressionLevel: CompressionLevel = 'Optimal'
): Promise<Uint8Array> {
  try {
    const zip = new JSZip()

    for (const entry of manifest.entries) {
      if (entry.kind === 'directory') {
        zip.file(`${entry.path}/`, '', {
          dir: true,
          unixPermissions: entry.mode,
        })
        continue
      }

      if (!entry.data) {
        throw new NodearchiveError(
          'ARCHIVE_SERIALIZATION_FAILED',
          `Missing file data: ${entry.path}`
        )
      }

      zip.file(entry.path, Buffer.from(entry.data, 'base64'), {
        unixPermissions: entry.mode,
      })
    }

    return Uint8Array.from(
      await zip.generateAsync(toZipOptions(compressionLevel))
    )
  } catch (error) {
    throw toNodearchiveError(
      error,
      'ARCHIVE_SERIALIZATION_FAILED',
      'Failed to encode zip archive'
    )
  }
}

function toZipOptions(compressionLevel: CompressionLevel) {
  if (compressionLevel === 'NoCompression') {
    return { compression: 'STORE' as const, type: 'uint8array' as const }
  }

  return {
    compression: 'DEFLATE' as const,
    compressionOptions: {
      level: compressionLevel === 'Fastest' ? 1 : 9,
    },
    type: 'uint8array' as const,
  }
}

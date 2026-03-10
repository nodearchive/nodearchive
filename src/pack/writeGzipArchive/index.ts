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
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import type { CompressionLevel } from '../../.types/PackArgs/type.js'
import { NodearchiveError } from '../../.errors/class.js'
import { gzipBytes } from '../gzipBytes/index.js'

export async function writeGzipArchive(
  manifest: ArchiveManifest,
  compressionLevel: CompressionLevel = 'Optimal'
): Promise<Uint8Array> {
  const files = manifest.entries.filter((entry) => entry.kind === 'file')

  if (manifest.entries.length !== 1 || files.length !== 1 || !files[0]?.data) {
    throw new NodearchiveError(
      'ARCHIVE_OUTPUT_FORMAT_INVALID',
      'Gzip output requires exactly one file input'
    )
  }

  return gzipBytes(Buffer.from(files[0].data, 'base64'), compressionLevel)
}

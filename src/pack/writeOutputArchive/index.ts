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
import type { ArchiveFormat } from '../../.types/ArchiveFormat/type.js'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import type { CompressionLevel } from '../../.types/PackArgs/type.js'
import { gzipBytes } from '../gzipBytes/index.js'
import { writeArchive } from '../writeArchive/index.js'
import { writeGzipArchive } from '../writeGzipArchive/index.js'
import { writeTarArchive } from '../writeTarArchive/index.js'
import { writeZipArchive } from '../writeZipArchive/index.js'

export async function writeOutputArchive(
  manifest: ArchiveManifest,
  outFormat: ArchiveFormat,
  compressionLevel: CompressionLevel = 'Optimal'
): Promise<Uint8Array> {
  if (outFormat === 'nar') {
    return writeArchive(manifest, compressionLevel)
  }

  if (outFormat === 'zip') {
    return writeZipArchive(manifest, compressionLevel)
  }

  if (outFormat === 'tar') {
    return writeTarArchive(manifest)
  }

  if (outFormat === 'gz') {
    return writeGzipArchive(manifest, compressionLevel)
  }

  const tarBytes = await writeTarArchive(manifest)
  return gzipBytes(tarBytes, compressionLevel)
}

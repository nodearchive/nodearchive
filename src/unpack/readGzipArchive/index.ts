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
import path from 'node:path'
import { gunzipSync } from 'node:zlib'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'
import { readTarArchive } from '../readTarArchive/index.js'
import { toArchiveManifest } from '../toArchiveManifest/index.js'

export async function readGzipArchive(
  bytes: Uint8Array,
  sourcePath?: string
): Promise<ArchiveManifest> {
  try {
    const inflated = Uint8Array.from(gunzipSync(bytes))

    if (looksLikeTar(inflated)) {
      return readTarArchive(inflated)
    }

    return toArchiveManifest([
      {
        data: Buffer.from(inflated).toString('base64'),
        kind: 'file',
        path: toEntryPath(sourcePath),
      },
    ])
  } catch (error) {
    throw toNodearchiveError(
      error,
      'ARCHIVE_INVALID_FORMAT',
      'Invalid gzip archive'
    )
  }
}

function looksLikeTar(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 262 &&
    Buffer.from(bytes.subarray(257, 262)).toString('utf8') === 'ustar'
  )
}

function toEntryPath(sourcePath?: string): string {
  if (!sourcePath) {
    return 'archive'
  }

  const basename = path.basename(sourcePath)
  const uncompressed = basename.replace(/\.gz$/iu, '')
  return uncompressed || 'archive'
}

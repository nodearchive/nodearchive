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
import type { ArchiveEntry } from '../../.types/ArchiveEntry/type.js'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import { NodearchiveError } from '../../.errors/class.js'
import { readBytecodec } from '../readBytecodec/index.js'
import { toNodearchiveError } from '../toNodearchiveError/index.js'

export async function readArchive(bytes: Uint8Array): Promise<ArchiveManifest> {
  try {
    const { fromCompressed, toJSON } = await readBytecodec()
    const manifest = toJSON(await fromCompressed(bytes)) as Partial<
      ArchiveManifest & {
        entries: Partial<ArchiveEntry>[]
      }
    >

    if (
      manifest.format !== '@nodearchive/nodearchive' ||
      manifest.version !== 1 ||
      !Array.isArray(manifest.entries)
    ) {
      throw new NodearchiveError(
        'ARCHIVE_INVALID_FORMAT',
        'Archive header is invalid'
      )
    }

    for (const entry of manifest.entries) {
      if (
        !entry ||
        typeof entry.path !== 'string' ||
        (entry.kind !== 'file' && entry.kind !== 'directory') ||
        (entry.kind === 'file' && typeof entry.data !== 'string') ||
        (entry.mode !== undefined && typeof entry.mode !== 'number')
      ) {
        throw new NodearchiveError(
          'ARCHIVE_INVALID_FORMAT',
          'Archive entry is invalid'
        )
      }
    }

    return manifest as ArchiveManifest
  } catch (error) {
    throw toNodearchiveError(
      error,
      'ARCHIVE_INVALID_FORMAT',
      'Invalid archive payload'
    )
  }
}

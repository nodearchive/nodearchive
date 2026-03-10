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
import { NodearchiveError } from '../../.errors/class.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'
import type { ArchiveEntry } from '../../.types/ArchiveEntry/type.js'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import { toArchiveManifest } from '../toArchiveManifest/index.js'

export async function readZipArchive(
  bytes: Uint8Array
): Promise<ArchiveManifest> {
  try {
    const zip = await JSZip.loadAsync(bytes)
    const entries: ArchiveEntry[] = []

    for (const file of Object.values(zip.files)) {
      const entryPath = file.name.replace(/\/+$/u, '')

      if (!entryPath) {
        continue
      }

      const mode = toMode(file.unixPermissions)

      if (mode !== undefined && (mode & 0o170000) === 0o120000) {
        throw new NodearchiveError(
          'ARCHIVE_UNSUPPORTED_ENTRY',
          `Unsupported archive entry: ${file.name}`
        )
      }

      if (file.dir) {
        entries.push({ kind: 'directory', mode, path: entryPath })
        continue
      }

      entries.push({
        data: Buffer.from(await file.async('uint8array')).toString('base64'),
        kind: 'file',
        mode,
        path: entryPath,
      })
    }

    return toArchiveManifest(entries)
  } catch (error) {
    throw toNodearchiveError(
      error,
      'ARCHIVE_INVALID_FORMAT',
      'Invalid zip archive'
    )
  }
}

function toMode(value: number | string | null): number | undefined {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    return Number.parseInt(value, 8)
  }

  return undefined
}

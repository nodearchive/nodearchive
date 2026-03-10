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
import { Readable } from 'node:stream'
import { extract, type Headers } from 'tar-stream'
import { NodearchiveError } from '../../.errors/class.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'
import type { ArchiveEntry } from '../../.types/ArchiveEntry/type.js'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import { toArchiveManifest } from '../toArchiveManifest/index.js'

export async function readTarArchive(
  bytes: Uint8Array
): Promise<ArchiveManifest> {
  try {
    return toArchiveManifest(await collectEntries(bytes))
  } catch (error) {
    throw toNodearchiveError(
      error,
      'ARCHIVE_INVALID_FORMAT',
      'Invalid tar archive'
    )
  }
}

function collectEntries(bytes: Uint8Array): Promise<ArchiveEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: ArchiveEntry[] = []
    const parser = extract()

    parser.on('entry', (header, stream, next) => {
      const chunks: Buffer[] = []

      stream.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk))
      })

      stream.on('error', reject)
      stream.on('end', () => {
        try {
          pushEntry(entries, header, chunks)
        } catch (error) {
          reject(error)
          return
        }

        next()
      })
    })

    parser.on('error', reject)
    parser.on('finish', () => resolve(entries))

    Readable.from(Buffer.from(bytes)).pipe(parser)
  })
}

function pushEntry(
  entries: ArchiveEntry[],
  header: Headers,
  chunks: Buffer[]
): void {
  const entryPath = header.name.replace(/\/+$/u, '')

  if (!entryPath) {
    return
  }

  if (header.type === 'directory') {
    entries.push({ kind: 'directory', mode: header.mode, path: entryPath })
    return
  }

  if (header.type !== 'file' && header.type !== 'contiguous-file') {
    throw new NodearchiveError(
      'ARCHIVE_UNSUPPORTED_ENTRY',
      `Unsupported archive entry: ${header.name}`
    )
  }

  entries.push({
    data: Buffer.concat(chunks).toString('base64'),
    kind: 'file',
    mode: header.mode,
    path: entryPath,
  })
}

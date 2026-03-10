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
import { NodearchiveError } from '../../.errors/class.js'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import { readGzipArchive } from '../readGzipArchive/index.js'
import { readTarArchive } from '../readTarArchive/index.js'
import { readZipArchive } from '../readZipArchive/index.js'

export async function readForeignArchive(
  bytes: Uint8Array,
  sourcePath?: string
): Promise<ArchiveManifest> {
  if (looksLikeZip(bytes)) {
    return readZipArchive(bytes)
  }

  if (looksLikeGzip(bytes)) {
    return readGzipArchive(bytes, sourcePath)
  }

  if (looksLikeTar(bytes)) {
    return readTarArchive(bytes)
  }

  throw new NodearchiveError(
    'ARCHIVE_INVALID_FORMAT',
    'Unsupported archive format'
  )
}

function looksLikeZip(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) &&
    (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08)
  )
}

function looksLikeGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
}

function looksLikeTar(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 262 &&
    Buffer.from(bytes.subarray(257, 262)).toString('utf8') === 'ustar'
  )
}

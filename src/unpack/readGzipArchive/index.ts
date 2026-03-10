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

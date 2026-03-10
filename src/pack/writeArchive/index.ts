import { fromJSON } from '@z-base/bytecodec'
import { constants, gzip } from 'node:zlib'
import { promisify } from 'node:util'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import type { CompressionLevel } from '../../.types/PackArgs/type.js'
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

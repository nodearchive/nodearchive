import { gzip } from 'node:zlib'
import { promisify } from 'node:util'
import type { CompressionLevel } from '../../.types/PackArgs/type.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'
import { toZlibLevel } from '../toZlibLevel/index.js'

const gzipAsync = promisify(gzip)

export async function gzipBytes(
  bytes: Uint8Array,
  compressionLevel: CompressionLevel = 'Optimal'
): Promise<Uint8Array> {
  try {
    const buffer = await gzipAsync(Buffer.from(bytes), {
      level: toZlibLevel(compressionLevel),
    })

    return Uint8Array.from(buffer)
  } catch (error) {
    throw toNodearchiveError(
      error,
      'ARCHIVE_SERIALIZATION_FAILED',
      'Failed to encode gzip archive'
    )
  }
}

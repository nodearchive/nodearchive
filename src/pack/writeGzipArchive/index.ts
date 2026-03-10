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

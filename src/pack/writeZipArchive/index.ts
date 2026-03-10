import JSZip from 'jszip'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import type { CompressionLevel } from '../../.types/PackArgs/type.js'
import { NodearchiveError } from '../../.errors/class.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'

export async function writeZipArchive(
  manifest: ArchiveManifest,
  compressionLevel: CompressionLevel = 'Optimal'
): Promise<Uint8Array> {
  try {
    const zip = new JSZip()

    for (const entry of manifest.entries) {
      if (entry.kind === 'directory') {
        zip.file(`${entry.path}/`, '', {
          dir: true,
          unixPermissions: entry.mode,
        })
        continue
      }

      if (!entry.data) {
        throw new NodearchiveError(
          'ARCHIVE_SERIALIZATION_FAILED',
          `Missing file data: ${entry.path}`
        )
      }

      zip.file(entry.path, Buffer.from(entry.data, 'base64'), {
        unixPermissions: entry.mode,
      })
    }

    return Uint8Array.from(
      await zip.generateAsync(toZipOptions(compressionLevel))
    )
  } catch (error) {
    throw toNodearchiveError(
      error,
      'ARCHIVE_SERIALIZATION_FAILED',
      'Failed to encode zip archive'
    )
  }
}

function toZipOptions(compressionLevel: CompressionLevel) {
  if (compressionLevel === 'NoCompression') {
    return { compression: 'STORE' as const, type: 'uint8array' as const }
  }

  return {
    compression: 'DEFLATE' as const,
    compressionOptions: {
      level: compressionLevel === 'Fastest' ? 1 : 9,
    },
    type: 'uint8array' as const,
  }
}

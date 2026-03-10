import type { ArchiveFormat } from '../../.types/ArchiveFormat/type.js'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import type { CompressionLevel } from '../../.types/PackArgs/type.js'
import { gzipBytes } from '../gzipBytes/index.js'
import { writeArchive } from '../writeArchive/index.js'
import { writeGzipArchive } from '../writeGzipArchive/index.js'
import { writeTarArchive } from '../writeTarArchive/index.js'
import { writeZipArchive } from '../writeZipArchive/index.js'

export async function writeOutputArchive(
  manifest: ArchiveManifest,
  outFormat: ArchiveFormat,
  compressionLevel: CompressionLevel = 'Optimal'
): Promise<Uint8Array> {
  if (outFormat === 'nar') {
    return writeArchive(manifest, compressionLevel)
  }

  if (outFormat === 'zip') {
    return writeZipArchive(manifest, compressionLevel)
  }

  if (outFormat === 'tar') {
    return writeTarArchive(manifest)
  }

  if (outFormat === 'gz') {
    return writeGzipArchive(manifest, compressionLevel)
  }

  const tarBytes = await writeTarArchive(manifest)
  return gzipBytes(tarBytes, compressionLevel)
}

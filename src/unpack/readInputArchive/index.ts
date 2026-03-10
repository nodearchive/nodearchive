import { readArchive } from '../../.helpers/readArchive/index.js'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import { readForeignArchive } from '../readForeignArchive/index.js'

export async function readInputArchive(
  bytes: Uint8Array,
  sourcePath?: string
): Promise<ArchiveManifest> {
  try {
    return await readArchive(bytes)
  } catch {
    return readForeignArchive(bytes, sourcePath)
  }
}

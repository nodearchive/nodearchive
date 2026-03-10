import { readFile } from 'node:fs/promises'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import { readArchive } from '../../.helpers/readArchive/index.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'

export async function readExistingArchive(
  destinationPath: string
): Promise<ArchiveManifest | undefined> {
  try {
    const bytes = await readFile(destinationPath)
    return readArchive(bytes)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined
    }

    throw toNodearchiveError(
      error,
      'ARCHIVE_FILESYSTEM_READ_FAILED',
      `Failed to read existing archive: ${destinationPath}`
    )
  }
}

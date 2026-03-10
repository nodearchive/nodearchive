import { readFile } from 'node:fs/promises'
import { NodearchiveError } from '../../.errors/class.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'

export async function readArchiveFile(sourcePath: string): Promise<Uint8Array> {
  try {
    const bytes = await readFile(sourcePath)
    return Uint8Array.from(bytes)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new NodearchiveError(
        'ARCHIVE_SOURCE_MISSING',
        `Archive not found: ${sourcePath}`,
        { cause: error }
      )
    }

    throw toNodearchiveError(
      error,
      'ARCHIVE_FILESYSTEM_READ_FAILED',
      `Failed to read archive: ${sourcePath}`
    )
  }
}

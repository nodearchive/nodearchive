import { lstat, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NodearchiveError } from '../../.errors/class.js'
import { assertDirectoryPath } from '../../.helpers/assertDirectoryPath/index.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'

export async function writeArchiveFile(
  destinationPath: string,
  bytes: Uint8Array,
  overwrite: boolean,
  dryRun = false
): Promise<void> {
  const absoluteDestination = path.resolve(destinationPath)

  try {
    await assertDirectoryPath(path.dirname(absoluteDestination))

    const existingType = await readPathType(absoluteDestination)

    if (existingType === 'directory') {
      throw new NodearchiveError(
        'ARCHIVE_FILESYSTEM_WRITE_FAILED',
        `Failed to write archive: ${absoluteDestination}`
      )
    }

    if (dryRun) {
      if (existingType !== undefined && !overwrite) {
        throw new NodearchiveError(
          'ARCHIVE_DESTINATION_EXISTS',
          `Destination already exists: ${absoluteDestination}`
        )
      }

      return
    }

    await mkdir(path.dirname(absoluteDestination), { recursive: true })
    await writeFile(absoluteDestination, bytes, {
      flag: overwrite ? 'w' : 'wx',
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new NodearchiveError(
        'ARCHIVE_DESTINATION_EXISTS',
        `Destination already exists: ${absoluteDestination}`,
        { cause: error }
      )
    }

    throw toNodearchiveError(
      error,
      'ARCHIVE_FILESYSTEM_WRITE_FAILED',
      `Failed to write archive: ${absoluteDestination}`
    )
  }
}

async function readPathType(
  target: string
): Promise<'directory' | 'file' | undefined> {
  try {
    const stats = await lstat(target)
    return stats.isDirectory() ? 'directory' : 'file'
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined
    }

    throw error
  }
}

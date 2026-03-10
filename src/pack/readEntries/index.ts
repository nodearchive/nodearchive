import type { ArchiveEntry } from '../../.types/ArchiveEntry/type.js'
import type { PackArgs } from '../../.types/PackArgs/type.js'
import { normalizeBlobInput } from '../../.helpers/normalizeBlobInput/index.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'
import { collectPathEntries } from '../collectPathEntries/index.js'

export async function readEntries(args: PackArgs): Promise<ArchiveEntry[]> {
  try {
    return args.blob !== undefined
      ? [
          {
            data: Buffer.from(await normalizeBlobInput(args.blob)).toString(
              'base64'
            ),
            kind: 'file',
            path: 'blob',
          },
        ]
      : await collectPathEntries(args)
  } catch (error) {
    throw toNodearchiveError(
      error,
      'ARCHIVE_FILESYSTEM_READ_FAILED',
      'Failed to collect source entries'
    )
  }
}

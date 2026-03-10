import { fromCompressed, toJSON } from '@z-base/bytecodec'
import type { ArchiveEntry } from '../../.types/ArchiveEntry/type.js'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import { NodearchiveError } from '../../.errors/class.js'
import { toNodearchiveError } from '../toNodearchiveError/index.js'

export async function readArchive(bytes: Uint8Array): Promise<ArchiveManifest> {
  try {
    const manifest = toJSON(await fromCompressed(bytes)) as Partial<
      ArchiveManifest & {
        entries: Partial<ArchiveEntry>[]
      }
    >

    if (
      manifest.format !== '@nodearchive/nodearchive' ||
      manifest.version !== 1 ||
      !Array.isArray(manifest.entries)
    ) {
      throw new NodearchiveError(
        'ARCHIVE_INVALID_FORMAT',
        'Archive header is invalid'
      )
    }

    for (const entry of manifest.entries) {
      if (
        !entry ||
        typeof entry.path !== 'string' ||
        (entry.kind !== 'file' && entry.kind !== 'directory') ||
        (entry.kind === 'file' && typeof entry.data !== 'string') ||
        (entry.mode !== undefined && typeof entry.mode !== 'number')
      ) {
        throw new NodearchiveError(
          'ARCHIVE_INVALID_FORMAT',
          'Archive entry is invalid'
        )
      }
    }

    return manifest as ArchiveManifest
  } catch (error) {
    throw toNodearchiveError(
      error,
      'ARCHIVE_INVALID_FORMAT',
      'Invalid archive payload'
    )
  }
}

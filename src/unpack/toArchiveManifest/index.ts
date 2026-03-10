import type { ArchiveEntry } from '../../.types/ArchiveEntry/type.js'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'

export function toArchiveManifest(entries: ArchiveEntry[]): ArchiveManifest {
  return {
    entries: [...entries].sort((left, right) =>
      left.path.localeCompare(right.path)
    ),
    format: '@nodearchive/nodearchive',
    version: 1,
  }
}

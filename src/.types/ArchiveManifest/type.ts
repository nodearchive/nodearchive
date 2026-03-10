import type { ArchiveEntry } from '../ArchiveEntry/type.js'

export type ArchiveManifest = {
  format: '@nodearchive/nodearchive'
  version: 1
  entries: ArchiveEntry[]
}

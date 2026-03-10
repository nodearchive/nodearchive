import type { ArchiveFormat } from '../../.types/ArchiveFormat/type.js'

export type ArchiveSummary = {
  destinationPath?: string
  dryRun: boolean
  entries: string[]
  entryCount: number
  bytes: number
  format?: ArchiveFormat
  mode: 'memory' | 'filesystem'
  updated: boolean
}

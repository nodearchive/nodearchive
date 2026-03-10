export type ArchiveEntry = {
  path: string
  kind: 'file' | 'directory'
  data?: string
  mode?: number
}

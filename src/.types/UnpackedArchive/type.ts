export type UnpackedArchiveEntry = {
  path: string
  kind: 'file' | 'directory'
  data?: Uint8Array
  mode?: number
}

export type UnpackedArchive = {
  entries: UnpackedArchiveEntry[]
}

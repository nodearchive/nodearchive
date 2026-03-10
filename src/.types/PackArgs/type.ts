import type { ByteSource } from '@z-base/bytecodec'
import type { ArchiveFormat } from '../../.types/ArchiveFormat/type.js'

export type CompressionLevel = 'Optimal' | 'Fastest' | 'NoCompression'

export type BlobInput = Blob | ByteSource | SharedArrayBuffer | string

export type PackArgs = {
  blob?: BlobInput
  path?: string | string[]
  literalPath?: string | string[]
  destinationPath?: string
  outFormat?: ArchiveFormat
  compressionLevel?: CompressionLevel
  update?: boolean
  force?: boolean
  passThru?: boolean
  whatIf?: boolean
  confirm?: boolean
}

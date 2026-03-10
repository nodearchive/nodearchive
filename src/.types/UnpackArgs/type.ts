import type { BlobInput } from '../PackArgs/type.js'

export type UnpackArgs = {
  blob?: BlobInput
  path?: string
  literalPath?: string
  destinationPath?: string
  force?: boolean
  passThru?: boolean
  whatIf?: boolean
  confirm?: boolean
}

import { constants } from 'node:zlib'
import type { CompressionLevel } from '../../.types/PackArgs/type.js'

const compressionLevels: Record<CompressionLevel, number> = {
  Optimal: constants.Z_BEST_COMPRESSION,
  Fastest: constants.Z_BEST_SPEED,
  NoCompression: constants.Z_NO_COMPRESSION,
}

export function toZlibLevel(
  compressionLevel: CompressionLevel = 'Optimal'
): number {
  return compressionLevels[compressionLevel]
}

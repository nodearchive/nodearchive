/**
 * Copyright 2026 nodearchive
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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

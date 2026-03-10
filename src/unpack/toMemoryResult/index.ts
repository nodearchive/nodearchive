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
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import type { UnpackedArchive } from '../../.types/UnpackedArchive/type.js'

export function toMemoryResult(
  manifest: ArchiveManifest
): Uint8Array | UnpackedArchive {
  if (manifest.entries.length === 1 && manifest.entries[0]?.kind === 'file') {
    return Uint8Array.from(Buffer.from(manifest.entries[0].data!, 'base64'))
  }

  return {
    entries: manifest.entries.map((entry) =>
      entry.kind === 'file'
        ? {
            data: Uint8Array.from(Buffer.from(entry.data!, 'base64')),
            kind: entry.kind,
            mode: entry.mode,
            path: entry.path,
          }
        : {
            kind: entry.kind,
            mode: entry.mode,
            path: entry.path,
          }
    ),
  }
}

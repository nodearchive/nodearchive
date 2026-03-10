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

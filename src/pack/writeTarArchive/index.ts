import tarStream from 'tar-stream'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import { NodearchiveError } from '../../.errors/class.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'

export async function writeTarArchive(
  manifest: ArchiveManifest
): Promise<Uint8Array> {
  try {
    const pack = tarStream.pack()
    const chunks: Buffer[] = []
    const output = new Promise<Uint8Array>((resolve, reject) => {
      pack.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk))
      })
      pack.on('error', reject)
      pack.on('end', () => resolve(Uint8Array.from(Buffer.concat(chunks))))
    })

    for (const entry of manifest.entries) {
      await writeEntry(pack, entry)
    }

    pack.finalize()
    return output
  } catch (error) {
    throw toNodearchiveError(
      error,
      'ARCHIVE_SERIALIZATION_FAILED',
      'Failed to encode tar archive'
    )
  }
}

function writeEntry(
  pack: tarStream.Pack,
  entry: ArchiveManifest['entries'][number]
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (entry.kind === 'directory') {
      pack.entry(
        {
          mode: entry.mode ?? 0o755,
          name: `${entry.path}/`,
          type: 'directory',
        },
        onComplete
      )
      return
    }

    if (!entry.data) {
      reject(
        new NodearchiveError(
          'ARCHIVE_SERIALIZATION_FAILED',
          `Missing file data: ${entry.path}`
        )
      )
      return
    }

    pack.entry(
      {
        mode: entry.mode ?? 0o644,
        name: entry.path,
        type: 'file',
      },
      Buffer.from(entry.data, 'base64'),
      onComplete
    )

    function onComplete(error?: Error | null) {
      if (error) {
        reject(error)
        return
      }

      resolve()
    }
  })
}

import { NodearchiveError } from '../.errors/class.js'
import { normalizeBlobInput } from '../.helpers/normalizeBlobInput/index.js'
import { toNodearchiveError } from '../.helpers/toNodearchiveError/index.js'
import type { ArchiveSummary } from '../.types/ArchiveSummary/type.js'
import type { UnpackArgs } from '../.types/UnpackArgs/type.js'
import type { UnpackedArchive } from '../.types/UnpackedArchive/type.js'
import { materializeArchive } from './materializeArchive/index.js'
import { readArchiveFile } from './readArchiveFile/index.js'
import { readInputArchive } from './readInputArchive/index.js'
import { toMemoryResult } from './toMemoryResult/index.js'

export type { UnpackArgs } from '../.types/UnpackArgs/type.js'

/**
 * Reads a `.nar` archive or a supported incoming archive format and returns its
 * contents in memory or writes them to the filesystem.
 *
 * The source is selected from exactly one input mode:
 *
 * - `blob` reads archive bytes already held in memory.
 * - `path` reads an archive from the filesystem.
 * - `literalPath` reads an exact archive path without additional path logic.
 *
 * The reader accepts native `.nar` payloads and supported foreign formats such
 * as `.zip`, `.tar`, `.tgz`, `.tar.gz`, and `.gz`.
 *
 * When `destinationPath` is omitted, the archive is returned in memory. A
 * single-file archive resolves to `Uint8Array`; multi-entry archives resolve to
 * an {@link UnpackedArchive}. When `destinationPath` is provided, extraction is
 * performed on disk unless `whatIf` is enabled.
 *
 * @param args Options that control source selection, extraction mode,
 * overwrite behavior, summary emission, and dry-run behavior.
 * @returns A memory result when `destinationPath` is omitted, an
 * {@link ArchiveSummary} when `passThru` is enabled for filesystem extraction,
 * or `undefined` after extraction when no summary is requested.
 * @throws {NodearchiveError} Thrown when `confirm` is provided, when input
 * modes are combined, when no archive input is supplied, or when extraction
 * fails validation or filesystem materialization.
 *
 * @example
 * Extract an archive to disk.
 * ```ts
 * await unpack({
 *   path: './dist/app.nar',
 *   destinationPath: './out',
 *   force: true,
 * })
 * ```
 *
 * @example
 * Read an archive entirely in memory.
 * ```ts
 * const restored = await unpack({ blob: archiveBytes })
 * ```
 */
export async function unpack(
  args: UnpackArgs = {}
): Promise<ArchiveSummary | Uint8Array | UnpackedArchive | undefined> {
  if (args.confirm) {
    throw new NodearchiveError(
      'ARCHIVE_CONFIRM_UNSUPPORTED',
      '`confirm` is not supported'
    )
  }

  if (
    args.blob !== undefined &&
    (args.path !== undefined || args.literalPath)
  ) {
    throw new NodearchiveError(
      'ARCHIVE_INPUT_CONFLICT',
      'Provide either `blob` or `path`/`literalPath`, not both'
    )
  }

  const sourcePath = args.literalPath ?? args.path

  if (args.blob === undefined && sourcePath === undefined) {
    throw new NodearchiveError(
      'ARCHIVE_INPUT_REQUIRED',
      'Provide `blob`, `path`, or `literalPath`'
    )
  }

  const archiveBytes =
    args.blob !== undefined
      ? await normalizeBlobInput(args.blob)
      : await readArchiveFile(sourcePath!)
  const manifest = await readInputArchive(archiveBytes, sourcePath)
  const summary: ArchiveSummary = {
    bytes: manifest.entries.reduce(
      (total, entry) =>
        total +
        (entry.kind === 'file'
          ? Buffer.from(entry.data!, 'base64').byteLength
          : 0),
      0
    ),
    destinationPath: args.destinationPath,
    dryRun: Boolean(args.whatIf),
    entries: manifest.entries.map((entry) => entry.path),
    entryCount: manifest.entries.length,
    mode: args.destinationPath ? 'filesystem' : 'memory',
    updated: false,
  }

  if (!args.destinationPath) {
    return toMemoryResult(manifest)
  }

  try {
    await materializeArchive(
      manifest,
      args.destinationPath,
      args.force,
      Boolean(args.whatIf)
    )
  } catch (error) {
    throw toNodearchiveError(
      error,
      'ARCHIVE_FILESYSTEM_WRITE_FAILED',
      'Failed to extract archive'
    )
  }

  return args.passThru ? summary : undefined
}

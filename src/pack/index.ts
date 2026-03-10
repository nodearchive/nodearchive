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
import { NodearchiveError } from '../.errors/class.js'
import type { ArchiveManifest } from '../.types/ArchiveManifest/type.js'
import type { ArchiveSummary } from '../.types/ArchiveSummary/type.js'
import type { PackArgs } from '../.types/PackArgs/type.js'
import { readEntries } from './readEntries/index.js'
import { readExistingArchive } from './readExistingArchive/index.js'
import { resolveOutputFormat } from './resolveOutputFormat/index.js'
import { writeArchiveFile } from './writeArchiveFile/index.js'
import { writeOutputArchive } from './writeOutputArchive/index.js'

export type { PackArgs } from '../.types/PackArgs/type.js'

/**
 * Creates an archive from in-memory data or filesystem inputs.
 *
 * The source is selected from exactly one input mode:
 *
 * - `blob` packs bytes already held in memory.
 * - `path` expands one or more glob patterns before reading entries.
 * - `literalPath` reads one or more exact filesystem paths without glob expansion.
 *
 * The output format defaults to `.nar`, but can also be selected through
 * `outFormat` or inferred from `destinationPath` when the extension matches
 * `.zip`, `.tar`, `.tgz`, `.tar.gz`, or `.gz`.
 *
 * When `destinationPath` is omitted, the archive is produced in memory. When
 * `destinationPath` is provided, the archive is written to the filesystem
 * unless `whatIf` is enabled.
 *
 * If `update` is set together with `destinationPath`, the existing `.nar`
 * archive at that path is read first and entries from the new input replace
 * matching paths in the existing manifest. Update mode is currently limited to
 * native `.nar` output.
 *
 * @param args Options that control source selection, compression, output mode,
 * summary emission, dry-run behavior, output format selection, and archive
 * updates.
 * @returns Archive bytes in memory mode, an {@link ArchiveSummary} when
 * `passThru` is enabled, or `undefined` after a filesystem write when no
 * summary is requested.
 * @throws {NodearchiveError} Thrown when `confirm` is provided, when input
 * modes are combined, or when no archive input is supplied.
 *
 * @example
 * Write a native archive to disk.
 * ```ts
 * await pack({
 *   literalPath: ['src', 'package.json'],
 *   destinationPath: './dist/app.nar',
 *   force: true,
 * })
 * ```
 *
 * @example
 * Create an archive in memory.
 * ```ts
 * const archive = await pack({ blob: 'hello world' })
 * ```
 *
 * @example
 * Emit a zip archive instead of `.nar`.
 * ```ts
 * await pack({
 *   literalPath: ['src'],
 *   destinationPath: './dist/app.zip',
 *   outFormat: 'zip',
 * })
 * ```
 */
export async function pack(
  args: PackArgs = {}
): Promise<ArchiveSummary | Uint8Array | undefined> {
  if (args.confirm) {
    throw new NodearchiveError(
      'ARCHIVE_CONFIRM_UNSUPPORTED',
      '`confirm` is not supported'
    )
  }

  if (
    args.blob !== undefined &&
    (args.path !== undefined || args.literalPath !== undefined)
  ) {
    throw new NodearchiveError(
      'ARCHIVE_INPUT_CONFLICT',
      'Provide either `blob` or `path`/`literalPath`, not both'
    )
  }

  if (
    args.blob === undefined &&
    args.path === undefined &&
    args.literalPath === undefined
  ) {
    throw new NodearchiveError(
      'ARCHIVE_INPUT_REQUIRED',
      'Provide `blob`, `path`, or `literalPath`'
    )
  }

  const outFormat = resolveOutputFormat(args.destinationPath, args.outFormat)

  if (args.update && outFormat !== 'nar') {
    throw new NodearchiveError(
      'ARCHIVE_OUTPUT_FORMAT_INVALID',
      '`update` is only supported for `.nar` output'
    )
  }

  const entries = await readEntries(args)

  const existing =
    args.update && args.destinationPath
      ? await readExistingArchive(args.destinationPath)
      : undefined

  const manifest: ArchiveManifest = {
    entries: mergeEntries(existing?.entries ?? [], entries),
    format: '@nodearchive/nodearchive',
    version: 1,
  }

  const bytes = await writeOutputArchive(
    manifest,
    outFormat,
    args.compressionLevel
  )
  const summary: ArchiveSummary = {
    bytes: bytes.byteLength,
    destinationPath: args.destinationPath,
    dryRun: Boolean(args.whatIf),
    entries: manifest.entries.map((entry) => entry.path),
    entryCount: manifest.entries.length,
    format: outFormat,
    mode: args.destinationPath ? 'filesystem' : 'memory',
    updated: existing !== undefined,
  }

  if (!args.destinationPath) {
    return args.passThru ? summary : bytes
  }

  await writeArchiveFile(
    args.destinationPath,
    bytes,
    Boolean(args.force || args.update),
    Boolean(args.whatIf)
  )

  return args.passThru ? summary : undefined
}

function mergeEntries(
  left: ArchiveManifest['entries'],
  right: ArchiveManifest['entries']
) {
  const merged = new Map(left.map((entry) => [entry.path, entry]))

  for (const entry of right) {
    merged.set(entry.path, entry)
  }

  return [...merged.values()].sort((a, b) => a.path.localeCompare(b.path))
}

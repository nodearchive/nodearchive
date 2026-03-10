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
import { lstat, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { NodearchiveError } from '../../.errors/class.js'
import type { ArchiveEntry } from '../../.types/ArchiveEntry/type.js'
import type { PackArgs } from '../../.types/PackArgs/type.js'

export async function collectPathEntries(
  args: Pick<PackArgs, 'path' | 'literalPath'>
): Promise<ArchiveEntry[]> {
  const sources = args.literalPath
    ? toList(args.literalPath)
    : await expandGlobs(toList(args.path))

  if (sources.length === 0) {
    throw new NodearchiveError(
      'ARCHIVE_SOURCE_MISSING',
      'No source paths matched'
    )
  }

  const entries: ArchiveEntry[] = []
  const seen = new Set<string>()

  for (const source of sources) {
    const absoluteSource = path.resolve(source)
    const root = toArchiveRoot(source, absoluteSource)
    await visit(absoluteSource, root)
  }

  return entries.sort((left, right) => left.path.localeCompare(right.path))

  async function visit(absoluteTarget: string, archivePath: string) {
    const stats = await inspect(absoluteTarget)

    if (stats.isSymbolicLink()) {
      throw new NodearchiveError(
        'ARCHIVE_UNSUPPORTED_ENTRY',
        `Symbolic links are not supported: ${archivePath}`
      )
    }

    if (stats.isDirectory()) {
      if (!seen.has(archivePath)) {
        seen.add(archivePath)
        entries.push({
          kind: 'directory',
          mode: stats.mode & 0o777,
          path: archivePath,
        })
      }

      const children = await readChildren(absoluteTarget)

      for (const child of children) {
        await visit(
          path.join(absoluteTarget, child),
          `${archivePath}/${child.replaceAll('\\', '/')}`
        )
      }

      return
    }

    if (seen.has(archivePath)) {
      return
    }

    const bytes = await readSource(absoluteTarget)
    seen.add(archivePath)
    entries.push({
      data: Buffer.from(bytes).toString('base64'),
      kind: 'file',
      mode: stats.mode & 0o777,
      path: archivePath,
    })
  }

  async function inspect(target: string) {
    try {
      return await lstat(target)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new NodearchiveError(
          'ARCHIVE_SOURCE_MISSING',
          `Source not found: ${target}`,
          { cause: error }
        )
      }

      throw error
    }
  }

  async function readChildren(target: string) {
    const children = await readdir(target)
    return children.sort((left, right) => left.localeCompare(right))
  }

  async function readSource(target: string) {
    return readFile(target)
  }
}

async function expandGlobs(values: string[]): Promise<string[]> {
  if (values.length === 0) {
    return []
  }

  const { default: fg } = (await import('fast-glob')) as {
    default: typeof import('fast-glob')
  }
  return fg(values, {
    cwd: process.cwd(),
    dot: true,
    followSymbolicLinks: false,
    onlyFiles: false,
    unique: true,
  })
}

function toArchiveRoot(source: string, absoluteSource: string): string {
  if (path.isAbsolute(source)) {
    return path.basename(absoluteSource)
  }

  const relative = path.relative(process.cwd(), absoluteSource)

  if (relative === '' || relative === '.') {
    return path.basename(absoluteSource)
  }

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new NodearchiveError(
      'ARCHIVE_SOURCE_OUTSIDE_CWD',
      `Relative source must stay inside the current working directory: ${source}`
    )
  }

  return relative.replaceAll('\\', '/')
}

function toList(value?: string | string[]): string[] {
  if (value === undefined) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

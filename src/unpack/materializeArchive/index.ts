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
import { chmod, lstat, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import { NodearchiveError } from '../../.errors/class.js'
import { assertDirectoryPath } from '../../.helpers/assertDirectoryPath/index.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'

export async function materializeArchive(
  manifest: ArchiveManifest,
  destinationPath: string,
  force = false,
  dryRun = false
): Promise<void> {
  const root = path.resolve(destinationPath)
  await assertDirectoryPath(root)

  if (!dryRun) {
    await ensureDirectory(root)
  }

  for (const entry of manifest.entries) {
    const safePath = toSafePath(entry.path)
    const target = path.join(root, ...safePath.split('/'))

    if (entry.kind === 'directory') {
      await assertDirectoryPath(target)

      if (!dryRun) {
        await ensureDirectory(target)
        await applyMode(target, entry.mode)
      }

      continue
    }

    await assertDirectoryPath(path.dirname(target))

    const existingType = await readPathType(target)

    if (existingType === 'directory') {
      throw new NodearchiveError(
        'ARCHIVE_FILESYSTEM_WRITE_FAILED',
        `Failed to write file: ${target}`
      )
    }

    if (dryRun) {
      if (existingType !== undefined && !force) {
        throw new NodearchiveError(
          'ARCHIVE_DESTINATION_EXISTS',
          `Destination already exists: ${target}`
        )
      }

      continue
    }

    await ensureDirectory(path.dirname(target))

    try {
      await writeFile(target, Buffer.from(entry.data!, 'base64'), {
        flag: force ? 'w' : 'wx',
      })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        throw new NodearchiveError(
          'ARCHIVE_DESTINATION_EXISTS',
          `Destination already exists: ${target}`,
          { cause: error }
        )
      }

      throw toNodearchiveError(
        error,
        'ARCHIVE_FILESYSTEM_WRITE_FAILED',
        `Failed to write file: ${target}`
      )
    }

    await applyMode(target, entry.mode)
  }
}

async function applyMode(target: string, mode?: number): Promise<void> {
  if (mode === undefined) {
    return
  }

  await chmod(target, mode)
}

async function ensureDirectory(target: string): Promise<void> {
  await mkdir(target, { recursive: true })
}

async function readPathType(
  target: string
): Promise<'directory' | 'file' | undefined> {
  try {
    const stats = await lstat(target)
    return stats.isDirectory() ? 'directory' : 'file'
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined
    }

    throw error
  }
}

function toSafePath(value: string): string {
  const normalized = path.posix.normalize(value)

  if (
    normalized === '.' ||
    normalized.startsWith('../') ||
    normalized.startsWith('/') ||
    /^[A-Za-z]:/.test(normalized)
  ) {
    throw new NodearchiveError(
      'ARCHIVE_ENTRY_PATH_INVALID',
      `Archive entry path is not safe to extract: ${value}`
    )
  }

  return normalized
}

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
import { lstat } from 'node:fs/promises'
import path from 'node:path'
import { NodearchiveError } from '../../.errors/class.js'
import { toNodearchiveError } from '../toNodearchiveError/index.js'

export async function assertDirectoryPath(target: string): Promise<void> {
  const absoluteTarget = path.resolve(target)
  const parsed = path.parse(absoluteTarget)
  let current = parsed.root

  for (const segment of absoluteTarget
    .slice(parsed.root.length)
    .split(path.sep)) {
    if (segment === '') {
      continue
    }

    current = path.join(current, segment)

    try {
      const stats = await lstat(current)

      if (!stats.isDirectory()) {
        throw new NodearchiveError(
          'ARCHIVE_FILESYSTEM_WRITE_FAILED',
          `Destination path is blocked by a file: ${current}`
        )
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue
      }

      throw toNodearchiveError(
        error,
        'ARCHIVE_FILESYSTEM_WRITE_FAILED',
        `Failed to inspect path: ${current}`
      )
    }
  }
}

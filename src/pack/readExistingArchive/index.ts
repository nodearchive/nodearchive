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
import { readFile } from 'node:fs/promises'
import type { ArchiveManifest } from '../../.types/ArchiveManifest/type.js'
import { readArchive } from '../../.helpers/readArchive/index.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'

export async function readExistingArchive(
  destinationPath: string
): Promise<ArchiveManifest | undefined> {
  try {
    const bytes = await readFile(destinationPath)
    return readArchive(bytes)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined
    }

    throw toNodearchiveError(
      error,
      'ARCHIVE_FILESYSTEM_READ_FAILED',
      `Failed to read existing archive: ${destinationPath}`
    )
  }
}

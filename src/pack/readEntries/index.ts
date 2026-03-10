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
import type { ArchiveEntry } from '../../.types/ArchiveEntry/type.js'
import type { PackArgs } from '../../.types/PackArgs/type.js'
import { normalizeBlobInput } from '../../.helpers/normalizeBlobInput/index.js'
import { toNodearchiveError } from '../../.helpers/toNodearchiveError/index.js'
import { collectPathEntries } from '../collectPathEntries/index.js'

export async function readEntries(args: PackArgs): Promise<ArchiveEntry[]> {
  try {
    return args.blob !== undefined
      ? [
          {
            data: Buffer.from(await normalizeBlobInput(args.blob)).toString(
              'base64'
            ),
            kind: 'file',
            path: 'blob',
          },
        ]
      : await collectPathEntries(args)
  } catch (error) {
    throw toNodearchiveError(
      error,
      'ARCHIVE_FILESYSTEM_READ_FAILED',
      'Failed to collect source entries'
    )
  }
}

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
import type { ArchiveFormat } from '../../.types/ArchiveFormat/type.js'
import { NodearchiveError } from '../../.errors/class.js'

const supportedFormats = ['nar', 'zip', 'tar', 'tgz', 'tar.gz', 'gz'] as const
const knownSuffixes = [
  ['.tar.gz', 'tar.gz'],
  ['.tgz', 'tgz'],
  ['.zip', 'zip'],
  ['.tar', 'tar'],
  ['.nar', 'nar'],
  ['.gz', 'gz'],
] as const satisfies readonly (readonly [string, ArchiveFormat])[]

export function resolveOutputFormat(
  destinationPath?: string,
  outFormat?: string
): ArchiveFormat {
  const inferred = inferOutputFormat(destinationPath)

  if (!outFormat) {
    return inferred ?? 'nar'
  }

  if (!supportedFormats.includes(outFormat as ArchiveFormat)) {
    throw new NodearchiveError(
      'ARCHIVE_OUTPUT_FORMAT_INVALID',
      `Unsupported output format: ${outFormat}`
    )
  }

  if (
    inferred !== undefined &&
    normalizeArchiveFormat(inferred) !==
      normalizeArchiveFormat(outFormat as ArchiveFormat)
  ) {
    throw new NodearchiveError(
      'ARCHIVE_OUTPUT_FORMAT_INVALID',
      `Destination extension does not match \`${outFormat}\``
    )
  }

  return outFormat as ArchiveFormat
}

function inferOutputFormat(
  destinationPath?: string
): ArchiveFormat | undefined {
  if (!destinationPath) {
    return undefined
  }

  const lowerPath = destinationPath.toLowerCase()

  for (const [suffix, format] of knownSuffixes) {
    if (lowerPath.endsWith(suffix)) {
      return format
    }
  }

  return undefined
}

function normalizeArchiveFormat(format: ArchiveFormat): ArchiveFormat {
  return format === 'tgz' ? 'tar.gz' : format
}

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
export type NodearchiveCode =
  | 'ARCHIVE_CONFIRM_UNSUPPORTED'
  | 'ARCHIVE_DESTINATION_EXISTS'
  | 'ARCHIVE_ENTRY_PATH_INVALID'
  | 'ARCHIVE_FILESYSTEM_READ_FAILED'
  | 'ARCHIVE_FILESYSTEM_WRITE_FAILED'
  | 'ARCHIVE_INPUT_CONFLICT'
  | 'ARCHIVE_INPUT_REQUIRED'
  | 'ARCHIVE_INVALID_FORMAT'
  | 'ARCHIVE_OUTPUT_FORMAT_INVALID'
  | 'ARCHIVE_SERIALIZATION_FAILED'
  | 'ARCHIVE_SOURCE_MISSING'
  | 'ARCHIVE_SOURCE_OUTSIDE_CWD'
  | 'ARCHIVE_UNSUPPORTED_BLOB'
  | 'ARCHIVE_UNSUPPORTED_ENTRY'

export class NodearchiveError extends Error {
  readonly code: NodearchiveCode

  constructor(code: NodearchiveCode, message?: string, options?: ErrorOptions) {
    const detail = message ?? code
    super(`@nodearchive/nodearchive ${detail}`, options)
    this.code = code
    this.name = 'NodearchiveError'
  }
}

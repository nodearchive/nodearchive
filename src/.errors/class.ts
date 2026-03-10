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

import { NodearchiveError, type NodearchiveCode } from '../../.errors/class.js'

export function toNodearchiveError(
  error: unknown,
  code: NodearchiveCode,
  message?: string
): NodearchiveError {
  if (error instanceof NodearchiveError) {
    return error
  }

  const cause = error instanceof Error ? error : undefined
  const detail =
    cause?.message && message ? `${message}: ${cause.message}` : message

  return new NodearchiveError(code, detail, cause ? { cause } : undefined)
}

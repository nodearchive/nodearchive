import { fromString, toUint8Array } from '@z-base/bytecodec'
import { NodearchiveError } from '../../.errors/class.js'
import type { BlobInput } from '../../.types/PackArgs/type.js'

export async function normalizeBlobInput(
  input: BlobInput
): Promise<Uint8Array> {
  if (typeof input === 'string') {
    return fromString(input)
  }

  if (input instanceof Blob) {
    return new Uint8Array(await input.arrayBuffer())
  }

  if (
    typeof SharedArrayBuffer !== 'undefined' &&
    input instanceof SharedArrayBuffer
  ) {
    return Uint8Array.from(new Uint8Array(input))
  }

  try {
    return toUint8Array(
      input as Exclude<BlobInput, Blob | SharedArrayBuffer | string>
    )
  } catch {
    throw new NodearchiveError(
      'ARCHIVE_UNSUPPORTED_BLOB',
      'Unsupported blob input'
    )
  }
}

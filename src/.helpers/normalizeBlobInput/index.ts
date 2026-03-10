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
import { NodearchiveError } from '../../.errors/class.js'
import type { BlobInput } from '../../.types/PackArgs/type.js'
import { readBytecodec } from '../readBytecodec/index.js'

export async function normalizeBlobInput(
  input: BlobInput
): Promise<Uint8Array> {
  if (typeof input === 'string') {
    const { fromString } = await readBytecodec()
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
    const { toUint8Array } = await readBytecodec()
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

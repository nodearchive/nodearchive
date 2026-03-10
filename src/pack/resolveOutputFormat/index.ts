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

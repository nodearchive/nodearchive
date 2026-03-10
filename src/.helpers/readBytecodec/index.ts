const importBytecodec = Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<typeof import('@z-base/bytecodec')>

export function readBytecodec() {
  return importBytecodec('@z-base/bytecodec')
}

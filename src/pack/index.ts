export type PackArgs = {
  blob?: any
  path?: string[]
  literalPath?: string[]

  destinationPath?: string

  compressionLevel?: 'Optimal' | 'Fastest' | 'NoCompression'

  update?: boolean
  force?: boolean
  passThru?: boolean

  whatIf?: boolean
  confirm?: boolean
}

// I want to also support pathless, meaning in memory writes so it returns a archive file, instead of writing it, basically blob, so this works in browsers even

export async function pack() {}

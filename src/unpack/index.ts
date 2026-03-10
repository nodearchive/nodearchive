export type UnpackArgs = {
  blob?: any
  path?: string
  literalPath?: string

  destinationPath?: string

  force?: boolean
  passThru?: boolean

  whatIf?: boolean
  confirm?: boolean
}

// I want to also support pathless, meaning in memory writes so it returns a archive file, instead of writing it, basically blob, so this works in browsers even

export async function unpack() {}

import { makeShortArg } from '../makeShortArg/index.js'

export function buildArgOptions(schema) {
  const used = new Set()

  return Object.fromEntries(
    Object.entries(schema).map(([name, option]) => {
      const short = option.short ?? makeShortArg(name, used)

      if (short) {
        used.add(short)
      }

      return [
        name,
        short === undefined
          ? { ...option }
          : {
              ...option,
              short,
            },
      ]
    })
  )
}

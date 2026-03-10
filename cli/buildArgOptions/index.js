export function buildArgOptions(paramNames) {
  const used = new Set()

  return Object.fromEntries(
    paramNames.map((name) => {
      const short = makeShort(name, used)

      return [
        name,
        short === undefined
          ? {
              type: 'string',
            }
          : {
              type: 'string',
              short,
            },
      ]
    })
  )
}

export function makeShortArg(name, used) {
  for (const char of name) {
    const short = char.toLowerCase()
    if (/^[a-z]$/.test(short) && !used.has(short)) {
      used.add(short)
      return short
    }
  }
}

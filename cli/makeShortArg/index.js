export function makeShortArg(name, used) {
  for (const char of name) {
    const short = char.toUpperCase()
    if (/^[A-Z]$/.test(short) && !used.has(short)) {
      used.add(short)
      return short
    }
  }
}

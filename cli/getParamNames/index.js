export function getParamNames(fn) {
  const source = Function.prototype.toString
    .call(fn)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')

  const match = source.match(/^[^(]*\(([^)]*)\)/)
  const raw = match?.[1] ?? ''

  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) =>
      part
        .replace(/^\.{3}/, '')
        .replace(/\s*=.*$/s, '')
        .trim()
    )
}

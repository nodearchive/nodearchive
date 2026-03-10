export function decodeArgs(value) {
  if (value == null) return value
  if (value === 'true') return true
  if (value === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value)

  const first = value[0]
  const last = value[value.length - 1]

  if (
    (first === '{' && last === '}') ||
    (first === '[' && last === ']') ||
    (first === '"' && last === '"')
  ) {
    try {
      return JSON.parse(value)
    } catch {}
  }

  return value
}

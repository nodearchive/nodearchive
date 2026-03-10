export function printCommandResult(result) {
  if (result == null) return

  if (typeof result === 'string') {
    process.stdout.write(result.endsWith('\n') ? result : `${result}\n`)
    return
  }

  if (result instanceof Uint8Array) {
    process.stdout.write(result)
    return
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

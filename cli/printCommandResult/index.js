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

  console.log(result)
}

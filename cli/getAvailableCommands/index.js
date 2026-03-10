export function getAvailableCommands(commandMap) {
  return Object.entries(commandMap).sort(([left], [right]) =>
    left.localeCompare(right)
  )
}

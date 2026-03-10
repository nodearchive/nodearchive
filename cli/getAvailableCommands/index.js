export function getAvailableCommands(commandMap) {
  return Object.entries(commandMap)
    .filter(([, fn]) => typeof fn === 'function')
    .sort(([left], [right]) => left.localeCompare(right))
}

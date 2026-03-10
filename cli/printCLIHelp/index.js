import { getAvailableCommands } from '../getAvailableCommands/index.js'

export function printHelp(stream = process.stdout, commandMap) {
  const lines = [
    'Usage:',
    '  archive',
    '  archive <command> [...args]',
    '  archive --help',
    '  archive --version',
    '',
    'Arguments can be passed positionally or with generated --name / -X flags.',
    '',
    'Commands:',
    ...getAvailableCommands(commandMap).map(([name, fn]) => {
      const paramNames = getParamNames(fn)
      const signature =
        paramNames.length > 0
          ? ` ${paramNames.map((param) => `<${param}>`).join(' ')}`
          : ''

      return `  ${name}${signature}`
    }),
  ]

  stream.write(`${lines.join('\n')}\n`)
}

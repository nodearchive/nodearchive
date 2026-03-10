import { getAvailableCommands } from '../getAvailableCommands/index.js'
import { buildArgOptions } from '../buildArgOptions/index.js'

export function printHelp(stream = process.stdout, commandConfig, commandName) {
  const lines = commandName
    ? buildCommandHelp(commandConfig[commandName], commandName)
    : buildGeneralHelp(commandConfig)

  stream.write(`${lines.join('\n')}\n`)
}

function buildGeneralHelp(commandConfig) {
  return [
    'Usage:',
    '  nar <command> [options]',
    '  nar <command> --help',
    '  nar --help',
    '  nar --version',
    '',
    'Commands:',
    ...getAvailableCommands(commandConfig).map(
      ([name, config]) => `  ${name.padEnd(8)} ${config.description}`
    ),
    '',
    'Run `nar <command> --help` for command-specific flags.',
  ]
}

function buildCommandHelp(config, commandName) {
  const options = buildArgOptions({
    ...config.options,
    help: {
      description: 'Show command help',
      short: 'h',
      type: 'boolean',
    },
  })

  return [
    `Usage:`,
    `  ${config.usage}`,
    '',
    config.description,
    '',
    'Options:',
    ...Object.entries(options).map(([name, option]) => {
      const short = option.short ? `-${option.short}, ` : ''
      const type =
        option.type === 'boolean'
          ? ''
          : option.multiple
            ? ' <value...>'
            : ' <value>'
      return `  ${short}--${name}${type}  ${option.description}`
    }),
    '',
    `Example:`,
    `  ${config.example ?? `nar ${commandName}`}`,
  ]
}

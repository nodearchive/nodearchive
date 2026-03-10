#!/usr/bin/env node

/**
 * Copyright 2026 nodearchive
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { NodearchiveError, pack, unpack } from '../dist/index.js'
import { printHelp } from './printCLIHelp/index.js'
import { printVersion } from './printCLIVersion/index.js'
import { parseArgs } from 'util'
import { buildArgOptions } from './buildArgOptions/index.js'
import { printCommandResult } from './printCommandResult/index.js'

const commandConfig = {
  pack: {
    description:
      'Create a `.nar`, `.zip`, `.tar`, `.tgz`, `.tar.gz`, or `.gz` archive.',
    example: 'nar pack ./src ./dist/app.zip --outFormat zip',
    options: {
      path: {
        description:
          'Glob path to include. Repeat the flag for multiple inputs.',
        multiple: true,
        short: 'p',
        type: 'string',
      },
      literalPath: {
        description: 'Exact path to include without glob expansion.',
        multiple: true,
        short: 'l',
        type: 'string',
      },
      destinationPath: {
        description: 'Archive file to write. Omit to stream bytes to stdout.',
        short: 'd',
        type: 'string',
      },
      outFormat: {
        description: 'Output format: nar, zip, tar, tgz, tar.gz, or gz.',
        short: 'o',
        type: 'string',
      },
      compressionLevel: {
        description: 'Compression level: Optimal, Fastest, or NoCompression.',
        short: 'c',
        type: 'string',
      },
      update: {
        description: 'Merge with an existing archive at the destination path.',
        short: 'u',
        type: 'boolean',
      },
      force: {
        description: 'Overwrite an existing archive file.',
        short: 'f',
        type: 'boolean',
      },
      passThru: {
        description:
          'Print a JSON summary instead of staying silent after writes.',
        short: 't',
        type: 'boolean',
      },
      whatIf: {
        description: 'Build the plan without writing the archive file.',
        short: 'w',
        type: 'boolean',
      },
      confirm: {
        description: 'Reserved for compatibility; currently unsupported.',
        short: 'y',
        type: 'boolean',
      },
    },
    usage: 'nar pack <path> [destinationPath]',
  },
  unpack: {
    description:
      'Extract an archive to a directory or emit bytes in memory mode.',
    example: 'nar unpack ./dist/app.nar ./out --force',
    options: {
      path: {
        description: 'Archive file to read.',
        short: 'p',
        type: 'string',
      },
      literalPath: {
        description: 'Exact archive path to read without glob semantics.',
        short: 'l',
        type: 'string',
      },
      destinationPath: {
        description:
          'Directory to extract into. Omit to stream bytes to stdout.',
        short: 'd',
        type: 'string',
      },
      force: {
        description: 'Overwrite existing extracted files.',
        short: 'f',
        type: 'boolean',
      },
      passThru: {
        description: 'Print a JSON summary after extraction.',
        short: 't',
        type: 'boolean',
      },
      whatIf: {
        description: 'Build the extraction plan without writing files.',
        short: 'w',
        type: 'boolean',
      },
      confirm: {
        description: 'Reserved for compatibility; currently unsupported.',
        short: 'y',
        type: 'boolean',
      },
    },
    usage: 'nar unpack <archivePath> [destinationPath]',
  },
}

const commandMap = { pack, unpack }

async function main() {
  const rawArgs = process.argv.slice(2)
  const [firstArg] = rawArgs

  if (firstArg === '--help' || firstArg === '-h') {
    printHelp(process.stdout, commandConfig)
    return 0
  }

  if (firstArg === '--version' || firstArg === '-v') {
    await printVersion()
    return 0
  }

  if (firstArg === 'help') {
    const commandName = rawArgs[1]

    if (commandName && !commandConfig[commandName]) {
      process.stderr.write(`Unknown command: ${commandName}\n\n`)
      printHelp(process.stderr, commandConfig)
      return 1
    }

    printHelp(process.stdout, commandConfig, commandName)
    return 0
  }

  const bootstrap = parseArgs({
    args: rawArgs,
    options: {},
    allowPositionals: true,
    strict: false,
  })

  const [command] = bootstrap.positionals

  if (!command || command === 'help') {
    printHelp(process.stdout, commandConfig)
    return 0
  }

  const fn = commandMap[command]
  const config = commandConfig[command]

  if (!config || typeof fn !== 'function') {
    process.stderr.write(`Unknown command: ${command}\n\n`)
    printHelp(process.stderr, commandConfig)
    return 1
  }

  const parsed = parseArgs({
    args: rawArgs.slice(1),
    options: buildArgOptions({
      ...config.options,
      help: {
        description: 'Show command help',
        short: 'h',
        type: 'boolean',
      },
    }),
    allowPositionals: true,
    strict: true,
  })

  if (parsed.values.help) {
    printHelp(process.stdout, commandConfig, command)
    return 0
  }

  const args = normalizeArgs(command, parsed.values, parsed.positionals)
  const result = await fn(args)
  printCommandResult(result)
  return 0
}

try {
  process.exitCode = await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}

function normalizeArgs(command, values, positionals) {
  const remaining = [...positionals]
  const args = { ...values }

  if (command === 'pack') {
    if (
      args.path === undefined &&
      args.literalPath === undefined &&
      remaining[0]
    ) {
      args.path = [remaining.shift()]
    }

    if (args.destinationPath === undefined && remaining[0]) {
      args.destinationPath = remaining.shift()
    }
  }

  if (command === 'unpack') {
    if (
      args.path === undefined &&
      args.literalPath === undefined &&
      remaining[0]
    ) {
      args.path = remaining.shift()
    }

    if (args.destinationPath === undefined && remaining[0]) {
      args.destinationPath = remaining.shift()
    }
  }

  if (remaining.length > 0) {
    throw new NodearchiveError(
      'ARCHIVE_INPUT_CONFLICT',
      `Unexpected positional arguments: ${remaining.join(' ')}`
    )
  }

  return args
}

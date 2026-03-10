#!/usr/bin/env node

import * as archive from '../dist/index.js'
import { printHelp } from './printHelp/index.js'
import { printVersion } from './printVersion/index.js'
import { parseArgs } from 'util'
import { getParamNames } from './getParamNames/index.js'
import { buildArgOptions } from './buildArgOptions/index.js'
import { decodeArgs } from './decodeArgs/index.js'
import { printCommandResult } from './printCommandResult/index.js'

const commandMap = archive

async function main() {
  const rawArgs = process.argv.slice(2)
  const [firstArg] = rawArgs

  if (firstArg === '--help' || firstArg === '-h') {
    printHelp()
    return 0
  }

  if (firstArg === '--version' || firstArg === '-v') {
    await printVersion()
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
    printHelp()
    return 0
  }

  const fn = commandMap[command]

  if (typeof fn !== 'function') {
    process.stderr.write(`Unknown command: ${command}\n\n`)
    printHelp(process.stderr)
    return 1
  }

  const paramNames = getParamNames(fn)

  if (paramNames.length === 0 && fn.length > 0) {
    console.error(`Could not infer argument names for "${command}"`)
    return 1
  }

  const parsed = parseArgs({
    args: process.argv.slice(3),
    options: buildArgOptions(paramNames),
    allowPositionals: true,
    strict: false,
  })

  const remainingPositionals = [...parsed.positionals]

  const orderedArgs = paramNames.map((name) => {
    if (parsed.values[name] !== undefined) {
      return decodeArgs(parsed.values[name])
    }

    if (remainingPositionals.length > 0) {
      return decodeArgs(remainingPositionals.shift())
    }

    return undefined
  })

  const result = await fn(...orderedArgs)
  printCommandResult(result)
  return 0
}

try {
  process.exitCode = await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}

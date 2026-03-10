import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const cliPath = path.join(repoRoot, 'cli', 'index.js')

test('cli prints help and version', async () => {
  const help = runCli(['--help'])
  assert.equal(help.status, 0)
  assert.match(help.stdout, /nar <command> \[options\]/)
  assert.match(help.stdout, /nar <command> --help/)

  const commandHelp = runCli(['pack', '--help'])
  assert.equal(commandHelp.status, 0)
  assert.match(commandHelp.stdout, /nar pack <path> \[destinationPath\]/)
  assert.match(commandHelp.stdout, /--outFormat <value>/)

  const version = runCli(['--version'])
  assert.equal(version.status, 0)
  assert.equal(version.stdout.trim(), '0.0.0')
})

test('cli packs and unpacks archives with positionals and flags', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'nodearchive-cli-'))

  try {
    await mkdir(path.join(tempDir, 'input'), { recursive: true })
    await writeFile(path.join(tempDir, 'input', 'hello.txt'), 'hello cli')

    const packResult = runCli(
      ['pack', 'input', 'bundle.nar', '--passThru'],
      tempDir
    )
    assert.equal(packResult.status, 0)
    const packSummary = JSON.parse(packResult.stdout)
    assert.equal(packSummary.destinationPath, 'bundle.nar')

    const unpackResult = runCli(
      ['unpack', 'bundle.nar', 'output', '--force', '--passThru'],
      tempDir
    )
    assert.equal(unpackResult.status, 0)
    const unpackSummary = JSON.parse(unpackResult.stdout)
    assert.equal(unpackSummary.destinationPath, 'output')
    assert.equal(
      await readFile(
        path.join(tempDir, 'output', 'input', 'hello.txt'),
        'utf8'
      ),
      'hello cli'
    )

    const zipResult = runCli(
      ['pack', 'input', 'bundle.zip', '--outFormat', 'zip', '--passThru'],
      tempDir
    )
    assert.equal(zipResult.status, 0)
    const zipSummary = JSON.parse(zipResult.stdout)
    assert.equal(zipSummary.format, 'zip')

    const zipUnpackResult = runCli(
      ['unpack', 'bundle.zip', 'zip-output', '--force', '--passThru'],
      tempDir
    )
    assert.equal(zipUnpackResult.status, 0)
    assert.equal(
      await readFile(
        path.join(tempDir, 'zip-output', 'input', 'hello.txt'),
        'utf8'
      ),
      'hello cli'
    )

    const unknown = runCli(['missing', '--help'], tempDir)
    assert.equal(unknown.status, 1)
    assert.match(unknown.stderr, /Unknown command: missing/)

    const unexpected = runCli(['pack', 'input', 'bundle.nar', 'extra'], tempDir)
    assert.equal(unexpected.status, 1)
    assert.match(unexpected.stderr, /@nodearchive\/nodearchive/)
    assert.match(unexpected.stderr, /Unexpected positional arguments: extra/)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

function runCli(args, cwd = repoRoot) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    encoding: 'utf8',
  })
}

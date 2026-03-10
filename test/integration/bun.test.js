import assert from 'node:assert/strict'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

test('bun can import and execute the built package', () => {
  const version = spawnSync('bun', ['--version'], {
    encoding: 'utf8',
  })

  if (version.status !== 0) {
    return
  }

  const script = [
    "import { pack, unpack } from './dist/index.js';",
    "const archive = await pack({ blob: 'bun-smoke' });",
    'const restored = await unpack({ blob: archive });',
    "console.log(Buffer.from(restored).toString('utf8'));",
  ].join(' ')

  const result = spawnSync('bun', ['--eval', script], {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  assert.equal(result.status, 0)
  assert.equal(result.stdout.trim(), 'bun-smoke')

  const commonJsScript = [
    "const { pack, unpack } = require('.');",
    'await (async () => {',
    "const archive = await pack({ blob: 'bun-cjs-smoke' });",
    'const restored = await unpack({ blob: archive });',
    "console.log(Buffer.from(restored).toString('utf8'));",
    '})().catch((error) => {',
    'console.error(error);',
    'process.exit(1);',
    '});',
  ].join(' ')

  const commonJsResult = spawnSync('bun', ['--eval', commonJsScript], {
    cwd: repoRoot,
    encoding: 'utf8',
  })

  assert.equal(commonJsResult.status, 0)
  assert.equal(commonJsResult.stdout.trim(), 'bun-cjs-smoke')
})

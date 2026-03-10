import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const require = createRequire(import.meta.url)

test('commonjs consumers can require the package root', async () => {
  const { NodearchiveError, pack, unpack } = require(repoRoot)

  assert.equal(typeof pack, 'function')
  assert.equal(typeof unpack, 'function')

  const archive = await pack({ blob: 'commonjs-smoke' })
  const restored = await unpack({ blob: archive })

  assert.equal(Buffer.from(restored).toString('utf8'), 'commonjs-smoke')
  assert.equal(
    new NodearchiveError('ARCHIVE_INPUT_REQUIRED').code,
    'ARCHIVE_INPUT_REQUIRED'
  )
})

import { spawnSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const c8Path = fileURLToPath(
  new URL('../node_modules/c8/bin/c8.js', import.meta.url)
)
const tempDirectory = await mkdtemp(path.join(tmpdir(), 'nodearchive-c8-'))

await rm('coverage', { force: true, recursive: true })

try {
  const result = spawnSync(
    process.execPath,
    [
      c8Path,
      '--100',
      '--reporter=text',
      '--reporter=lcov',
      '--reporter=html',
      '--report-dir',
      'coverage',
      '--temp-directory',
      tempDirectory,
      process.execPath,
      '--test',
      'test/unit/*.test.js',
      'test/integration/*.test.js',
    ],
    {
      stdio: 'inherit',
    }
  )

  if (result.error) {
    throw result.error
  }

  process.exit(result.status ?? 1)
} finally {
  await rm(tempDirectory, { force: true, recursive: true })
}

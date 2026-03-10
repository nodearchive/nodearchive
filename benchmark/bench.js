import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { performance } from 'node:perf_hooks'
import { pack, unpack } from '../dist/index.js'

const numberFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'nodearchive-bench-'))

try {
  await mkdir(path.join(tempDir, 'fixture', 'nested'), { recursive: true })
  await mkdir(path.join(tempDir, 'fixture', 'empty'), { recursive: true })
  await writeFile(path.join(tempDir, 'fixture', 'nested', 'alpha.txt'), 'alpha')
  await writeFile(
    path.join(tempDir, 'fixture', 'nested', 'beta.json'),
    JSON.stringify({ ok: true, count: 3 })
  )
  await writeFile(path.join(tempDir, 'fixture', 'gamma.md'), '# nodearchive\n')

  const blobPayload = 'nodearchive benchmark payload'.repeat(32)
  const blobArchive = await pack({ blob: blobPayload })
  const fixtureArchive = await pack({
    literalPath: [path.join(tempDir, 'fixture')],
  })

  const rows = [
    await benchmark('pack blob', 400, () => pack({ blob: blobPayload })),
    await benchmark('unpack blob', 400, () => unpack({ blob: blobArchive })),
    await benchmark('pack directory', 120, () =>
      pack({ literalPath: [path.join(tempDir, 'fixture')] })
    ),
    await benchmark('unpack archive', 120, () =>
      unpack({ blob: fixtureArchive })
    ),
  ]

  console.log(`How it was run: node benchmark/bench.js`)
  console.log(
    `Environment: ${process.version} (${process.platform} ${process.arch})`
  )
  console.log('')
  console.log('| Benchmark | Result |')
  console.log('| --- | --- |')

  for (const row of rows) {
    console.log(
      `| ${row.name} | ${numberFormat.format(row.opsPerSecond)} ops/s (${numberFormat.format(row.duration)} ms) |`
    )
  }
} finally {
  await rm(tempDir, { force: true, recursive: true })
}

async function benchmark(name, iterations, run) {
  const startedAt = performance.now()

  for (let index = 0; index < iterations; index += 1) {
    await run()
  }

  const duration = performance.now() - startedAt
  return {
    duration,
    name,
    opsPerSecond: (iterations * 1000) / duration,
  }
}

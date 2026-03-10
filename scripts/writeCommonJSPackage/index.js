import fs from 'fs/promises'

await fs.mkdir('./dist-cjs', { recursive: true })
await fs.writeFile(
  './dist-cjs/package.json',
  `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`
)

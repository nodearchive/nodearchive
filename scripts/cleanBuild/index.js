import fs from 'fs/promises'

await fs.rm('./dist', { force: true, recursive: true })
await fs.rm('./dist-cjs', { force: true, recursive: true })

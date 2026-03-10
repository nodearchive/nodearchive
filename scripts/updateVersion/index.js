import fs from 'fs/promises'

const { version } = JSON.parse(await fs.readFile('./package.json'))
await fs.writeFile(
  './cli/version/index.js',
  `export const version = "${version}"\n`
)

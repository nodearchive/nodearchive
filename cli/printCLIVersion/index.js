import { version } from '../version/index.js'
export async function printVersion(stream = process.stdout) {
  stream.write(`${version}\n`)
}

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const host = '127.0.0.1'
const port = Number(process.env.NODEARCHIVE_E2E_PORT ?? 43173)

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
])

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', `http://${host}:${port}`)
    .pathname
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1)
  const target = path.resolve(repoRoot, relativePath)

  if (!target.startsWith(repoRoot)) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }

  try {
    const fileTarget =
      (await stat(target)).isDirectory() && pathname !== '/'
        ? path.join(target, 'index.html')
        : target
    const body = await readFile(fileTarget)
    const ext = path.extname(fileTarget)

    response.writeHead(200, {
      'Content-Type': contentTypes.get(ext) ?? 'application/octet-stream',
    })
    response.end(body)
  } catch {
    response.writeHead(404)
    response.end('Not found')
  }
})

server.listen(port, host, () => {
  process.stdout.write(`Listening on http://${host}:${port}\n`)
})

const shutdown = () => {
  server.close(() => {
    process.exit(0)
  })

  setTimeout(() => {
    process.exit(0)
  }, 1000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

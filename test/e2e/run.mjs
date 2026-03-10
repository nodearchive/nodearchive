import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const playwrightPath = fileURLToPath(
  new URL('../../node_modules/playwright/cli.js', import.meta.url)
)
const env = {
  ...process.env,
  NODEARCHIVE_E2E_PORT:
    process.env.NODEARCHIVE_E2E_PORT ??
    String(49152 + Math.floor(Math.random() * 1000)),
}

let exitStatus = 1
const server = await startServer()

try {
  const firstRun = spawnSync(process.execPath, [playwrightPath, 'test'], {
    encoding: 'utf8',
    env,
  })

  const combinedOutput = `${firstRun.stdout ?? ''}\n${firstRun.stderr ?? ''}`

  if (needsInstall(combinedOutput)) {
    process.stdout.write(combinedOutput)
    await stopServer(server)

    const install = spawnSync(
      process.execPath,
      [playwrightPath, 'install', 'chromium', 'firefox', 'webkit'],
      {
        env,
        stdio: 'inherit',
      }
    )

    if (install.error) {
      throw install.error
    }

    if (install.status !== 0) {
      exitStatus = install.status ?? 1
    } else {
      const restartedServer = await startServer()

      try {
        const rerun = spawnSync(process.execPath, [playwrightPath, 'test'], {
          env,
          stdio: 'inherit',
        })

        if (rerun.error) {
          throw rerun.error
        }

        exitStatus = rerun.status ?? 1
      } finally {
        await stopServer(restartedServer)
      }
    }
  } else {
    process.stdout.write(firstRun.stdout ?? '')
    process.stderr.write(firstRun.stderr ?? '')

    if (firstRun.error) {
      throw firstRun.error
    }

    exitStatus = firstRun.status ?? 1
  }
} finally {
  await stopServer(server)
}

process.exit(exitStatus)

function needsInstall(output) {
  return (
    output.includes("Executable doesn't exist") ||
    output.includes('Please run the following command to download new browsers')
  )
}

async function startServer() {
  const server = spawn(process.execPath, ['test/e2e/server.mjs'], {
    env,
    stdio: ['ignore', 'pipe', 'inherit'],
  })

  const ready = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timed out starting the E2E server.'))
    }, 10000)

    server.stdout.setEncoding('utf8')
    server.stdout.on('data', (chunk) => {
      process.stdout.write(chunk)

      if (chunk.includes('Listening on')) {
        clearTimeout(timeout)
        resolve(server)
      }
    })

    server.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })

    server.once('exit', (code) => {
      clearTimeout(timeout)
      reject(new Error(`E2E server exited before startup with code ${code}.`))
    })
  })

  return ready
}

async function stopServer(server) {
  if (server.exitCode !== null || server.killed) {
    return
  }

  server.kill('SIGTERM')

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (server.exitCode === null) {
        server.kill('SIGKILL')
      }
      resolve()
    }, 1000)

    server.once('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
  })
}

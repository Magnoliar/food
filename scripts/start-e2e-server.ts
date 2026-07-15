import {
  createE2EProcessEnv,
  prepareE2EDatabase,
  startE2EServer,
  stopE2EServer,
} from './e2e-runtime'

const env = createE2EProcessEnv()
prepareE2EDatabase(env)
const child = startE2EServer(env)
let shuttingDown = false

const shutdown = async (exitCode = 0) => {
  if (shuttingDown) return
  shuttingDown = true
  await stopE2EServer(child)
  process.exit(exitCode)
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGBREAK'] as const) {
  process.on(signal, () => { void shutdown() })
}

const parentPid = process.ppid
const parentWatch = setInterval(() => {
  try { process.kill(parentPid, 0) }
  catch { clearInterval(parentWatch); void shutdown() }
}, 1_000)
parentWatch.unref()

child.on('error', (error) => { console.error(error); void shutdown(1) })
child.on('exit', code => { if (!shuttingDown) process.exit(code || 0) })

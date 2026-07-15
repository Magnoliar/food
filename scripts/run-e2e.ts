import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import {
  createE2EProcessEnv,
  E2E_BASE_URL,
  E2E_ROOT,
  prepareE2EDatabase,
  startE2EServer,
  stopE2EServer,
  waitForE2EServer,
} from './e2e-runtime'

const playwrightCli = path.join(E2E_ROOT, 'node_modules', '@playwright', 'test', 'cli.js')
const env = { ...createE2EProcessEnv(), E2E_MANAGED_SERVER: '1', PLAYWRIGHT_BASE_URL: E2E_BASE_URL }

let exitCode = 1
let server: ChildProcess | undefined
try {
  prepareE2EDatabase(env)
  server = startE2EServer(env)
  await waitForE2EServer(server)

  const runner = spawn(process.execPath, [playwrightCli, 'test', ...process.argv.slice(2)], {
    cwd: E2E_ROOT,
    env,
    stdio: 'inherit',
  })
  exitCode = await new Promise<number>(resolve => {
    runner.once('error', () => resolve(1))
    runner.once('exit', code => resolve(code ?? 1))
  })
} finally {
  if (server) await stopE2EServer(server)
}

process.exitCode = exitCode

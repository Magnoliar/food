import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import Database from 'better-sqlite3'
import { E2E_ENV } from './e2e-env'

export const E2E_ROOT = process.cwd()
export const E2E_PORT = process.env.E2E_PORT || '3137'
export const E2E_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${E2E_PORT}`
const dbPath = path.join(E2E_ROOT, 'test-results', 'e2e.db')
const databaseUrl = 'file:./test-results/e2e.db'
const tsxCli = path.join(E2E_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const nuxtCli = path.join(E2E_ROOT, 'node_modules', '@nuxt', 'cli', 'bin', 'nuxi.mjs')

export const createE2EProcessEnv = (): NodeJS.ProcessEnv => ({
  ...process.env,
  DATABASE_URL: databaseUrl,
  ...E2E_ENV,
  NUXT_IGNORE_LOCK: '1',
})

export function prepareE2EDatabase(env: NodeJS.ProcessEnv) {
  mkdirSync(path.dirname(dbPath), { recursive: true })
  if (env.APP_SETTINGS_PATH) rmSync(path.resolve(E2E_ROOT, env.APP_SETTINGS_PATH), { force: true })
  for (const suffix of ['', '-journal', '-wal', '-shm']) rmSync(`${dbPath}${suffix}`, { force: true })

  const db = new Database(dbPath)
  try {
    const migrationsDir = path.join(E2E_ROOT, 'prisma', 'migrations')
    const migrations = readdirSync(migrationsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort()
    for (const migration of migrations) {
      db.exec(readFileSync(path.join(migrationsDir, migration, 'migration.sql'), 'utf8'))
    }
  } finally {
    db.close()
  }

  const seed = spawnSync(process.execPath, [tsxCli, 'prisma/seed.ts'], {
    cwd: E2E_ROOT,
    env,
    stdio: 'inherit',
  })
  if (seed.error) throw seed.error
  if (seed.status !== 0) throw new Error(`E2E seed failed with exit code ${seed.status ?? 'unknown'}`)
}

export function startE2EServer(env: NodeJS.ProcessEnv): ChildProcess {
  return spawn(process.execPath, [nuxtCli, 'dev', '--host', '127.0.0.1', '--port', E2E_PORT], {
    cwd: E2E_ROOT,
    env,
    stdio: 'inherit',
  })
}

export async function waitForE2EServer(child: ChildProcess, timeoutMs = 120_000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    if (child.exitCode !== null) throw new Error(`E2E server exited before becoming ready (${child.exitCode})`)
    try {
      const response = await fetch(`${E2E_BASE_URL}/api/health`)
      if (response.ok) return
    } catch {
      // Server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error(`E2E server did not become ready within ${timeoutMs}ms`)
}

export async function stopE2EServer(child: ChildProcess) {
  if (child.exitCode !== null || child.killed) return
  child.kill()
  await Promise.race([
    new Promise<void>(resolve => child.once('exit', () => resolve())),
    new Promise<void>(resolve => setTimeout(resolve, 3_000)),
  ])
  if (child.exitCode === null) child.kill('SIGKILL')
}

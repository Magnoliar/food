import { mkdirSync, rmSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import { readdirSync, readFileSync } from 'node:fs'
import Database from 'better-sqlite3'

const root = process.cwd()
const port = process.env.E2E_PORT || '3137'
const dbPath = path.join(root, 'test-results', 'e2e.db')
const databaseUrl = 'file:./test-results/e2e.db'

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })
  if (result.error) {
    console.error(result.error)
  }
  if (result.status !== 0) {
    process.exit(result.status || 1)
  }
}

mkdirSync(path.dirname(dbPath), { recursive: true })
for (const suffix of ['', '-journal', '-wal', '-shm']) {
  rmSync(`${dbPath}${suffix}`, { force: true })
}

const db = new Database(dbPath)
try {
  const migrationsDir = path.join(root, 'prisma', 'migrations')
  const migrations = readdirSync(migrationsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort()

  for (const migration of migrations) {
    const sql = readFileSync(path.join(migrationsDir, migration, 'migration.sql'), 'utf8')
    db.exec(sql)
  }
} finally {
  db.close()
}

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  AUTH_SECRET: process.env.AUTH_SECRET || 'e2e-local-auth-secret-at-least-32-chars',
  NUXT_IGNORE_LOCK: '1',
}

run('npx', ['tsx', 'prisma/seed.ts'], env)

const child = spawn('npx', ['nuxt', 'dev', '--host', '127.0.0.1', '--port', port], {
  cwd: root,
  env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => child.kill(signal))
}

child.on('exit', code => process.exit(code || 0))

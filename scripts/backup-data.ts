import { existsSync, mkdirSync, readdirSync, statSync, cpSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import 'dotenv/config'

const root = process.cwd()
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const out = path.join(root, 'backups', stamp)
mkdirSync(out, { recursive: true })

const configuredDb = process.env.DATABASE_URL?.replace(/^file:/, '').replace(/^"|"$/g, '')
const fallbackDb = existsSync(path.join(root, 'dev.db')) ? path.join(root, 'dev.db') : path.join(root, 'prisma', 'dev.db')
const db = configuredDb || fallbackDb
const resolvedDb = path.isAbsolute(db) ? db : path.resolve(root, db)
if (existsSync(resolvedDb)) {
  const sqlite = new Database(resolvedDb, { readonly: true, fileMustExist: true })
  try {
    await sqlite.backup(path.join(out, 'dev.db'))
  } finally {
    sqlite.close()
  }
}

for (const dir of ['public/uploads', 'uploads_backup', 'server/data']) {
  const source = path.join(root, dir)
  if (!existsSync(source)) continue
  if (statSync(source).isDirectory() && readdirSync(source).length) {
    cpSync(source, path.join(out, dir.replace(/[\\/]/g, '_')), { recursive: true })
  }
}

console.log(`backup written: ${out}`)

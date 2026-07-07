import Database from 'better-sqlite3'
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const backupsRoot = path.join(root, 'backups')

function fail(message: string): never {
  console.error(`backup verification failed: ${message}`)
  process.exit(1)
}

function latestBackup() {
  if (!existsSync(backupsRoot)) fail('backups directory does not exist')
  const entries = readdirSync(backupsRoot)
    .map(name => path.join(backupsRoot, name))
    .filter(fullPath => statSync(fullPath).isDirectory())
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  return entries[0]
}

const backupDir = process.argv[2] ? path.resolve(root, process.argv[2]) : latestBackup()
if (!backupDir || !existsSync(backupDir)) fail('backup directory not found')

const dbPath = path.join(backupDir, 'dev.db')
if (!existsSync(dbPath)) fail('dev.db not found in backup')

const db = new Database(dbPath, { readonly: true, fileMustExist: true })
try {
  const tables = db.prepare("select name from sqlite_master where type = 'table'").all() as Array<{ name: string }>
  const tableNames = new Set(tables.map(t => t.name))
  for (const table of ['Recipe', 'Ingredient', 'WeekPlan', 'MealSlot', 'User']) {
    if (!tableNames.has(table)) fail(`required table missing: ${table}`)
  }

  const recipeCount = db.prepare('select count(*) as count from Recipe').get() as { count: number }
  const ingredientCount = db.prepare('select count(*) as count from Ingredient').get() as { count: number }
  if (recipeCount.count <= 0) fail('Recipe table is empty')
  if (ingredientCount.count <= 0) fail('Ingredient table is empty')
} finally {
  db.close()
}

for (const optionalDir of ['public_uploads', 'uploads_backup', 'server_data']) {
  const fullPath = path.join(backupDir, optionalDir)
  if (existsSync(fullPath) && !statSync(fullPath).isDirectory()) {
    fail(`${optionalDir} exists but is not a directory`)
  }
}

console.log(`backup verified: ${backupDir}`)

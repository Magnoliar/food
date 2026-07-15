import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'

const root = process.cwd()
const backupsRoot = path.join(root, 'backups')
const drillRoot = path.join(root, '.restore-drill')

function fail(message: string): never {
  console.error(`restore drill failed: ${message}`)
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

function copyOptionalBackupDir(backupDir: string, backupName: string, restorePath: string) {
  const source = path.join(backupDir, backupName)
  if (!existsSync(source)) return false
  mkdirSync(path.dirname(restorePath), { recursive: true })
  cpSync(source, restorePath, { recursive: true })
  return true
}

function assertSafeCleanup(target: string) {
  const resolvedRoot = path.resolve(drillRoot)
  const resolvedTarget = path.resolve(target)
  const relative = path.relative(resolvedRoot, resolvedTarget)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    fail(`refusing to clean path outside restore drill directory: ${resolvedTarget}`)
  }
  if (!path.basename(resolvedTarget).startsWith('restore-')) {
    fail(`refusing to clean unexpected restore drill directory: ${resolvedTarget}`)
  }
}

const backupDir = process.argv[2] ? path.resolve(root, process.argv[2]) : latestBackup()
if (!backupDir || !existsSync(backupDir)) fail('backup directory not found')

const sourceDb = path.join(backupDir, 'dev.db')
if (!existsSync(sourceDb)) fail('dev.db not found in backup')
if (statSync(sourceDb).size <= 0) fail('backup dev.db is empty')

mkdirSync(drillRoot, { recursive: true })
const restoreRoot = mkdtempSync(path.join(drillRoot, 'restore-'))
const restoredDb = path.join(restoreRoot, 'dev.db')

try {
  cpSync(sourceDb, restoredDb)
  const restoredUploads = copyOptionalBackupDir(backupDir, 'public_uploads', path.join(restoreRoot, 'public', 'uploads'))
  const restoredLineArts = copyOptionalBackupDir(backupDir, 'public_line-arts', path.join(restoreRoot, 'public', 'line-arts'))
  const restoredOriginals = copyOptionalBackupDir(backupDir, 'uploads_backup', path.join(restoreRoot, 'uploads_backup'))
  const restoredServerData = copyOptionalBackupDir(backupDir, 'server_data', path.join(restoreRoot, 'server', 'data'))

  function verifyDatabase(requiredTables: string[]) {
    const db = new Database(restoredDb)
    try {
      const integrity = db.prepare('pragma integrity_check').get() as { integrity_check: string }
      if (integrity.integrity_check !== 'ok') fail(`SQLite integrity_check failed: ${integrity.integrity_check}`)

      const tables = db.prepare("select name from sqlite_master where type = 'table'").all() as Array<{ name: string }>
      const tableNames = new Set(tables.map(table => table.name))
      for (const table of requiredTables) {
        if (!tableNames.has(table)) fail(`required table missing after restore: ${table}`)
      }

      const recipeCount = db.prepare('select count(*) as count from Recipe').get() as { count: number }
      const ingredientCount = db.prepare('select count(*) as count from Ingredient').get() as { count: number }
      if (recipeCount.count <= 0) fail('Recipe table is empty after restore')
      if (ingredientCount.count <= 0) fail('Ingredient table is empty after restore')
    } finally {
      db.close()
    }
  }

  function verifyRestoredMediaFiles() {
    const db = new Database(restoredDb)
    try {
      const assets = db.prepare('select url, original_url as originalUrl from MediaAsset').all() as Array<{ url: string, originalUrl: string | null }>
      const cookLogs = db.prepare('select photos from CookLog').all() as Array<{ photos: string }>
      const urls = new Set<string>()
      const originals = new Set<string>()

      for (const asset of assets) {
        if (asset.url) urls.add(asset.url)
        if (asset.originalUrl) originals.add(asset.originalUrl)
      }

      for (const log of cookLogs) {
        try {
          const photos = JSON.parse(log.photos)
          if (Array.isArray(photos)) {
            for (const photo of photos) {
              if (typeof photo === 'string') urls.add(photo)
            }
          }
        } catch {
          // Ignore legacy malformed photo payloads; schema now writes JSON arrays.
        }
      }

      let checked = 0
      for (const url of urls) {
        if (!url.startsWith('/uploads/')) continue
        const target = path.resolve(restoreRoot, 'public', url.replace(/^\//, ''))
        if (!existsSync(target)) fail(`restored media file missing: ${url}`)
        checked += 1
      }

      for (const originalUrl of originals) {
        if (!originalUrl.startsWith('/uploads_backup/')) continue
        const relative = originalUrl.replace(/^\/uploads_backup\/?/, '')
        const target = path.resolve(restoreRoot, 'uploads_backup', relative)
        if (!existsSync(target)) fail(`restored original media file missing: ${originalUrl}`)
        checked += 1
      }

      return { mediaAssetCount: assets.length, checkedMediaFiles: checked }
    } finally {
      db.close()
    }
  }

  const coreTables = [
    'Recipe',
    'Ingredient',
    'WeekPlan',
    'MealSlot',
    'User',
  ]
  verifyDatabase(coreTables)

  const npmCommand = os.platform() === 'win32' ? 'npm.cmd' : 'npm'
  const migrate = spawnSync(npmCommand, ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: root,
    env: {
      ...process.env,
      DATABASE_URL: `file:${restoredDb.replace(/\\/g, '/')}`,
    },
    encoding: 'utf8',
    shell: os.platform() === 'win32',
  })

  if (migrate.status !== 0) {
    console.error(JSON.stringify({
      status: migrate.status,
      signal: migrate.signal,
      error: migrate.error?.message,
      stdout: migrate.stdout,
      stderr: migrate.stderr,
    }, null, 2))
    fail('prisma migrate deploy failed against restored database')
  }

  const migratedTables = [
    'Recipe',
    'Ingredient',
    'WeekPlan',
    'MealSlot',
    'User',
    'MediaAsset',
    'ShoppingList',
    'ShoppingListItem',
    'Achievement',
    'AchievementEvent',
    'LineArtJob',
  ]
  verifyDatabase(migratedTables)
  const mediaCheck = verifyRestoredMediaFiles()

  console.log(JSON.stringify({
    backupDir,
    restoreRoot,
    restoredDb: true,
    restoredUploads,
    restoredLineArts,
    restoredOriginals,
    restoredServerData,
    migrationDeploy: 'ok',
    ...mediaCheck,
  }, null, 2))
} finally {
  if (process.env.KEEP_RESTORE_DRILL !== 'true') {
    assertSafeCleanup(restoreRoot)
    rmSync(restoreRoot, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 })
  }
}

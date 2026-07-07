import { existsSync, readFileSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import Database from 'better-sqlite3'

const root = process.cwd()
const dataRoot = path.join(root, 'docker-data')
const dbPath = path.join(dataRoot, 'data', 'dev.db')
const manifestPath = path.join(dataRoot, 'manifest.json')

function fail(message: string): never {
  console.error(`docker smoke failed: ${message}`)
  process.exit(1)
}

function run(command: string, args: string[], options: { allowFail?: boolean } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
    shell: false,
  })
  if (result.status !== 0 && !options.allowFail) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n')
    fail(`${command} ${args.join(' ')} failed\n${output}`)
  }
  return result
}

function hasDocker() {
  const docker = run('docker', ['--version'], { allowFail: true })
  if (docker.status !== 0) return false
  const compose = run('docker', ['compose', 'version'], { allowFail: true })
  return compose.status === 0
}

function verifyExportedData() {
  if (!existsSync(dataRoot)) fail('docker-data directory does not exist; run npm.cmd run export:docker-data first')
  if (!existsSync(dbPath)) fail('docker-data/data/dev.db is missing')
  if (statSync(dbPath).size <= 0) fail('docker-data/data/dev.db is empty')
  if (!existsSync(manifestPath)) fail('docker-data/manifest.json is missing; run npm.cmd run export:docker-data again')

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    database?: { counts?: Record<string, number | null> }
    directories?: Record<string, { files?: number }>
    media?: {
      references?: { publicUploads?: number, originals?: number }
      missing?: { missingPublicUploads?: string[], missingOriginals?: string[] }
    }
  }
  if (!manifest.database?.counts) fail('docker-data/manifest.json does not include database counts')
  if (manifest.media?.missing?.missingPublicUploads?.length || manifest.media?.missing?.missingOriginals?.length) {
    fail('docker-data/manifest.json reports missing media files')
  }

  for (const dir of [
    path.join(dataRoot, 'public', 'uploads'),
    path.join(dataRoot, 'uploads_backup'),
    path.join(dataRoot, 'server', 'data'),
  ]) {
    if (!existsSync(dir)) fail(`${path.relative(root, dir)} is missing`)
  }

  const db = new Database(dbPath, { readonly: true, fileMustExist: true })
  try {
    const tables = db.prepare("select name from sqlite_master where type = 'table'").all() as Array<{ name: string }>
    const tableNames = new Set(tables.map(t => t.name))
    for (const table of ['Recipe', 'Ingredient', 'WeekPlan', 'MealSlot', 'ShoppingList', 'ShoppingListItem', 'CookLog', 'MediaAsset']) {
      if (!tableNames.has(table)) fail(`required table missing in docker data: ${table}`)
    }
    for (const [table, expectedCount] of Object.entries(manifest.database.counts)) {
      if (expectedCount === null) continue
      if (!tableNames.has(table)) fail(`manifest includes missing table: ${table}`)
      const actual = db.prepare(`select count(*) as count from "${table}"`).get() as { count: number }
      if (actual.count !== expectedCount) fail(`manifest ${table} count does not match exported database`)
    }
    const recipeCount = db.prepare('select count(*) as count from Recipe').get() as { count: number }
    const ingredientCount = db.prepare('select count(*) as count from Ingredient').get() as { count: number }
    if (recipeCount.count <= 0) fail('docker data Recipe table is empty')
    if (ingredientCount.count <= 0) fail('docker data Ingredient table is empty')

    const publicUploadRefs = new Set<string>()
    const originalRefs = new Set<string>()
    const recipeRows = db.prepare("select cover_photo_url as coverPhotoUrl from Recipe where cover_photo_url is not null and cover_photo_url != ''").all() as Array<{ coverPhotoUrl: string }>
    for (const row of recipeRows) {
      if (row.coverPhotoUrl.startsWith('/uploads/')) publicUploadRefs.add(row.coverPhotoUrl)
    }
    const cookRows = db.prepare("select photos from CookLog where photos is not null and photos != ''").all() as Array<{ photos: string }>
    for (const row of cookRows) {
      try {
        const photos = JSON.parse(row.photos)
        if (Array.isArray(photos)) {
          for (const photo of photos) {
            if (typeof photo === 'string' && photo.startsWith('/uploads/')) publicUploadRefs.add(photo)
          }
        }
      } catch {}
    }
    const mediaRows = db.prepare("select url, original_url as originalUrl from MediaAsset").all() as Array<{ url: string, originalUrl: string | null }>
    for (const row of mediaRows) {
      if (row.url?.startsWith('/uploads/')) publicUploadRefs.add(row.url)
      if (row.originalUrl?.startsWith('/uploads_backup/')) originalRefs.add(row.originalUrl)
    }
    if ((manifest.media?.references?.publicUploads || 0) !== publicUploadRefs.size) fail('manifest public upload reference count does not match exported database')
    if ((manifest.media?.references?.originals || 0) !== originalRefs.size) fail('manifest original upload reference count does not match exported database')
    for (const url of publicUploadRefs) {
      if (!existsSync(path.join(dataRoot, 'public', url.replace(/^\//, '')))) fail(`referenced uploaded file is missing: ${url}`)
    }
    for (const url of originalRefs) {
      if (!existsSync(path.join(dataRoot, url.replace(/^\//, '')))) fail(`referenced original file is missing: ${url}`)
    }
  } finally {
    db.close()
  }
}

async function waitForHealth() {
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch('http://127.0.0.1:41833/api/health')
      if (response.ok) return
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  fail('health check did not become ready at http://127.0.0.1:41833/api/health')
}

verifyExportedData()

if (!hasDocker()) {
  console.log('docker data verified; Docker CLI is not available on this machine, skipping compose runtime smoke')
  process.exit(0)
}

const projectName = `zhuzhu-kitchen-smoke-${Date.now()}`
try {
  run('docker', ['compose', '-f', 'docker-compose.smoke.yml', '-p', projectName, 'up', '-d', '--build'])
  await waitForHealth()
  console.log('docker compose smoke passed')
} finally {
  run('docker', ['compose', '-f', 'docker-compose.smoke.yml', '-p', projectName, 'down'], { allowFail: true })
}

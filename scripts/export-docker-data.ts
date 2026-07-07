import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import 'dotenv/config'

const root = process.cwd()
const out = path.join(root, 'docker-data')

function databasePath() {
  const configured = process.env.DATABASE_URL?.replace(/^file:/, '').replace(/^"|"$/g, '')
  const fallback = existsSync(path.join(root, 'dev.db')) ? path.join(root, 'dev.db') : path.join(root, 'prisma', 'dev.db')
  if (configured) {
    const resolved = path.isAbsolute(configured) ? configured : path.resolve(root, configured)
    if (existsSync(resolved)) return resolved
    console.warn(`configured DATABASE_URL database does not exist, falling back to ${fallback}: ${resolved}`)
  }
  return path.resolve(root, fallback)
}

function copyDir(source: string, target: string) {
  const fullSource = path.join(root, source)
  mkdirSync(target, { recursive: true })
  if (!existsSync(fullSource)) return { copied: false, files: 0 }
  mkdirSync(path.dirname(target), { recursive: true })
  cpSync(fullSource, target, { recursive: true })
  return { copied: true, files: countFiles(target) }
}

function countFiles(target: string): number {
  if (!existsSync(target)) return 0
  const stat = statSync(target)
  if (!stat.isDirectory()) return 1
  return readdirSync(target).reduce((total, name) => total + countFiles(path.join(target, name)), 0)
}

function tableCount(db: Database.Database, table: string) {
  const exists = db.prepare("select name from sqlite_master where type = 'table' and name = ?").get(table)
  if (!exists) return null
  return (db.prepare(`select count(*) as count from "${table}"`).get() as { count: number }).count
}

function userTables(db: Database.Database) {
  return (db.prepare("select name from sqlite_master where type = 'table' order by name").all() as Array<{ name: string }>)
    .map(row => row.name)
    .filter(name => !name.startsWith('sqlite_') && name !== '_prisma_migrations')
}

function allTableCounts(db: Database.Database) {
  return Object.fromEntries(userTables(db).map(table => [table, tableCount(db, table)]))
}

function parseJsonArray(value: string | null | undefined) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : []
  } catch {
    return []
  }
}

function collectMediaReferences(db: Database.Database) {
  const publicUploads = new Set<string>()
  const originals = new Set<string>()

  const recipeRows = db.prepare("select cover_photo_url as coverPhotoUrl from Recipe where cover_photo_url is not null and cover_photo_url != ''").all() as Array<{ coverPhotoUrl: string }>
  for (const row of recipeRows) {
    if (row.coverPhotoUrl.startsWith('/uploads/')) publicUploads.add(row.coverPhotoUrl)
  }

  const cookRows = db.prepare("select photos from CookLog where photos is not null and photos != ''").all() as Array<{ photos: string }>
  for (const row of cookRows) {
    for (const photo of parseJsonArray(row.photos)) {
      if (photo.startsWith('/uploads/')) publicUploads.add(photo)
    }
  }

  const mediaRows = db.prepare("select url, original_url as originalUrl from MediaAsset").all() as Array<{ url: string, originalUrl: string | null }>
  for (const row of mediaRows) {
    if (row.url?.startsWith('/uploads/')) publicUploads.add(row.url)
    if (row.originalUrl?.startsWith('/uploads_backup/')) originals.add(row.originalUrl)
  }

  return {
    publicUploads: Array.from(publicUploads).sort(),
    originals: Array.from(originals).sort(),
  }
}

function missingMediaReferences(references: { publicUploads: string[], originals: string[] }, base = root) {
  const missingPublicUploads = references.publicUploads.filter(url => !existsSync(path.join(base, 'public', url.replace(/^\//, ''))))
  const missingOriginals = references.originals.filter(url => !existsSync(path.join(base, url.replace(/^\//, ''))))
  return { missingPublicUploads, missingOriginals }
}

if (existsSync(out)) rmSync(out, { recursive: true, force: true })
mkdirSync(path.join(out, 'data'), { recursive: true })

const sourceDb = databasePath()
if (!existsSync(sourceDb)) {
  console.error(`database not found: ${sourceDb}`)
  process.exit(1)
}

const db = new Database(sourceDb, { readonly: true, fileMustExist: true })
let counts: Record<string, number | null> = {}
let mediaReferences = { publicUploads: [] as string[], originals: [] as string[] }
try {
  await db.backup(path.join(out, 'data', 'dev.db'))
  counts = allTableCounts(db)
  mediaReferences = collectMediaReferences(db)
} finally {
  db.close()
}

const directories = {
  publicUploads: copyDir('public/uploads', path.join(out, 'public', 'uploads')),
  uploadsBackup: copyDir('uploads_backup', path.join(out, 'uploads_backup')),
  serverData: copyDir('server/data', path.join(out, 'server', 'data')),
}

const missingMedia = missingMediaReferences(mediaReferences, out)
if (missingMedia.missingPublicUploads.length || missingMedia.missingOriginals.length) {
  console.error(JSON.stringify({ missingMedia }, null, 2))
  process.exit(1)
}

writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({
  app: '猪猪家的厨房',
  exportedAt: new Date().toISOString(),
  database: {
    source: sourceDb,
    target: path.join(out, 'data', 'dev.db'),
    counts,
  },
  directories,
  media: {
    references: {
      publicUploads: mediaReferences.publicUploads.length,
      originals: mediaReferences.originals.length,
    },
    missing: missingMedia,
  },
}, null, 2))

console.log(`docker data exported: ${out}`)

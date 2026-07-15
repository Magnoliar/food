import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import Database from 'better-sqlite3'
import sharp from 'sharp'

const root = process.cwd()
const exportedDataRoot = path.join(root, 'docker-data')
const composeFile = 'docker-compose.smoke.yml'
const smokePort = Number(process.env.DOCKER_SMOKE_PORT || 41833)
const smokeAdminUser = 'docker-smoke-admin'
const smokeAdminPassword = 'docker-smoke-admin-password'

type Manifest = {
  database?: { counts?: Record<string, number | null> }
  directories?: Record<string, { files?: number }>
  media?: {
    references?: { publicUploads?: number, originals?: number }
    missing?: { missingPublicUploads?: string[], missingOriginals?: string[] }
  }
}

type HealthPayload = {
  status?: string
  checks?: Record<string, string>
}

function fail(message: string): never {
  throw new Error(`docker smoke failed: ${message}`)
}

function run(command: string, args: string[], options: { allowFail?: boolean, env?: NodeJS.ProcessEnv } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
    shell: false,
    env: options.env || process.env,
  })
  if (result.status !== 0 && !options.allowFail) {
    const output = [result.stdout, result.stderr, result.error?.message].filter(Boolean).join('\n')
    fail(`${command} ${args.join(' ')} failed
${output}`)
  }
  return result
}

function hasDocker() {
  if (run('docker', ['--version'], { allowFail: true }).status !== 0) return false
  return run('docker', ['compose', 'version'], { allowFail: true }).status === 0
}

function countFiles(target: string): number {
  if (!existsSync(target)) return 0
  if (!statSync(target).isDirectory()) return 1
  return readdirSync(target).reduce((total, name) => total + countFiles(path.join(target, name)), 0)
}

function parseJsonArray(value: string | null | undefined) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function verifyExportedData(dataRoot = exportedDataRoot) {
  const dbPath = path.join(dataRoot, 'data', 'dev.db')
  const manifestPath = path.join(dataRoot, 'manifest.json')
  if (!existsSync(dataRoot)) fail('docker-data directory does not exist; run npm run export:docker-data first')
  if (!existsSync(dbPath) || statSync(dbPath).size <= 0) fail('docker-data/data/dev.db is missing or empty')
  if (!existsSync(manifestPath)) fail('docker-data/manifest.json is missing; run npm run export:docker-data again')

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
  if (manifest.media?.missing?.missingPublicUploads?.length || manifest.media?.missing?.missingOriginals?.length) {
    fail('manifest contains missing media references')
  }

  const db = new Database(dbPath, { readonly: true, fileMustExist: true })
  try {
    const tables = (db.prepare("select name from sqlite_master where type = 'table' order by name").all() as Array<{ name: string }>)
      .map(row => row.name)
      .filter(name => !name.startsWith('sqlite_') && name !== '_prisma_migrations')
    for (const table of tables) {
      const actual = (db.prepare(`select count(*) as count from "${table}"`).get() as { count: number }).count
      const expected = manifest.database?.counts?.[table]
      if (expected !== actual) fail(`manifest count mismatch for ${table}: expected ${expected}, got ${actual}`)
    }

    const publicUploadRefs = new Set<string>()
    const originalRefs = new Set<string>()
    const recipes = db.prepare("select cover_photo_url as url from Recipe where cover_photo_url is not null and cover_photo_url != ''").all() as Array<{ url: string }>
    for (const row of recipes) if (row.url.startsWith('/uploads/')) publicUploadRefs.add(row.url)
    const logs = db.prepare("select photos from CookLog where photos is not null and photos != ''").all() as Array<{ photos: string }>
    for (const row of logs) for (const url of parseJsonArray(row.photos)) if (url.startsWith('/uploads/')) publicUploadRefs.add(url)
    const assets = db.prepare('select url, original_url as originalUrl from MediaAsset').all() as Array<{ url: string, originalUrl: string | null }>
    for (const row of assets) {
      if (row.url?.startsWith('/uploads/')) publicUploadRefs.add(row.url)
      if (row.originalUrl?.startsWith('/uploads_backup/')) originalRefs.add(row.originalUrl)
    }

    if ((manifest.media?.references?.publicUploads || 0) !== publicUploadRefs.size) fail('manifest public upload reference count does not match the database')
    if ((manifest.media?.references?.originals || 0) !== originalRefs.size) fail('manifest original reference count does not match the database')
    for (const url of publicUploadRefs) {
      if (!existsSync(path.join(dataRoot, 'public', url.replace(/^\//, '')))) fail(`referenced upload is missing: ${url}`)
    }
    for (const url of originalRefs) {
      if (!existsSync(path.join(dataRoot, url.replace(/^\//, '')))) fail(`referenced original is missing: ${url}`)
    }
  } finally {
    db.close()
  }

  for (const relative of ['public/uploads', 'public/line-arts', 'uploads_backup', 'server/data']) {
    const directory = path.join(dataRoot, relative)
    if (!existsSync(directory) || !statSync(directory).isDirectory()) fail(`exported directory is missing: ${relative}`)
  }

  const expectedLineArts = manifest.directories?.lineArts?.files
  if (typeof expectedLineArts === 'number' && countFiles(path.join(dataRoot, 'public', 'line-arts')) !== expectedLineArts) {
    fail('manifest line-art file count does not match exported data')
  }
}

function verifyDeploymentContract() {
  const dockerfile = readFileSync(path.join(root, 'Dockerfile'), 'utf8')
  const compose = readFileSync(path.join(root, 'docker-compose.yml'), 'utf8')
  const smokeCompose = readFileSync(path.join(root, composeFile), 'utf8')
  const entrypoint = readFileSync(path.join(root, 'docker-entrypoint.sh'), 'utf8')
  for (const required of ['HEALTHCHECK', 'NITRO_HOST=0.0.0.0', 'APP_UPLOADS_PATH', 'APP_LINE_ARTS_PATH']) {
    if (!dockerfile.includes(required)) fail(`Dockerfile is missing ${required}`)
  }
  for (const required of ['APP_UPLOADS_PATH', 'APP_SETTINGS_PATH', 'no-new-privileges:true', 'cap_drop:', 'init: true']) {
    if (!compose.includes(required)) fail(`docker-compose.yml is missing ${required}`)
  }
  if (/env_files*:/.test(smokeCompose)) fail('smoke compose must not load the local .env file')
  if (!smokeCompose.includes('DOCKER_SMOKE_DATA_ROOT')) fail('smoke compose must use an isolated data root')
  if (!entrypoint.includes('./node_modules/.bin/prisma migrate deploy')) fail('entrypoint must use the bundled Prisma CLI')
}

async function waitForHealth(baseUrl: string, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs
  let latest = ''
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, { headers: { Accept: 'application/json' } })
      latest = await response.text()
      if (response.ok) {
        const payload = JSON.parse(latest) as HealthPayload
        if (payload.status === 'ok' && payload.checks && Object.values(payload.checks).every(value => value === 'ok')) return payload
      }
    } catch (error) {
      latest = error instanceof Error ? error.message : String(error)
    }
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  fail(`health check did not become ready at ${baseUrl}/api/health; latest response: ${latest}`)
}

async function login(baseUrl: string) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: smokeAdminUser, password: smokeAdminPassword }),
  })
  if (!response.ok) fail(`smoke login failed: ${response.status} ${await response.text()}`)
  const setCookie = response.headers.get('set-cookie')
  if (!setCookie) fail('smoke login did not return an auth cookie')
  const cookie = setCookie.split(';', 1)[0]
  if (!cookie) fail('smoke login returned an invalid auth cookie')
  return cookie
}

async function uploadImage(baseUrl: string, cookie: string) {
  const png = await sharp({
    create: { width: 2, height: 2, channels: 4, background: { r: 192, g: 96, b: 48, alpha: 1 } },
  }).png().toBuffer()
  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'docker-smoke.png')
  form.append('kind', 'docker-smoke')
  const response = await fetch(`${baseUrl}/api/media/upload`, { method: 'POST', headers: { Cookie: cookie }, body: form })
  if (!response.ok) fail(`image upload failed: ${response.status} ${await response.text()}`)
  return await response.json() as { id: string, url: string, originalUrl?: string | null }
}

async function assertImage(baseUrl: string, url: string) {
  const response = await fetch(`${baseUrl}${url}`)
  if (!response.ok) fail(`uploaded image is unavailable: ${response.status} ${url}`)
  if (response.headers.get('content-type') !== 'image/jpeg') fail('uploaded image did not return image/jpeg')
  if ((await response.arrayBuffer()).byteLength <= 0) fail('uploaded image response is empty')
}

async function readSettings(baseUrl: string, cookie: string) {
  const response = await fetch(`${baseUrl}/api/admin/settings`, { headers: { Cookie: cookie } })
  if (!response.ok) fail(`settings read failed: ${response.status} ${await response.text()}`)
  return await response.json() as { xyq?: { baseUrl?: string } }
}

async function main() {
  verifyExportedData()
  verifyDeploymentContract()

  if (!hasDocker()) {
    console.log('docker data and deployment contract verified; Docker CLI is unavailable, so Compose runtime smoke was skipped')
    return
  }

  const projectName = `zhuzhu-kitchen-smoke-${Date.now()}`
  const smokeRoot = path.join(root, 'test-results', projectName)
  const baseUrl = `http://127.0.0.1:${smokePort}`
  cpSync(exportedDataRoot, smokeRoot, { recursive: true })
  for (const relative of ['data', 'public/uploads', 'public/line-arts', 'uploads_backup', 'server/data']) {
    mkdirSync(path.join(smokeRoot, relative), { recursive: true })
  }

  const composeEnv: NodeJS.ProcessEnv = {
    ...process.env,
    DOCKER_SMOKE_DATA_ROOT: path.resolve(smokeRoot).replace(/\\/g, '/'),
    DOCKER_SMOKE_PORT: String(smokePort),
    PUID: typeof process.getuid === 'function' ? String(process.getuid()) : '1001',
    PGID: typeof process.getgid === 'function' ? String(process.getgid()) : '1001',
  }
  const composeArgs = ['compose', '-f', composeFile, '-p', projectName]
  const compose = (args: string[], allowFail = false) => run('docker', [...composeArgs, ...args], { allowFail, env: composeEnv })

  try {
    compose(['config', '--quiet'])
    compose(['up', '-d', '--build'])
    await waitForHealth(baseUrl)

    const cookie = await login(baseUrl)
    const asset = await uploadImage(baseUrl, cookie)
    await assertImage(baseUrl, asset.url)
    const hostUpload = path.join(smokeRoot, 'public', 'uploads', asset.url.replace(/^\/uploads\//, ''))
    if (!existsSync(hostUpload) || statSync(hostUpload).size <= 0) fail('uploaded image was not persisted to the host smoke directory')

    const marker = `https://docker-smoke.invalid/${Date.now()}`
    const saveResponse = await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ xyq: { baseUrl: marker } }),
    })
    if (!saveResponse.ok) fail(`settings save failed: ${saveResponse.status} ${await saveResponse.text()}`)
    if ((await readSettings(baseUrl, cookie)).xyq?.baseUrl !== marker) fail('settings marker was not saved')

    compose(['restart', 'app'])
    await waitForHealth(baseUrl)
    await assertImage(baseUrl, asset.url)
    if ((await readSettings(baseUrl, cookie)).xyq?.baseUrl !== marker) fail('settings marker did not survive a container restart')

    const deleteResponse = await fetch(`${baseUrl}/api/media/delete`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: asset.id }),
    })
    if (!deleteResponse.ok) fail(`media cleanup failed: ${deleteResponse.status} ${await deleteResponse.text()}`)
    if (existsSync(hostUpload)) fail('deleted image still exists in the host smoke directory')

    console.log('docker compose smoke passed: health, login, upload serving, settings persistence, restart, and cleanup')
  } catch (error) {
    const logs = compose(['logs', '--tail=200', 'app'], true)
    if (logs.stdout) console.error(logs.stdout)
    if (logs.stderr) console.error(logs.stderr)
    throw error
  } finally {
    compose(['down', '--remove-orphans'], true)
    rmSync(smokeRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

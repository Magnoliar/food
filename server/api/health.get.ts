import { access, mkdir, unlink, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { prisma } from '../utils/prisma'
import { getRuntimePaths } from '../utils/runtime-paths'
import { assertProductionAuthConfig } from '../utils/auth'

type CheckStatus = 'ok' | 'error'

async function assertWritableDirectory(directory: string) {
  await mkdir(directory, { recursive: true })
  await access(directory, constants.W_OK)
  const probe = path.join(directory, `.health-${process.pid}-${Date.now()}`)
  await writeFile(probe, '')
  await unlink(probe)
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')

  const checks: Record<string, CheckStatus> = {
    auth: 'error',
    database: 'error',
    uploads: 'error',
    originals: 'error',
    lineArts: 'error',
    settings: 'error',
  }

  try {
    assertProductionAuthConfig()
    checks.auth = 'ok'
  } catch {}

  try {
    await prisma.$queryRawUnsafe('SELECT 1')
    checks.database = 'ok'
  } catch {}

  const runtimePaths = getRuntimePaths()
  const storageChecks: Array<[keyof typeof checks, string]> = [
    ['uploads', runtimePaths.publicUploadsDir],
    ['originals', runtimePaths.uploadsBackupDir],
    ['lineArts', runtimePaths.lineArtsDir],
    ['settings', path.dirname(runtimePaths.settingsFile)],
  ]
  for (const [name, directory] of storageChecks) {
    try {
      await assertWritableDirectory(directory)
      checks[name] = 'ok'
    } catch {}
  }

  const healthy = Object.values(checks).every(status => status === 'ok')
  if (!healthy) setResponseStatus(event, 503, 'Service Unavailable')

  return {
    status: healthy ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    timezone: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    checks,
  }
})

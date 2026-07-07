import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { prisma } from './prisma'
import { xyqPollResult } from './xyq-client'

const HISTORY_PATH = resolve(process.cwd(), 'server/data/line-art-history.json')
const POLLING_TIMEOUT_MS = 10 * 60 * 1000

export type LineArtJobStatus = 'pending' | 'polling' | 'done' | 'failed'

export interface LineArtJobDTO {
  id: string
  ingredientName: string
  ingredientId?: string
  status: LineArtJobStatus
  imageUrls: string[]
  selectedUrl?: string | null
  error?: string | null
  threadId?: string | null
  runId?: string | null
  createdAt: number
  updatedAt: number
}

type DbLineArtJob = {
  id: string
  ingredientName: string
  ingredientId: string | null
  status: string
  imageUrls: string
  selectedUrl: string | null
  error: string | null
  threadId: string | null
  runId: string | null
  createdAt: Date
  updatedAt: Date
}

function parseImageUrls(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return [value]
  }
}

const RUNNING_STATUSES = ['pending', 'polling']

function normalizeStatus(job: DbLineArtJob): LineArtJobStatus {
  if (RUNNING_STATUSES.includes(job.status) && Date.now() - job.updatedAt.getTime() > POLLING_TIMEOUT_MS) {
    return 'failed'
  }
  if (job.status === 'pending' || job.status === 'polling' || job.status === 'done' || job.status === 'failed') {
    return job.status
  }
  return 'failed'
}

function toDTO(job: DbLineArtJob): LineArtJobDTO {
  const status = normalizeStatus(job)
  return {
    id: job.id,
    ingredientName: job.ingredientName,
    ingredientId: job.ingredientId || undefined,
    status,
    imageUrls: parseImageUrls(job.imageUrls),
    selectedUrl: job.selectedUrl,
    error: status === 'failed' && job.status === 'polling'
      ? job.error || '线稿生成任务已超时，请重新提交'
      : job.error,
    threadId: job.threadId,
    runId: job.runId,
    createdAt: job.createdAt.getTime(),
    updatedAt: job.updatedAt.getTime(),
  }
}

export async function markStaleRunningJobs() {
  const staleBefore = new Date(Date.now() - POLLING_TIMEOUT_MS)
  await prisma.lineArtJob.updateMany({
    where: {
      status: { in: RUNNING_STATUSES },
      updatedAt: { lt: staleBefore },
    },
    data: {
      status: 'failed',
      error: '线稿生成任务已超时，请重新提交',
    },
  })
}

export async function createJob(ingredientName: string, ingredientId?: string): Promise<LineArtJobDTO> {
  const id = `la-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const job = await prisma.lineArtJob.create({
    data: {
      id,
      ingredientName,
      ingredientId: ingredientId || null,
      status: 'pending',
      imageUrls: '[]',
    },
  })
  return toDTO(job)
}

export async function getJob(id: string): Promise<LineArtJobDTO | undefined> {
  await markStaleRunningJobs()
  const job = await prisma.lineArtJob.findUnique({ where: { id } })
  return job ? toDTO(job) : undefined
}

export async function getAllJobs(): Promise<LineArtJobDTO[]> {
  await markStaleRunningJobs()
  const jobs = await prisma.lineArtJob.findMany({ orderBy: { createdAt: 'desc' } })
  return jobs.map(toDTO)
}

export async function getLatestJobsByIngredientIds(ingredientIds: string[]): Promise<LineArtJobDTO[]> {
  const uniqueIds = [...new Set(ingredientIds.filter(Boolean))]
  if (!uniqueIds.length) return []

  await markStaleRunningJobs()
  const jobs = await prisma.lineArtJob.findMany({
    where: { ingredientId: { in: uniqueIds } },
    orderBy: { updatedAt: 'desc' },
  })

  const latestByIngredient = new Map<string, LineArtJobDTO>()
  for (const job of jobs) {
    if (!job.ingredientId || latestByIngredient.has(job.ingredientId)) continue
    latestByIngredient.set(job.ingredientId, toDTO(job))
  }

  return [...latestByIngredient.values()]
}

export async function findJobByIngredientId(ingredientId: string | undefined): Promise<LineArtJobDTO | undefined> {
  if (!ingredientId) return undefined
  await markStaleRunningJobs()
  const job = await prisma.lineArtJob.findFirst({
    where: {
      ingredientId,
      status: { in: ['pending', 'polling'] },
    },
    orderBy: { createdAt: 'desc' },
  })
  return job ? toDTO(job) : undefined
}

export async function updateJob(id: string, update: Partial<LineArtJobDTO>) {
  const data: Record<string, unknown> = {}
  if (update.status) data.status = update.status
  if (update.imageUrls) data.imageUrls = JSON.stringify(update.imageUrls)
  if (update.selectedUrl !== undefined) data.selectedUrl = update.selectedUrl
  if (update.error !== undefined) data.error = update.error
  if (update.threadId !== undefined) data.threadId = update.threadId
  if (update.runId !== undefined) data.runId = update.runId

  await prisma.lineArtJob.update({
    where: { id },
    data,
  })
}

// Background poller - starts after submit, runs independently
export async function startPolling(jobId: string, threadId: string, runId: string) {
  const job = await getJob(jobId)
  if (!job) return

  await updateJob(jobId, { status: 'polling', threadId, runId })

  try {
    const result = await xyqPollResult(threadId, runId, 120000)

    if (result.success && result.urls?.length) {
      const remoteUrls = result.urls
      const localPaths: string[] = []

      // Download each image and save locally
      for (let i = 0; i < remoteUrls.length; i++) {
        const remoteUrl = remoteUrls[i]
        if (!remoteUrl) continue
        try {
          const safeName = job.ingredientName.replace(/[^a-zA-Z0-9一-鿿]/g, '_')
          const shortId = job.id.slice(0, 8)
          const filename = `${safeName}_${shortId}_${i + 1}.jpg`
          mkdirSync(resolve(process.cwd(), 'public/line-arts'), { recursive: true })
          const localPath = resolve(process.cwd(), 'public/line-arts', filename)
          const webPath = `/line-arts/${filename}`

          const resp = await fetch(remoteUrl)
          if (resp.ok) {
            const buffer = Buffer.from(await resp.arrayBuffer())
            writeFileSync(localPath, buffer)
            localPaths.push(webPath)
          } else {
            // Fallback: save remote URL
            localPaths.push(remoteUrl)
          }
        } catch {
          localPaths.push(remoteUrl)
        }
      }

      // Save to database
      if (job.ingredientId) {
        try {
          await prisma.ingredient.update({
            where: { id: job.ingredientId },
            data: { lineArtUrl: JSON.stringify(localPaths) },
          })
        } catch (e) {
          console.warn('Failed to save lineArtUrl to DB:', e)
        }
      }

      await updateJob(jobId, { status: 'done', imageUrls: localPaths, selectedUrl: localPaths[0], error: null })

      // Persist to history log
      appendHistory({
        ingredientName: job.ingredientName,
        ingredientId: job.ingredientId,
        imageUrls: localPaths,
        timestamp: new Date().toISOString(),
      })
    } else {
      await updateJob(jobId, { status: 'failed', error: result.error || 'No image generated' })
    }
  } catch (err: any) {
    await updateJob(jobId, { status: 'failed', error: err.message })
  }
}

// Persistent history
interface HistoryEntry {
  ingredientName: string
  ingredientId?: string
  imageUrls: string[]
  timestamp: string
}

function appendHistory(entry: HistoryEntry) {
  try {
    const history = getHistory()
    history.push(entry)
    writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf-8')
  } catch (e) {
    console.warn('Failed to write line art history:', e)
  }
}

export function getHistory(): HistoryEntry[] {
  try {
    if (existsSync(HISTORY_PATH)) {
      return JSON.parse(readFileSync(HISTORY_PATH, 'utf-8'))
    }
  } catch {}
  return []
}

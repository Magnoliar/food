import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockJob = {
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

const store = vi.hoisted(() => ({
  jobs: [] as MockJob[],
}))

const prismaMock = vi.hoisted(() => ({
  lineArtJob: {
    create: vi.fn(async ({ data }: any) => {
      const now = new Date()
      const job = {
        id: data.id,
        ingredientName: data.ingredientName,
        ingredientId: data.ingredientId ?? null,
        status: data.status ?? 'pending',
        imageUrls: data.imageUrls ?? '[]',
        selectedUrl: data.selectedUrl ?? null,
        error: data.error ?? null,
        threadId: data.threadId ?? null,
        runId: data.runId ?? null,
        createdAt: now,
        updatedAt: now,
      }
      store.jobs.push(job)
      return job
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
      let count = 0
      for (const job of store.jobs) {
        const statusMatch = where.status?.in?.includes(job.status) ?? job.status === where.status
        const staleMatch = where.updatedAt?.lt ? job.updatedAt < where.updatedAt.lt : true
        if (statusMatch && staleMatch) {
          Object.assign(job, data, { updatedAt: new Date() })
          count += 1
        }
      }
      return { count }
    }),
    findUnique: vi.fn(async ({ where }: any) => store.jobs.find(job => job.id === where.id) ?? null),
    findMany: vi.fn(async (args: any = {}) => {
      let jobs = [...store.jobs]
      const ids = args.where?.ingredientId?.in
      if (Array.isArray(ids)) {
        jobs = jobs.filter(job => job.ingredientId && ids.includes(job.ingredientId))
      }
      if (args.orderBy?.updatedAt === 'desc') {
        return jobs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      }
      return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    }),
    findFirst: vi.fn(async ({ where }: any) => {
      return [...store.jobs]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .find((job) => {
          const ingredientMatch = where.ingredientId ? job.ingredientId === where.ingredientId : true
          const statusMatch = where.status?.in ? where.status.in.includes(job.status) : true
          return ingredientMatch && statusMatch
        }) ?? null
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const job = store.jobs.find(item => item.id === where.id)
      if (!job) throw new Error('not found')
      Object.assign(job, data, { updatedAt: new Date() })
      return job
    }),
  },
  ingredient: {
    update: vi.fn(),
  },
}))

vi.mock('../../server/utils/prisma', () => ({ prisma: prismaMock }))
vi.mock('../../server/utils/xyq-client', () => ({ xyqPollResult: vi.fn() }))

const { createJob, findJobByIngredientId, getJob, getLatestJobsByIngredientIds, updateJob } = await import('../../server/utils/line-art-jobs')

describe('line art jobs', () => {
  beforeEach(() => {
    store.jobs.length = 0
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('persists a created job and exposes API DTO fields', async () => {
    const job = await createJob('番茄', 'ing-1')

    expect(job.id).toMatch(/^la-/)
    expect(job).toMatchObject({
      ingredientName: '番茄',
      ingredientId: 'ing-1',
      status: 'pending',
      imageUrls: [],
    })

    const persisted = await getJob(job.id)
    expect(persisted?.id).toBe(job.id)
    expect(persisted?.createdAt).toEqual(expect.any(Number))
  })

  it('finds an existing running job for the same ingredient', async () => {
    const job = await createJob('番茄', 'ing-1')

    const duplicate = await findJobByIngredientId('ing-1')

    expect(duplicate?.id).toBe(job.id)
  })

  it('marks stale pending and polling jobs as failed so duplicate generation can proceed', async () => {
    const staleTime = new Date(Date.now() - 11 * 60 * 1000)
    store.jobs.push({
      id: 'stale-job',
      ingredientName: '番茄',
      ingredientId: 'ing-1',
      status: 'pending',
      imageUrls: '[]',
      selectedUrl: null,
      error: null,
      threadId: null,
      runId: null,
      createdAt: staleTime,
      updatedAt: staleTime,
    })

    const running = await findJobByIngredientId('ing-1')
    const stale = await getJob('stale-job')

    expect(running).toBeUndefined()
    expect(stale?.status).toBe('failed')
    expect(stale?.error).toContain('超时')
  })

  it('serializes image URL updates for polling results', async () => {
    const job = await createJob('番茄', 'ing-1')

    await updateJob(job.id, {
      status: 'done',
      imageUrls: ['/line-arts/tomato_1.jpg'],
      selectedUrl: '/line-arts/tomato_1.jpg',
    })

    const done = await getJob(job.id)
    expect(done?.status).toBe('done')
    expect(done?.imageUrls).toEqual(['/line-arts/tomato_1.jpg'])
    expect(store.jobs[0]?.imageUrls).toBe('[\"/line-arts/tomato_1.jpg\"]')
  })

  it('returns the latest job per ingredient for UI recovery after reload', async () => {
    store.jobs.push(
      {
        id: 'old-failed',
        ingredientName: '番茄',
        ingredientId: 'ing-1',
        status: 'failed',
        imageUrls: '[]',
        selectedUrl: null,
        error: '旧任务失败',
        threadId: null,
        runId: null,
        createdAt: new Date('2026-06-08T08:00:00.000Z'),
        updatedAt: new Date('2026-06-08T08:01:00.000Z'),
      },
      {
        id: 'new-polling',
        ingredientName: '番茄',
        ingredientId: 'ing-1',
        status: 'polling',
        imageUrls: '[]',
        selectedUrl: null,
        error: null,
        threadId: 'thread-1',
        runId: 'run-1',
        createdAt: new Date('2026-06-08T08:05:00.000Z'),
        updatedAt: new Date(),
      },
      {
        id: 'pepper-done',
        ingredientName: '青椒',
        ingredientId: 'ing-2',
        status: 'done',
        imageUrls: '[\"/line-arts/pepper_1.jpg\"]',
        selectedUrl: '/line-arts/pepper_1.jpg',
        error: null,
        threadId: 'thread-2',
        runId: 'run-2',
        createdAt: new Date('2026-06-08T08:10:00.000Z'),
        updatedAt: new Date('2026-06-08T08:11:00.000Z'),
      },
    )

    const jobs = await getLatestJobsByIngredientIds(['ing-1', 'ing-2'])

    expect(jobs.map(job => job.id)).toEqual(['new-polling', 'pepper-done'])
    expect(jobs[1]?.imageUrls).toEqual(['/line-arts/pepper_1.jpg'])
  })
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { ingredientName, ingredientId } = body

  if (!ingredientName) {
    throw createError({ statusCode: 400, message: '食材名称不能为空' })
  }

  // 1. Check if already has line art in DB
  if (ingredientId) {
    const existing = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
      select: { lineArtUrl: true },
    })
    if (existing?.lineArtUrl) {
      // Parse existing URLs (may be single string or JSON array)
      let urls: string[] = []
      try {
        const parsed = JSON.parse(existing.lineArtUrl)
        urls = Array.isArray(parsed) ? parsed : [existing.lineArtUrl]
      } catch {
        urls = [existing.lineArtUrl]
      }
      if (urls.length > 0) {
        return {
          jobId: null,
          status: 'already_exists',
          imageUrls: urls,
          selectedUrl: urls[0],
        }
      }
    }
  }

  // 2. Check if there's already a running job for this ingredient
  const existingJob = await findJobByIngredientId(ingredientId)
  if (existingJob && (existingJob.status === 'pending' || existingJob.status === 'polling')) {
    return {
      jobId: existingJob.id,
      status: 'already_running',
    }
  }

  // 3. Submit to XYQ
  let submitResult
  try {
    submitResult = await xyqSubmitRun(lineArtPrompt(ingredientName))
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || '提交失败'
    if (msg.includes('上限') || msg.includes('limit')) {
      throw createError({ statusCode: 429, message: '小云雀今日配额已用完，明天再试' })
    }
    throw createError({ statusCode: 502, message: `小云雀提交失败: ${msg}` })
  }
  const threadId = submitResult.run?.thread_id
  const runId = submitResult.run?.run_id

  if (!threadId || !runId) {
    throw createError({ statusCode: 502, message: 'XYQ 提交失败' })
  }

  // Create job and start background polling
  const job = await createJob(ingredientName, ingredientId)
  startPolling(job.id, threadId, runId).catch((error) => {
    console.warn('Line art polling failed:', error)
  })

  return {
    jobId: job.id,
    status: 'submitted',
  }
})

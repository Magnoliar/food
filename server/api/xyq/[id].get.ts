export default defineEventHandler(async (event) => {
  const jobId = getRouterParam(event, 'id')
  if (!jobId) {
    throw createError({ statusCode: 400, message: '缺少 jobId' })
  }

  const job = await getJob(jobId)
  if (!job) {
    throw createError({ statusCode: 404, message: '任务不存在或已过期' })
  }

  return {
    id: job.id,
    status: job.status,
    imageUrls: job.imageUrls || [],
    selectedUrl: job.selectedUrl || null,
    error: job.error,
    ingredientName: job.ingredientName,
    ingredientId: job.ingredientId,
  }
})

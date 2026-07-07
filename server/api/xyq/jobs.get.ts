import { getLatestJobsByIngredientIds } from '../../utils/line-art-jobs'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rawIds = Array.isArray(query.ingredientIds) ? query.ingredientIds.join(',') : query.ingredientIds
  const ingredientId = Array.isArray(query.ingredientId) ? query.ingredientId[0] : query.ingredientId
  const ids = [
    ...(typeof rawIds === 'string' ? rawIds.split(',') : []),
    ...(typeof ingredientId === 'string' ? [ingredientId] : []),
  ].map(id => id.trim()).filter(Boolean)

  if (!ids.length) {
    throw createError({ statusCode: 400, message: '缺少 ingredientId' })
  }

  const jobs = await getLatestJobsByIngredientIds(ids)
  return jobs.map(job => ({
    id: job.id,
    status: job.status,
    imageUrls: job.imageUrls || [],
    selectedUrl: job.selectedUrl || null,
    error: job.error,
    ingredientName: job.ingredientName,
    ingredientId: job.ingredientId,
    updatedAt: job.updatedAt,
  }))
})

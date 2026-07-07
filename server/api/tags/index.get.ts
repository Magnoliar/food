export default defineEventHandler(async () => {
  const tags = await prisma.tag.findMany({
    orderBy: [{ dimension: 'asc' }, { name: 'asc' }],
  })

  // Group by dimension, include parentId for hierarchy
  const grouped: Record<string, any[]> = {}
  for (const tag of tags) {
    const bucket = grouped[tag.dimension] ?? (grouped[tag.dimension] = [])
    bucket.push({
      id: tag.id,
      name: tag.name,
      dimension: tag.dimension,
      parentId: tag.parentId,
      color: tag.color,
    })
  }

  return grouped
})

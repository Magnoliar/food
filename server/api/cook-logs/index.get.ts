export default defineEventHandler(async () => {
  const logs = await prisma.cookLog.findMany({
    include: {
      recipe: { select: { id: true, name: true, tags: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  })

  return logs.map(log => ({
    ...log,
    photos: safeJsonParse(log.photos, []),
  }))
})

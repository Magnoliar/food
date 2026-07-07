export default defineEventHandler(async () => {
  return await prisma.collection.findMany({
    include: {
      recipes: { select: { id: true, name: true, score: true } },
    },
    orderBy: { name: 'asc' },
  })
})

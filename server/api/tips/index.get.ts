export default defineEventHandler(async () => {
  return await prisma.cookingTip.findMany({
    orderBy: { title: 'asc' },
  })
})

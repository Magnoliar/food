export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.id) throw createError({ statusCode: 400, message: '缺少物品 ID' })

  try {
    await prisma.fridgeItem.delete({ where: { id: body.id } })
  } catch (e: any) {
    if (e?.code === 'P2025') throw createError({ statusCode: 404, message: '物品不存在' })
    throw createError({ statusCode: 500, message: '删除失败' })
  }
  return { ok: true }
})

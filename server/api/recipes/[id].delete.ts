export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  try {
    await prisma.recipe.delete({ where: { id } })
    return { ok: true }
  } catch (e: any) {
    if (e?.code === 'P2025') throw createError({ statusCode: 404, message: '菜谱不存在' })
    throw createError({ statusCode: 500, message: '操作失败' })
  }
})

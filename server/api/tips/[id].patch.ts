export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const data: any = {}
  if (body.title !== undefined) data.title = body.title
  if (body.content !== undefined) data.content = body.content
  if (body.category !== undefined) data.category = body.category

  try {
    const tip = await prisma.cookingTip.update({ where: { id }, data })
    return tip
  } catch (e: any) {
    if (e?.code === 'P2025') throw createError({ statusCode: 404, message: '贴士不存在' })
    throw createError({ statusCode: 500, message: '操作失败' })
  }
})

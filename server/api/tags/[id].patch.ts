export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const data: any = {}
  if (body.name !== undefined) data.name = body.name
  if (body.color !== undefined) data.color = body.color
  if (body.parentId !== undefined) data.parentId = body.parentId

  try {
    const tag = await prisma.tag.update({ where: { id }, data })
    return tag
  } catch (e: any) {
    if (e?.code === 'P2025') throw createError({ statusCode: 404, message: '标签不存在' })
    throw createError({ statusCode: 500, message: '操作失败' })
  }
})

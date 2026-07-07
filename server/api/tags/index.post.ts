export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.name) throw createError({ statusCode: 400, message: '标签名称不能为空' })

  const tag = await prisma.tag.create({
    data: {
      name: body.name,
      dimension: body.dimension || 'custom',
      color: body.color || null,
      parentId: body.parentId || null,
    },
  })
  return tag
})

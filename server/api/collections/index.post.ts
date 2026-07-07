export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.name) throw createError({ statusCode: 400, message: '合集名称不能为空' })

  return await prisma.collection.create({
    data: {
      name: body.name,
      description: body.description || null,
      icon: body.icon || null,
    },
  })
})

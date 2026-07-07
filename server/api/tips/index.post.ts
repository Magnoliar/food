export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.title || !body.content) {
    throw createError({ statusCode: 400, message: '标题和内容不能为空' })
  }

  return await prisma.cookingTip.create({
    data: {
      title: body.title,
      content: body.content,
      category: body.category || null,
    },
  })
})

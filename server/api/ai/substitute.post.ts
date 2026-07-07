export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { ingredientName, recipeName } = body

  if (!ingredientName) {
    throw createError({ statusCode: 400, message: '需要食材名称' })
  }

  const system = `你是一个经验丰富的家庭厨师。用户做菜时缺某个食材，你推荐 1-2 个容易买到的替代品。
简短说明替代方案和用量调整（30字以内）。返回 JSON 数组，每个元素 { substitute, note }。只返回 JSON。`

  const context = recipeName ? `正在做${recipeName}，` : ''

  try {
    const result = await aiChat([{ role: 'user', content: `${context}没有${ingredientName}，可以用什么代替？` }], {
      system,
      light: true,
    })
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s: any) => s?.substitute).slice(0, 2)
  } catch {
    return []
  }
})

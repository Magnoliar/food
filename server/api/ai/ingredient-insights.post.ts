export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { ingredientName, relatedRecipes } = body

  if (!ingredientName) {
    throw createError({ statusCode: 400, message: '需要食材名称' })
  }

  const recipeContext = relatedRecipes?.length ? `常用于：${relatedRecipes.join('、')}` : ''

  const system = `你是一个食材百科专家。分析这个食材，返回 JSON 对象：
- pairs: 数组，3-5 个常见搭配食材（简短名称）
- tip: 一条存储或处理小技巧（25字以内）
- season: 当季状态（"当季"或"全年"）
只返回 JSON。`

  try {
    const result = await aiChat([{ role: 'user', content: `${ingredientName}。${recipeContext}` }], {
      system,
      light: true,
    })
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return { pairs: [], tip: '', season: '' }
  }
})

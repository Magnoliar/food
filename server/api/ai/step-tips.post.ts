export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { recipeName, steps } = body

  if (!recipeName || !Array.isArray(steps) || !steps.length) {
    throw createError({ statusCode: 400, message: '需要菜名和步骤列表' })
  }

  const stepsText = steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')

  const system = `你是一个经验丰富的大厨。用户正在按步骤做菜，为每个步骤写一句简短的实用提示（20字以内）。
提示内容可以是：火候建议、时间提醒、常见翻车点、小技巧。
不要重复步骤内容，不要用编号，语气轻松自然。
返回 JSON 数组，每个元素是一个字符串，和步骤一一对应。只返回 JSON。`

  try {
    const result = await aiChat([{ role: 'user', content: `${recipeName}的做法：\n${stepsText}` }], {
      system,
      light: true,
    })
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return steps.map(() => '')
    return steps.map((_, i) => {
      const tip = parsed[i]
      return typeof tip === 'string' ? tip : ''
    })
  } catch {
    return steps.map(() => '')
  }
})

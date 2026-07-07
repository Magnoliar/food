export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { preferences, season, exclude } = body

  const system = `你是一个专业的家庭厨师顾问。根据用户的偏好和季节推荐适合家庭制作的菜品。
返回 JSON 数组，每个元素包含: name(菜名), reason(推荐理由), difficulty(1-5), estimatedTime(分钟).
推荐 5-7 道菜，涵盖不同烹饪方式，考虑营养搭配。只返回 JSON，不要其他文字。`

  const userMsg = `偏好：${preferences || '家常菜，下饭'}\n季节：${season || '当前季节'}\n排除：${exclude || '无'}`

  let result: string
  try {
    result = await aiChat([{ role: 'user', content: userMsg }], {
      system,
      light: true,
    })
  } catch {
    return []
  }

  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    throw createError({ statusCode: 422, message: 'AI 返回的内容无法解析，请重试' })
  }
})

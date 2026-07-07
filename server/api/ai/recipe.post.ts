import { parseRecipePatch } from '../../schemas/recipe'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name } = body

  if (!name) {
    throw createError({ statusCode: 400, message: '菜谱名称不能为空' })
  }

  const system = `你是一个专业的家庭厨师。用户给你一道菜名，你需要返回这道菜的完整信息。
返回 JSON 对象，包含：
- description: 一句话描述（20字内）
- category: 菜系分类
- difficulty: 难度1-5
- estimatedTime: 预估分钟数
- ingredients: 数组，每项 {name, amount(数字), unit(g/kg/ml/L/个/份/根/片/块/把/勺), category(海鲜水产/肉禽蛋品/蔬菜菌菇/香辛料/调味干货/主食/乳品)}
- steps: 数组，每步一个字符串，简洁明了
- tip: 一条厨艺贴士（可选）
- tags: 标签数组，包含菜系、口味、烹饪方式、场景等
只返回 JSON，不要其他文字。`

  let result: string
  try {
    result = await aiChat([{ role: 'user', content: `请为这道菜生成完整菜谱：${name}` }], {
      system,
      cache: false,
    })
  } catch {
    throw createError({ statusCode: 502, message: 'AI 服务暂时不可用，请稍后再试' })
  }

  let parsed: Record<string, unknown>
  try {
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    throw createError({ statusCode: 422, message: 'AI 返回的内容无法解析，请重试' })
  }

  let validated: Record<string, unknown>
  try {
    validated = parseRecipePatch(parsed) as Record<string, unknown>
  } catch {
    validated = parsed
  }

  // 质量自检
  const warnings: string[] = []
  const ings = validated.ingredients as any[] | undefined
  const steps = validated.steps as string[] | undefined
  if (!ings || ings.length < 2) warnings.push('食材不足 2 种，可能不完整')
  if (!steps || steps.length < 2) warnings.push('步骤不足 2 步，可能不完整')
  const diff = validated.difficulty as number | undefined
  if (diff !== undefined && (diff < 1 || diff > 5)) warnings.push('难度值不在 1-5 范围')
  const time = validated.estimatedTime as number | undefined
  if (time !== undefined && time <= 0) warnings.push('预估时间不合理')

  return { ...validated, warnings }
})

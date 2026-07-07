export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { meals, availableRecipes } = body

  if (!Array.isArray(meals) || !Array.isArray(availableRecipes) || !availableRecipes.length) {
    throw createError({ statusCode: 400, message: '需要餐位列表和可用菜谱' })
  }

  // 构建当前计划概览
  const planSummary = meals.map((day: any) => {
    if (day.meal1?.status === 'skipped') return `${day.dayLabel || day.date}: ${day.meal1.skipReason || '不安排'}（跳过）`
    const m1 = day.meal1?.name || '（空）'
    const m2 = day.meal2?.name || ''
    return `${day.dayLabel || day.date}: ${m1}${m2 ? ' / 便当:' + m2 : ''}`
  }).join('\n')

  // 找出空位（排除跳过的天）
  const emptySlots: Array<{ dayIndex: number; slot: 'meal1' | 'meal2'; label: string }> = []
  for (let i = 0; i < meals.length; i++) {
    if (meals[i].meal1?.status === 'skipped') continue
    if (meals[i].meal1 && !meals[i].meal1?.name?.trim()) {
      emptySlots.push({ dayIndex: i, slot: 'meal1', label: meals[i].meal1?.label || '晚餐' })
    }
    if (meals[i].meal2 && !meals[i].meal2?.name?.trim() && meals[i].meal2?.status !== 'skipped') {
      emptySlots.push({ dayIndex: i, slot: 'meal2', label: meals[i].meal2?.label || '便当' })
    }
  }

  if (!emptySlots.length) {
    return { assignments: [] }
  }

  // 取可用菜谱名列表
  const recipeNames = availableRecipes.map((r: any) => `${r.name}(${r.estimatedTime || '?'}min,${r.difficulty || '?'}分)`).slice(0, 60)

  const system = `你是一个家庭膳食规划师。根据一周已有的菜品安排，为空位选择合适的菜。
原则：
1. 荤素搭配：如果已有几天荤菜，空位优先选素菜或清淡的
2. 口味多样：避免连续两天做同一种口味（如连续辣菜）
3. 烹饪方式多样：炒、炖、蒸、凉拌交替
4. 便当选快手菜（25分钟以内）
5. 从提供的可用菜谱中选择，不要编造菜名
返回 JSON 数组，每个元素 { dayIndex, slot, recipeName }。只返回 JSON。`

  const userMsg = `当前一周安排：\n${planSummary}\n\n需要填的空位：\n${emptySlots.map((s, i) => `${i + 1}. 第${s.dayIndex + 1}天 ${s.label}`).join('\n')}\n\n可用菜谱：\n${recipeNames.join('、')}`

  try {
    const result = await aiChat([{ role: 'user', content: userMsg }], { system, cache: false })
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return { assignments: [] }

    // 校验并匹配到可用菜谱
    const assignments = parsed
      .map((item: any) => {
        const slot = emptySlots.find(s => s.dayIndex === item.dayIndex && s.slot === item.slot)
        if (!slot) return null
        const recipe = availableRecipes.find((r: any) => r.name === item.recipeName)
        if (!recipe) return null
        return { dayIndex: item.dayIndex, slot: item.slot, recipeName: recipe.name, recipeId: recipe.id }
      })
      .filter(Boolean)

    return { assignments }
  } catch {
    return { assignments: [] }
  }
})

export default defineEventHandler(async (_event) => {
  const [recentLogs, fridge, recipes] = await Promise.all([
    prisma.cookLog.findMany({
      orderBy: { date: 'desc' },
      take: 5,
      include: { recipe: { select: { name: true } } },
    }),
    prisma.fridgeItem.findMany({ select: { name: true } }),
    prisma.recipe.findMany({
      orderBy: { cookCount: 'asc' },
      take: 5,
      select: { name: true, cookCount: true },
    }),
  ])

  const recentDishes = recentLogs.map(l => l.recipe?.name).filter(Boolean).join('、') || '还没做过菜'
  const fridgeItems = fridge.map(f => f.name).join('、') || '冰箱空空的'
  const rarelyCooked = recipes.filter(r => r.cookCount <= 1).map(r => r.name).join('、')

  const system = `你是一个温馨的家庭厨房助手。根据用户最近做过的菜和冰箱食材，写一条简短的个性化烹饪贴士（30字以内）。
可以是：新菜推荐、食材利用建议、搭配灵感、烹饪小技巧。
语气轻松自然，像朋友随口说的。只返回贴士文字。`

  const context = [
    `最近做了：${recentDishes}`,
    `冰箱里有：${fridgeItems}`,
    rarelyCooked ? `很少做的菜：${rarelyCooked}` : '',
  ].filter(Boolean).join('\n')

  try {
    const tip = await aiChat([{ role: 'user', content: context }], { system, light: true })
    return { tip: tip.trim() }
  } catch {
    return { tip: '' }
  }
})

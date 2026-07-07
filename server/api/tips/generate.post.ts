const patterns = [
  { match: (r: any) => r.tagNames?.includes('炒'), tip: { category: '秘方', content: '大火快炒保持食材鲜嫩，油温要够再下锅。' } },
  { match: (r: any) => r.tagNames?.includes('炖'), tip: { category: '秘方', content: '小火慢炖让食材充分入味，中途不要频繁揭盖。' } },
  { match: (r: any) => r.tagNames?.includes('烤'), tip: { category: '秘方', content: '提前腌制入味，烤箱一定要预热，中途翻面一次。' } },
  { match: (r: any) => r.tagNames?.includes('蒸'), tip: { category: '秘方', content: '大火蒸透保持原汁原味，出锅后倒掉蒸出的汤汁更清爽。' } },
  { match: (r: any) => r.tagNames?.includes('炸'), tip: { category: '秘方', content: '油温要够，复炸一次更酥脆。炸完放在吸油纸上沥油。' } },
  { match: (r: any) => r.tagNames?.includes('拌'), tip: { category: '秘方', content: '调味是灵魂，拌匀后腌制10分钟更入味。' } },
  { match: (r: any) => r.tagNames?.includes('煎'), tip: { category: '秘方', content: '热锅冷油中小火慢煎，两面金黄即可，不要频繁翻动。' } },
  { match: (r: any) => r.tagNames?.includes('便当友好'), tip: { category: '食材特性', content: '便当菜选不易出水的食材，酱汁收干一些，微波加热更香。' } },
  { match: (r: any) => r.cookCount >= 5, tip: { category: '食材特性', content: '这道菜做过很多次了，试试换一种调味方式会有新发现。' } },
  { match: (r: any) => r.score >= 9, tip: { category: '秘方', content: '高分菜谱！保持这个配方，下次可以多做一份分享。' } },
  { match: (r: any) => r.ingNames?.includes('牛'), tip: { category: '食材特性', content: '牛肉要逆纹切才嫩，腌制时加蛋清和淀粉锁住水分。' } },
  { match: (r: any) => r.ingNames?.includes('鱼'), tip: { category: '食材特性', content: '鱼要新鲜，煎之前擦干水分，热锅冷油不粘锅。' } },
  { match: (r: any) => r.ingNames?.includes('虾'), tip: { category: '食材特性', content: '虾不要炒太久，变红即熟，过火会柴。' } },
  { match: (r: any) => r.ingNames?.includes('豆腐'), tip: { category: '食材特性', content: '嫩豆腐先用盐水焯一下不易碎，轻轻翻动。' } },
]

export default defineEventHandler(async () => {
  const recipes = await prisma.recipe.findMany({
    include: {
      tags: true,
      ingredients: { include: { ingredient: true } },
    },
  })

  const existingTips = await prisma.cookingTip.findMany()
  const existingTitles = new Set(existingTips.map(t => t.title))

  const newTips: Array<{ title: string; content: string; category: string }> = []

  for (const recipe of recipes) {
    const enriched = {
      ...recipe,
      tagNames: recipe.tags.map(t => t.name),
      ingNames: recipe.ingredients.map(ri => ri.ingredient?.name || '').join(' '),
    }

    for (const pattern of patterns) {
      if (pattern.match(enriched)) {
        const title = `${recipe.name} - ${pattern.tip.category === '秘方' ? '秘诀' : '贴士'}`
        if (!existingTitles.has(title)) {
          newTips.push({
            title,
            content: pattern.tip.content,
            category: pattern.tip.category,
          })
          existingTitles.add(title)
        }
      }
    }
  }

  if (newTips.length > 0) {
    await prisma.cookingTip.createMany({ data: newTips })
  }

  return {
    generated: newTips.length,
    total: existingTips.length + newTips.length,
    newTips: newTips.slice(0, 10),
  }
})

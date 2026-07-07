// AI-powered auto-tagging with rule-based fallback

const RULES = {
  name: [
    { match: ['麻辣', '水煮', '毛血旺', '辣子'], tags: ['麻辣'] },
    { match: ['酸菜', '酸辣'], tags: ['酸味'] },
    { match: ['糖醋'], tags: ['酸甜'] },
    { match: ['炒'], tags: ['炒'] },
    { match: ['炖', '煲', '烧'], tags: ['炖'] },
    { match: ['烤', '焗'], tags: ['烤'] },
    { match: ['炸'], tags: ['炸'] },
    { match: ['蒸'], tags: ['蒸'] },
    { match: ['拌', '凉拌'], tags: ['拌'] },
    { match: ['煎'], tags: ['煎'] },
    { match: ['面', '粉', '饭', '米线', '包子', '饺子'], tags: ['主食'] },
    { match: ['汤'], tags: ['汤'] },
    { match: ['焖'], tags: ['焖'] },
    { match: ['蛋糕', '吐司', '西米露'], tags: ['甜品'] },
    { match: ['便当'], tags: ['便当友好'] },
  ],
  cuisine: [
    { match: ['回锅', '麻婆', '水煮', '毛血旺', '辣子', '酸菜鱼', '担担'], tag: '川菜' },
    { match: ['豉油', '白灼', '盐焗', '葱油', '清蒸', '煲仔', '广式', '港式'], tag: '粤菜' },
    { match: ['辣椒炒肉', '小炒黄牛肉', '剁椒', '农家'], tag: '湘菜' },
    { match: ['咖喱', '沙茶', '泰式', '叻沙'], tag: '东南亚' },
    { match: ['日式', '寿喜', '照烧', '味噌'], tag: '日式' },
    { match: ['韩式', '泡菜'], tag: '韩式' },
    { match: ['云南', '米线', '过桥'], tag: '云南菜' },
  ],
  ingredient: [
    { match: ['牛肉', '牛腩', '排骨', '猪蹄', '猪肉', '五花肉'], tags: ['荤菜'] },
    { match: ['鸡肉', '鸡腿', '鸭'], tags: ['荤菜'] },
    { match: ['鱼', '虾', '蟹', '蛤蜊', '鲍鱼'], tags: ['荤菜'] },
  ],
}

// Available tag dimensions for AI prompt
const TAG_DIMENSIONS = `菜系: 川菜/粤菜/湘菜/东南亚/日式/韩式/云南菜
菜品类型: 热菜/凉菜/甜品/主食
烹饪方式: 炒/炖/烤/炸/蒸/拌/煎/焖/汤
口味: 麻辣/酸味/酸甜/鲜辣/咸鲜/咖喱
场景: 便当友好/宴客/下饭/下酒/备餐
荤素: 荤菜/荤素搭配
营养: 高蛋白/低脂/素食/高纤维
烹饪工具: 砂锅/空气炸锅/烤箱/电饭煲/铸铁锅`

async function aiTagRecipe(recipe: any): Promise<string[] | null> {
  const system = `你是一个专业的中餐菜谱分类助手。根据菜谱信息，从以下标签维度中选择最合适的标签（每个维度最多2个，总共不超过8个标签）。

可用标签维度：
${TAG_DIMENSIONS}

只返回JSON数组格式的标签名，如：["川菜","麻辣","炒","下饭"]
不要返回其他文字。`

  const ingNames = recipe.ingredients?.map((ri: any) => ri.ingredient?.name || ri.name).join('、') || ''
  const userMsg = `菜名：${recipe.name}
描述：${recipe.description || '无'}
食材：${ingNames}
步骤摘要：${(recipe.steps || []).slice(0, 3).join('；')}`

  try {
    const result = await aiChat([{ role: 'user', content: userMsg }], { system, light: true })
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const tags = JSON.parse(cleaned)
    if (Array.isArray(tags) && tags.every((t: any) => typeof t === 'string')) {
      return tags.slice(0, 10)
    }
  } catch {}
  return null
}

function ruleTagRecipe(recipe: any): string[] {
  const tags = new Set<string>()
  const name = recipe.name

  for (const rule of RULES.name) {
    if (rule.match.some(kw => name.includes(kw))) {
      rule.tags.forEach(t => tags.add(t))
    }
  }
  for (const rule of RULES.cuisine) {
    if (rule.match.some(kw => name.includes(kw))) tags.add(rule.tag)
  }
  if (recipe.ingredients) {
    const ingNames = recipe.ingredients.map((ri: any) => ri.ingredient?.name || '').join(' ')
    for (const rule of RULES.ingredient) {
      if (rule.match.some(kw => ingNames.includes(kw))) {
        rule.tags.forEach(t => tags.add(t))
      }
    }
  }
  const cuisineTags = ['川菜', '粤菜', '湘菜', '东南亚', '日式', '韩式', '云南菜', '甜品']
  if (![...tags].some(t => cuisineTags.includes(t))) tags.add('家常菜')

  return [...tags]
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const useAI = body?.mode === 'ai'

  const recipes = await prisma.recipe.findMany({
    include: {
      tags: true,
      ingredients: { include: { ingredient: true } },
    },
  })

  let updated = 0
  let aiUsed = 0
  let ruleUsed = 0

  for (const recipe of recipes) {
    const existingTags = new Set(recipe.tags.map(t => t.name))
    let newTags: string[] = []

    if (useAI) {
      const aiTags = await aiTagRecipe(recipe)
      if (aiTags) {
        newTags = aiTags
        aiUsed++
      } else {
        newTags = ruleTagRecipe(recipe)
        ruleUsed++
      }
      // 间隔 500ms 避免触发上游速率限制
      await new Promise(resolve => setTimeout(resolve, 500))
    } else {
      newTags = ruleTagRecipe(recipe)
      ruleUsed++
    }

    // Merge new tags with existing
    let changed = false
    for (const tag of newTags) {
      if (!existingTags.has(tag)) {
        existingTags.add(tag)
        changed = true
      }
    }

    if (changed) {
      const tagNames = [...existingTags].slice(0, 12)
      const tagIds: string[] = []
      for (const tagName of tagNames) {
        let tag = await prisma.tag.findFirst({ where: { name: tagName } })
        if (!tag) {
          // Determine dimension from tag name
          const dimension = guessDimension(tagName)
          tag = await prisma.tag.create({ data: { name: tagName, dimension } })
        }
        tagIds.push(tag.id)
      }
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { tags: { set: tagIds.map(id => ({ id })) } },
      })
      updated++
    }
  }

  return { updated, total: recipes.length, aiUsed, ruleUsed, mode: useAI ? 'ai' : 'rule' }
})

function guessDimension(tagName: string): string {
  const map: Record<string, string> = {
    '川菜': 'cuisine', '粤菜': 'cuisine', '湘菜': 'cuisine', '东南亚': 'cuisine',
    '日式': 'cuisine', '韩式': 'cuisine', '云南菜': 'cuisine',
    '热菜': 'dish_type', '凉菜': 'dish_type', '甜品': 'dish_type', '主食': 'dish_type',
    '炒': 'cook_method', '炖': 'cook_method', '烤': 'cook_method', '炸': 'cook_method',
    '蒸': 'cook_method', '拌': 'cook_method', '煎': 'cook_method', '焖': 'cook_method', '汤': 'cook_method',
    '麻辣': 'taste', '酸味': 'taste', '酸甜': 'taste', '鲜辣': 'taste', '咸鲜': 'taste', '咖喱': 'taste',
    '便当友好': 'scenario', '宴客': 'scenario', '下饭': 'scenario', '下酒': 'scenario', '备餐': 'scenario',
    '荤菜': 'protein', '荤素搭配': 'protein',
    '高蛋白': 'nutrition', '低脂': 'nutrition', '素食': 'nutrition', '高纤维': 'nutrition',
    '砂锅': 'cook_tool', '空气炸锅': 'cook_tool', '烤箱': 'cook_tool', '电饭煲': 'cook_tool', '铸铁锅': 'cook_tool',
    '家常菜': 'cuisine',
  }
  return map[tagName] || 'custom'
}

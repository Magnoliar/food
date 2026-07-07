import { serializeRecipe } from '../serializers/recipe'
import { recordAchievementEvent } from './achievement'
import { prisma } from '../utils/prisma'

export interface RecommendOptions {
  mealType?: 'dinner' | 'bento' | 'weekend'
  profile?: 'quick' | 'light' | 'spicy' | 'fridge' | 'balanced'
  count?: number
  excludeRecipeIds?: string[]
  useFridge?: boolean
  enrichWithAI?: boolean
}

function hasTag(recipe: any, pattern: RegExp) {
  return recipe.tags?.some((tag: any) => pattern.test(tag.name))
}

async function enrichReasonsWithAI(
  ranked: Array<{ recipe: any; score: number; reason: string[] }>,
  options: RecommendOptions,
): Promise<string[][]> {
  try {
    const recipeSummary = ranked.map((item, i) =>
      `${i + 1}. ${item.recipe.name}（${item.recipe.estimatedTime || '?'}分钟，难度${item.recipe.difficulty || '?'}/5，做过${item.recipe.cookCount}次，${item.reason.join('；')}）`,
    ).join('\n')

    const mealLabel = options.mealType === 'bento' ? '便当' : options.mealType === 'weekend' ? '周末午餐' : '晚餐'
    const fridgeHint = options.useFridge ? '用户冰箱里有一些常见食材，可以提到哪些食材已经备好。' : ''

    const system = `你是一个温馨的家庭厨房助手。根据以下菜谱推荐列表，为每道菜写一句简短的推荐理由（15字以内）。
理由要自然、有温度，像朋友随口推荐那样。不要重复菜名，不要用编号，不要说"推荐"。
${fridgeHint}
返回 JSON 数组，每个元素是一个字符串，和输入列表一一对应。只返回 JSON。`

    const months = ['冬', '冬', '春', '春', '春', '夏', '夏', '夏', '秋', '秋', '秋', '冬']
    const now = new Date()
    const season = `${now.getMonth() + 1}月（${months[now.getMonth()]}季）`

    const result = await aiChat([{ role: 'user', content: `当前${season}，今晚做${mealLabel}，这些菜可以选：\n${recipeSummary}` }], {
      system,
      light: true,
    })

    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return ranked.map(r => r.reason)
    return ranked.map((_, i) => {
      const item = parsed[i]
      const fallback = ranked[i]?.reason ?? []
      return typeof item === 'string' && item.trim() ? [item.trim()] : fallback
    })
  } catch {
    return ranked.map(r => r.reason)
  }
}

export async function recommendRecipes(options: RecommendOptions = {}, userId?: string | null) {
  const count = Math.min(Math.max(Number(options.count || 6), 1), 20)
  const [recipes, recentLogs, fridge] = await Promise.all([
    prisma.recipe.findMany({
      include: {
        tags: true,
        ingredients: { include: { ingredient: true } },
      },
    }),
    prisma.cookLog.findMany({
      orderBy: { date: 'desc' },
      take: 12,
      select: { recipeId: true, date: true },
    }),
    prisma.fridgeItem.findMany(),
  ])

  const recentIds = new Set(recentLogs.slice(0, 6).map(log => log.recipeId))
  const excluded = new Set(options.excludeRecipeIds || [])
  const fridgeNames = new Set(fridge.map(item => item.name))

  const ranked = recipes
    .filter(recipe => !excluded.has(recipe.id))
    .map((recipe) => {
      let score = recipe.score * 3 + Math.min(recipe.cookCount, 8)
      const reason: string[] = []

      if (recentIds.has(recipe.id)) {
        score -= 100
        reason.push('最近刚做过，已降权')
      }

      const coverage = recipe.ingredients.length
        ? recipe.ingredients.filter(ri => fridgeNames.has(ri.ingredient.name)).length / recipe.ingredients.length
        : 0
      if (options.useFridge || options.profile === 'fridge') {
        score += coverage * 30
        if (coverage > 0) reason.push(`冰箱食材覆盖 ${Math.round(coverage * 100)}%`)
      }

      if (options.profile === 'quick' && recipe.estimatedTime <= 25) {
        score += 20
        reason.push('快手省时')
      }
      if (options.profile === 'light' && (hasTag(recipe, /清淡|低脂|蔬菜/) || recipe.difficulty <= 3)) {
        score += 12
        reason.push('口味更轻')
      }
      if (options.profile === 'spicy' && hasTag(recipe, /辣|川|湘/)) {
        score += 15
        reason.push('符合重口味偏好')
      }
      if (options.mealType === 'bento' && hasTag(recipe, /便当|带饭|快手/)) {
        score += 15
        reason.push('适合便当')
      }
      if (recipe.score >= 8) reason.push('历史评分高')
      if (recipe.cookCount === 0) {
        score += 6
        reason.push('还没正式做过')
      }

      return {
        recipe,
        score,
        reason: reason.filter(r => !r.startsWith('最近')).slice(0, 3),
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)

  // 用 AI 生成更温馨的推荐理由（可选，默认关闭以加快响应）
  const aiReasons = options.enrichWithAI ? await enrichReasonsWithAI(ranked, options) : []

  await recordAchievementEvent('recommendation_used', userId, options.profile || 'balanced')
  return ranked.map((item, i) => ({
    ...serializeRecipe(item.recipe),
    recommendationScore: Math.round(item.score),
    reason: aiReasons[i]?.length ? aiReasons[i] : item.reason.length ? item.reason : ['综合评分较好'],
  }))
}

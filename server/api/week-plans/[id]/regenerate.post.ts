import { recommendRecipes } from '../../../services/recommendation'
import { serializeWeekPlan } from '../../../serializers/week-plan'
import { prisma } from '../../../utils/prisma'

function hasMealValue(meal: any) {
  return Boolean(meal.recipeId || meal.customName?.trim())
}

function mealTypeForLabel(label?: string) {
  if (label === '次日便当') return 'bento'
  if (label === '午餐') return 'weekend'
  return 'dinner'
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '缺少周计划 ID' })

  const plan = await prisma.weekPlan.findUnique({
    where: { id },
    include: { meals: { orderBy: { date: 'asc' } } },
  })
  if (!plan) throw createError({ statusCode: 404, message: '周计划不存在' })

  const usedRecipeIds = new Set(plan.meals
    .filter(hasMealValue)
    .map(meal => meal.recipeId)
    .filter((recipeId): recipeId is string => Boolean(recipeId)))
  const emptyMeals = plan.meals.filter(meal => !hasMealValue(meal) && meal.status !== 'skipped')

  for (const meal of emptyMeals) {
    const recommendations = await recommendRecipes({
      count: 1,
      profile: meal.mealLabel === '次日便当' ? 'quick' : 'balanced',
      mealType: mealTypeForLabel(meal.mealLabel),
      excludeRecipeIds: Array.from(usedRecipeIds),
      useFridge: true,
    }, event.context.authUser?.id)
    const recipe = recommendations[0]
    if (!recipe) continue
    await prisma.mealSlot.update({
      where: { id: meal.id },
      data: { recipeId: recipe.id, customName: null },
    })
    usedRecipeIds.add(recipe.id)
  }

  const updated = await prisma.weekPlan.findUnique({
    where: { id },
    include: {
      meals: { include: { recipe: { select: { id: true, name: true } } }, orderBy: { date: 'asc' } },
      shoppingLists: {
        include: { items: true },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
  })
  return serializeWeekPlan(updated)
})

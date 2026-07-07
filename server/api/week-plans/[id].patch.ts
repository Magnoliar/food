import { parseWeekPlanPatch } from '../../schemas/week-plan'
import { serializeWeekPlan } from '../../serializers/week-plan'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '缺少周计划 ID' })

  const body = parseWeekPlanPatch(await readBody(event))

  try {
    if (body.name !== undefined || body.status !== undefined) {
      await prisma.weekPlan.update({
        where: { id },
        data: {
          name: body.name,
          status: body.status,
        },
      })
    }

    if (body.meals) {
      for (const meal of body.meals as any[]) {
        await prisma.mealSlot.update({
          where: { id: meal.id },
          data: {
            recipeId: meal.recipeId ?? null,
            customName: meal.customName ?? null,
            notes: meal.notes ?? null,
            status: meal.status ?? null,
            skipReason: meal.skipReason ?? null,
          },
        })
      }
    }
  } catch (e: any) {
    if (e?.code === 'P2025') throw createError({ statusCode: 404, message: '周计划或餐位不存在' })
    throw createError({ statusCode: 500, message: '保存失败' })
  }

  const plan = await prisma.weekPlan.findUnique({
    where: { id },
    include: {
      meals: {
        include: { recipe: { select: { id: true, name: true } } },
        orderBy: { date: 'asc' },
      },
      shoppingLists: {
        include: { items: true },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
  })

  return serializeWeekPlan(plan)
})

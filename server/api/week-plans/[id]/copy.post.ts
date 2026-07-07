import { serializeWeekPlan } from '../../../serializers/week-plan'
import { addDays, formatLocalDate, startOfLocalDay } from '../../../utils/week-plan-helpers'
import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '缺少周计划 ID' })

  const source = await prisma.weekPlan.findUnique({
    where: { id },
    include: { meals: true },
  })
  if (!source) throw createError({ statusCode: 404, message: '周计划不存在' })

  const startDate = startOfLocalDay(addDays(source.startDate, 7))
  const endDate = startOfLocalDay(addDays(source.endDate, 7))
  const copied = await prisma.weekPlan.create({
    data: {
      name: `${source.name} 复制`,
      startDate,
      endDate,
      weekKey: formatLocalDate(startDate),
      meals: {
        create: source.meals.map(meal => ({
          date: startOfLocalDay(addDays(meal.date, 7)),
          mealLabel: meal.mealLabel,
          recipeId: meal.recipeId,
          customName: meal.customName,
          notes: meal.notes,
          status: meal.status,
          skipReason: meal.skipReason,
        })),
      },
    },
    include: { meals: { include: { recipe: { select: { id: true, name: true } } }, orderBy: { date: 'asc' } } },
  })

  return serializeWeekPlan(copied)
})

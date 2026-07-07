import { prisma } from './prisma'

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getCurrentPlanRange(now = new Date()) {
  const today = startOfLocalDay(now)
  const tuesdayOffset = (today.getDay() + 5) % 7
  const start = addDays(today, -tuesdayOffset)
  const end = addDays(start, 6)
  return { start, end, weekKey: formatLocalDate(start) }
}

export function mealLabelsForDate(date: Date) {
  const day = date.getDay()
  if (day === 5) return ['晚餐']
  if (day === 0 || day === 6) return ['午餐', '晚餐']
  return ['晚餐', '次日便当']
}

const weekPlanIncludes = {
  meals: {
    include: {
      recipe: {
        select: {
          id: true,
          name: true,
          score: true,
          estimatedTime: true,
          difficulty: true,
          cookCount: true,
          tags: true,
        },
      },
    },
    orderBy: { date: 'asc' as const },
  },
  shoppingLists: {
    include: { items: true },
    orderBy: { updatedAt: 'desc' as const },
    take: 1,
  },
}

const weekPlanSimpleIncludes = {
  meals: {
    include: { recipe: { select: { id: true, name: true } } },
    orderBy: { date: 'asc' as const },
  },
  shoppingLists: {
    include: { items: true },
    orderBy: { updatedAt: 'desc' as const },
    take: 1,
  },
}

export async function findPlan(start: Date, end: Date, weekKey: string) {
  return await prisma.weekPlan.findFirst({
    where: {
      status: 'active',
      OR: [
        { weekKey },
        { startDate: { lte: start }, endDate: { gte: end } },
        { startDate: start },
      ],
    },
    include: weekPlanIncludes,
    orderBy: { startDate: 'desc' },
  })
}

export async function createEmptyPlan(start: Date, end: Date, weekKey: string) {
  return await prisma.weekPlan.create({
    data: {
      name: '本轮计划',
      startDate: start,
      endDate: end,
      weekKey,
      status: 'active',
      meals: {
        create: Array.from({ length: 7 }).flatMap((_, index) => {
          const date = addDays(start, index)
          return mealLabelsForDate(date).map(label => ({
            date,
            mealLabel: label,
            recipeId: null,
            customName: null,
          }))
        }),
      },
    },
    include: weekPlanSimpleIncludes,
  })
}

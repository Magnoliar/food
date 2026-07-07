import { serializeWeekPlan } from '../../serializers/week-plan'
import { createEmptyPlan, findPlan, getCurrentPlanRange, startOfLocalDay } from '../../utils/week-plan-helpers'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const dateStr = query.date as string | undefined

  const match = dateStr?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    throw createError({ statusCode: 400, message: 'date 参数必须为 YYYY-MM-DD 格式' })
  }

  const [, year, month, day] = match
  const y = Number(year)
  const m = Number(month)
  const d = Number(day)
  const targetDate = startOfLocalDay(new Date(y, m - 1, d))

  if (Number.isNaN(targetDate.getTime())) {
    throw createError({ statusCode: 400, message: '无效日期' })
  }

  const { start, end, weekKey } = getCurrentPlanRange(targetDate)
  const plan = await findPlan(start, end, weekKey) || await createEmptyPlan(start, end, weekKey)
  return serializeWeekPlan(plan)
})

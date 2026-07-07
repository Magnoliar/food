import { serializeWeekPlan } from '../../serializers/week-plan'
import { createEmptyPlan, findPlan, getCurrentPlanRange } from '../../utils/week-plan-helpers'

export default defineEventHandler(async () => {
  const { start, end, weekKey } = getCurrentPlanRange()
  const plan = await findPlan(start, end, weekKey) || await createEmptyPlan(start, end, weekKey)
  return serializeWeekPlan(plan)
})

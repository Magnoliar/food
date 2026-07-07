import { parseShoppingListFromWeekPlan } from '../../schemas/shopping-list'
import { buildShoppingListFromWeekPlan } from '../../services/shopping-list'

export default defineEventHandler(async (event) => {
  const body = parseShoppingListFromWeekPlan(await readBody(event))
  return buildShoppingListFromWeekPlan(body.weekPlanId)
})

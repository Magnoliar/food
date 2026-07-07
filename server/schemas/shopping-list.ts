import { booleanRule, nullableString, optional, pickSchema, stringRule } from './validate'

export function parseShoppingItemPatch(body: unknown) {
  return pickSchema(body, {
    name: optional(stringRule({ min: 1, max: 80 })),
    amount: optional(nullableString({ max: 80 })),
    category: optional(stringRule({ min: 1, max: 40 })),
    checked: optional(booleanRule()),
    inStock: optional(booleanRule()),
  } as any)
}

export function parseShoppingListFromWeekPlan(body: unknown) {
  return {
    weekPlanId: stringRule({ min: 1 })((body as any)?.weekPlanId, 'weekPlanId'),
  }
}

export function parseShoppingItemCreate(body: unknown) {
  return {
    name: stringRule({ min: 1, max: 80 })((body as any)?.name, 'name'),
    amount: (body as any)?.amount === undefined ? null : nullableString({ max: 80 })((body as any).amount, 'amount'),
    category: (body as any)?.category === undefined ? '临时' : stringRule({ min: 1, max: 40 })((body as any).category, 'category'),
  }
}

import { nullableString, optional, pickSchema, stringRule, validationError } from './validate'

export interface WeekPlanMealInput {
  id: string
  recipeId: string | null
  customName: string | null
  notes: string | null
  status: string | null
  skipReason: string | null
}

export interface WeekPlanPatchInput {
  name?: string
  status?: string
  meals?: WeekPlanMealInput[]
}

function mealsRule(value: unknown): WeekPlanMealInput[] {
  if (!Array.isArray(value)) validationError('meals 必须是数组')
  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) validationError(`meals[${index}] 必须是对象`)
    const record = item as Record<string, unknown>
    return {
      id: stringRule({ min: 1 })(record.id, `meals[${index}].id`),
      recipeId: record.recipeId === undefined ? null : nullableString({ max: 80 })(record.recipeId, `meals[${index}].recipeId`),
      customName: record.customName === undefined ? null : nullableString({ max: 120 })(record.customName, `meals[${index}].customName`),
      notes: record.notes === undefined ? null : nullableString({ max: 500 })(record.notes, `meals[${index}].notes`),
      status: record.status === undefined ? null : (v => v === null || v === 'skipped' ? v : validationError(`meals[${index}].status 只能为 skipped 或空`))(nullableString({ max: 20 })(record.status, `meals[${index}].status`)),
      skipReason: record.skipReason === undefined ? null : nullableString({ max: 40 })(record.skipReason, `meals[${index}].skipReason`),
    }
  })
}

export function parseWeekPlanPatch(body: unknown): WeekPlanPatchInput {
  return pickSchema<WeekPlanPatchInput & Record<string, unknown>>(body, {
    name: optional(stringRule({ min: 1, max: 120 })),
    status: optional(stringRule({ min: 1, max: 40 })),
    meals: optional(mealsRule),
  } as any)
}

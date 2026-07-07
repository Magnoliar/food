import { booleanRule, nullableString, numberRule, optional, pickSchema, stringArray, stringRule, validationError } from './validate'

export interface RecipeIngredientInput {
  name: string
  amount?: string | null
  unit?: string | null
  category?: string | null
  optional?: boolean
}

export interface RecipeInput {
  name?: string
  description?: string | null
  category?: string | null
  status?: string
  difficulty?: number
  estimatedTime?: number
  score?: number
  cookCount?: number
  steps?: string[]
  tip?: string | null
  coverColor?: string | null
  coverPhotoUrl?: string | null
  notes?: string | null
  tags?: string[]
  ingredients?: RecipeIngredientInput[]
}

function ingredientsRule(value: unknown): RecipeIngredientInput[] {
  if (!Array.isArray(value)) validationError('ingredients 必须是数组')
  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) validationError(`ingredients[${index}] 必须是对象`)
    const record = item as Record<string, unknown>
    return {
      name: stringRule({ min: 1, max: 80 })(record.name, `ingredients[${index}].name`),
      amount: record.amount === undefined ? null : nullableString({ max: 40 })(record.amount, `ingredients[${index}].amount`),
      unit: record.unit === undefined ? null : nullableString({ max: 20 })(record.unit, `ingredients[${index}].unit`),
      category: record.category === undefined ? null : nullableString({ max: 40 })(record.category, `ingredients[${index}].category`),
      optional: record.optional === undefined ? false : booleanRule()(record.optional, `ingredients[${index}].optional`),
    }
  })
}

export function parseRecipeCreate(body: unknown): RecipeInput & { name: string } {
  return {
    ...parseRecipePatch(body),
    name: stringRule({ min: 1, max: 80 })((body as any)?.name, 'name'),
  }
}

export function parseRecipePatch(body: unknown): RecipeInput {
  return pickSchema<RecipeInput & Record<string, unknown>>(body, {
    name: optional(stringRule({ min: 1, max: 80 })),
    description: optional(nullableString({ max: 500 })),
    category: optional(nullableString({ max: 60 })),
    status: optional(stringRule({ min: 1, max: 40 })),
    difficulty: optional(numberRule({ min: 1, max: 5, int: true })),
    estimatedTime: optional(numberRule({ min: 1, max: 600, int: true })),
    score: optional(numberRule({ min: 0, max: 10 })),
    cookCount: optional(numberRule({ min: 0, max: 9999, int: true })),
    steps: optional(stringArray({ max: 80 })),
    tip: optional(nullableString({ max: 1000 })),
    coverColor: optional(nullableString({ max: 40 })),
    coverPhotoUrl: optional(nullableString({ max: 300 })),
    notes: optional(nullableString({ max: 2000 })),
    tags: optional(stringArray({ max: 30 })),
    ingredients: optional(ingredientsRule),
  } as any)
}

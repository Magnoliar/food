import { nullableString, optional, pickSchema, stringRule } from './validate'

export interface IngredientInput {
  name?: string
  category?: string | null
  family?: string | null
  crayonColor?: string | null
  lineArtUrl?: string | null
}

export function parseIngredientCreate(body: unknown): IngredientInput & { name: string } {
  return {
    ...parseIngredientPatch(body),
    name: stringRule({ min: 1, max: 80 })((body as any)?.name, 'name'),
  }
}

export function parseIngredientPatch(body: unknown): IngredientInput {
  return pickSchema<IngredientInput & Record<string, unknown>>(body, {
    name: optional(stringRule({ min: 1, max: 80 })),
    category: optional(nullableString({ max: 40 })),
    family: optional(nullableString({ max: 40 })),
    crayonColor: optional(nullableString({ max: 40 })),
    lineArtUrl: optional(nullableString({ max: 500 })),
  } as any)
}

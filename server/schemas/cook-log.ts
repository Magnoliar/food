import { dateRule, nullableString, numberRule, optional, pickSchema, stringArray, stringRule } from './validate'

export interface CookLogInput {
  recipeId: string
  userId?: string
  date?: Date
  photos?: string[]
  selfScore?: number
  partnerScore?: number
  selfComment?: string | null
  partnerComment?: string | null
  notes?: string | null
}

export function parseCookLogCreate(body: unknown): CookLogInput {
  return {
    ...pickSchema<CookLogInput & Record<string, unknown>>(body, {
      userId: optional(stringRule({ min: 1, max: 80 })),
      date: optional(dateRule()),
      photos: optional(stringArray({ max: 20 })),
      selfScore: optional(numberRule({ min: 0, max: 10 })),
      partnerScore: optional(numberRule({ min: 0, max: 10 })),
      selfComment: optional(nullableString({ max: 1000 })),
      partnerComment: optional(nullableString({ max: 1000 })),
      notes: optional(nullableString({ max: 2000 })),
    } as any),
    recipeId: stringRule({ min: 1 })((body as any)?.recipeId, 'recipeId'),
  }
}

export function parseCookLogPatch(body: unknown): Partial<CookLogInput> {
  return pickSchema<Partial<CookLogInput> & Record<string, unknown>>(body, {
    date: optional(dateRule()),
    photos: optional(stringArray({ max: 20 })),
    selfScore: optional(numberRule({ min: 0, max: 10 })),
    partnerScore: optional(numberRule({ min: 0, max: 10 })),
    selfComment: optional(nullableString({ max: 1000 })),
    partnerComment: optional(nullableString({ max: 1000 })),
    notes: optional(nullableString({ max: 2000 })),
  } as any)
}

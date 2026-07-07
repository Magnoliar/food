import { describe, expect, it } from 'vitest'
import { parseCookLogCreate } from '../../server/schemas/cook-log'
import { parseRecipeCreate } from '../../server/schemas/recipe'
import { parseShoppingItemPatch } from '../../server/schemas/shopping-list'
import { dateRule, numberRule, objectBody, stringArray, stringRule } from '../../server/schemas/validate'
import { serializeWeekPlan } from '../../server/serializers/week-plan'

describe('schema validation helpers', () => {
  it('trims valid strings', () => {
    expect(stringRule({ min: 1, max: 10 })('  番茄  ', 'name')).toBe('番茄')
  })

  it('rejects out-of-range numbers', () => {
    expect(() => numberRule({ min: 0, max: 10 })(11, 'score')).toThrow()
  })

  it('rejects non-object request bodies', () => {
    expect(() => objectBody(null)).toThrow()
    expect(() => objectBody([])).toThrow()
  })

  it('coerces valid dates and rejects invalid dates', () => {
    expect(dateRule()('2026-06-08', 'date')).toBeInstanceOf(Date)
    expect(() => dateRule()('not-a-date', 'date')).toThrow()
  })

  it('validates string arrays with item trimming', () => {
    expect(stringArray({ max: 2 })([' 快手 ', '清淡'], 'tags')).toEqual(['快手', '清淡'])
    expect(() => stringArray({ max: 1 })(['a', 'b'], 'tags')).toThrow()
    expect(() => stringArray()([''], 'tags')).toThrow()
  })
})

describe('business schemas', () => {
  it('parses recipe creation with normalized nested fields', () => {
    const recipe = parseRecipeCreate({
      name: '  番茄炒蛋  ',
      score: '8.5',
      tags: [' 家常菜 '],
      ingredients: [{ name: ' 番茄 ', amount: '2', unit: '个', optional: false }],
    })

    expect(recipe.name).toBe('番茄炒蛋')
    expect(recipe.score).toBe(8.5)
    expect(recipe.tags).toEqual(['家常菜'])
    expect(recipe.ingredients?.[0]).toMatchObject({ name: '番茄', amount: '2', unit: '个' })
  })

  it('rejects invalid cook log scores', () => {
    expect(() => parseCookLogCreate({ recipeId: 'r1', selfScore: 11 })).toThrow()
  })

  it('parses shopping item patch booleans strictly', () => {
    expect(parseShoppingItemPatch({ checked: true, inStock: false })).toEqual({ checked: true, inStock: false })
    expect(() => parseShoppingItemPatch({ checked: 'yes' })).toThrow()
  })
})

describe('week plan serialization', () => {
  it('keeps Friday without bento and weekend lunch before dinner', () => {
    const plan = serializeWeekPlan({
      id: 'wp',
      name: '本轮计划',
      startDate: new Date('2026-06-09T00:00:00'),
      endDate: new Date('2026-06-15T00:00:00'),
      status: 'active',
      weekKey: '2026-06-09',
      meals: [
        { id: 'sat-dinner', date: new Date('2026-06-13T00:00:00'), mealLabel: '晚餐', recipeId: null, customName: '' },
        { id: 'sat-lunch', date: new Date('2026-06-13T00:00:00'), mealLabel: '午餐', recipeId: null, customName: '' },
        { id: 'fri-dinner', date: new Date('2026-06-12T00:00:00'), mealLabel: '晚餐', recipeId: null, customName: '' },
      ],
      shoppingLists: [],
    })

    expect(plan?.startDate).toBe('2026-06-09')
    expect(plan?.endDate).toBe('2026-06-15')
    expect(plan?.meals.find((meal: any) => meal.date === '2026-06-12')?.meal2).toBeNull()
    const saturday = plan?.meals.find((meal: any) => meal.date === '2026-06-13')
    expect(saturday?.dayLabel).toBe('周六')
    expect(saturday?.meal1?.label).toBe('午餐')
    expect(saturday?.meal2?.label).toBe('晚餐')
  })
})

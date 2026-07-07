import { describe, expect, it } from 'vitest'

// Test the JSON parsing and validation patterns used by AI endpoints

function parseAIJson(raw: string): unknown {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

function parseAITips(raw: string, stepCount: number): string[] {
  try {
    const parsed = parseAIJson(raw)
    if (!Array.isArray(parsed)) return Array(stepCount).fill('')
    return parsed.map((tip: unknown) => typeof tip === 'string' ? tip : '')
  } catch {
    return Array(stepCount).fill('')
  }
}

function parseAISubstitutes(raw: string): Array<{ substitute: string; note: string }> {
  try {
    const parsed = parseAIJson(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s: any) => s?.substitute).slice(0, 2)
  } catch {
    return []
  }
}

function validateRecipeWarnings(recipe: Record<string, unknown>): string[] {
  const warnings: string[] = []
  const ings = recipe.ingredients as any[] | undefined
  const steps = recipe.steps as string[] | undefined
  if (!ings || ings.length < 2) warnings.push('ingredients_insufficient')
  if (!steps || steps.length < 2) warnings.push('steps_insufficient')
  const diff = recipe.difficulty as number | undefined
  if (diff && (diff < 1 || diff > 5)) warnings.push('difficulty_out_of_range')
  const time = recipe.estimatedTime as number | undefined
  if (time !== undefined && time <= 0) warnings.push('time_invalid')
  return warnings
}

describe('AI JSON parsing', () => {
  it('strips markdown code fences', () => {
    const result = parseAIJson('```json\n{"a":1}\n```')
    expect(result).toEqual({ a: 1 })
  })

  it('handles plain JSON', () => {
    const result = parseAIJson('{"a":1}')
    expect(result).toEqual({ a: 1 })
  })

  it('throws on invalid JSON', () => {
    expect(() => parseAIJson('not json')).toThrow()
  })
})

describe('AI step-tips parsing', () => {
  it('returns tips array matching step count', () => {
    const tips = parseAITips('["火大一些", "蛋液要打散"]', 2)
    expect(tips).toEqual(['火大一些', '蛋液要打散'])
  })

  it('returns empty strings on non-array response', () => {
    const tips = parseAITips('{"error":"bad"}', 3)
    expect(tips).toEqual(['', '', ''])
  })

  it('returns empty strings on invalid JSON', () => {
    const tips = parseAITips('not json', 2)
    expect(tips).toEqual(['', ''])
  })

  it('filters non-string values', () => {
    const tips = parseAITips('[123, "good", null]', 3)
    expect(tips).toEqual(['', 'good', ''])
  })
})

describe('AI substitute parsing', () => {
  it('returns substitutes with substitute field', () => {
    const subs = parseAISubstitutes('[{"substitute":"生抽","note":"比例1:1"},{"substitute":"酱油","note":""}]')
    expect(subs).toHaveLength(2)
    expect(subs[0]!.substitute).toBe('生抽')
  })

  it('filters items without substitute field', () => {
    const subs = parseAISubstitutes('[{"note":"no sub"},{"substitute":"生抽","note":"ok"}]')
    expect(subs).toHaveLength(1)
    expect(subs[0]!.substitute).toBe('生抽')
  })

  it('caps at 2 results', () => {
    const subs = parseAISubstitutes('[{"substitute":"a","note":""},{"substitute":"b","note":""},{"substitute":"c","note":""}]')
    expect(subs).toHaveLength(2)
  })

  it('returns empty array on invalid JSON', () => {
    expect(parseAISubstitutes('bad')).toEqual([])
  })
})

describe('AI recipe quality warnings', () => {
  it('warns on insufficient ingredients', () => {
    const warnings = validateRecipeWarnings({ ingredients: [{ name: '番茄' }], steps: ['切', '炒'], difficulty: 3, estimatedTime: 15 })
    expect(warnings).toContain('ingredients_insufficient')
  })

  it('warns on insufficient steps', () => {
    const warnings = validateRecipeWarnings({ ingredients: [{ name: '番茄' }, { name: '蛋' }], steps: ['炒'], difficulty: 3, estimatedTime: 15 })
    expect(warnings).toContain('steps_insufficient')
  })

  it('warns on invalid difficulty', () => {
    const warnings = validateRecipeWarnings({ ingredients: [{ name: 'a' }, { name: 'b' }], steps: ['s1', 's2'], difficulty: 7, estimatedTime: 15 })
    expect(warnings).toContain('difficulty_out_of_range')
  })

  it('warns on invalid time', () => {
    const warnings = validateRecipeWarnings({ ingredients: [{ name: 'a' }, { name: 'b' }], steps: ['s1', 's2'], difficulty: 3, estimatedTime: 0 })
    expect(warnings).toContain('time_invalid')
  })

  it('returns no warnings for valid recipe', () => {
    const warnings = validateRecipeWarnings({ ingredients: [{ name: '番茄' }, { name: '蛋' }], steps: ['切', '炒'], difficulty: 3, estimatedTime: 15 })
    expect(warnings).toEqual([])
  })
})

import type { Recipe, RecipeIngredient, RecipeUpdateInput } from '~/types'

export interface RecipeFormModel {
  description: string
  category: string
  difficulty: number
  estimatedTime: number
  ingredients: RecipeIngredient[]
  steps: string[]
  tip: string
  tags: string[]
  coverPhotoUrl: string
}

export interface RecipeFormValidation {
  valid: boolean
  errors: string[]
}

export function createRecipeForm(source?: Partial<Recipe | RecipeUpdateInput>): RecipeFormModel {
  return {
    description: source?.description || '',
    category: source?.category || '',
    difficulty: clampNumber(source?.difficulty, 1, 5, 3),
    estimatedTime: clampNumber(source?.estimatedTime, 1, 1440, 30),
    ingredients: (source?.ingredients || []).map(item => ({
      name: item.name || '',
      amount: item.amount == null ? '' : String(item.amount),
      unit: item.unit || '',
      optional: Boolean(item.optional),
      ingredientId: item.ingredientId,
      category: item.category,
    })),
    steps: Array.isArray(source?.steps) ? source.steps.map(step => String(step)) : [],
    tip: source?.tip || '',
    tags: Array.isArray(source?.tags) ? source.tags.map(tag => String(tag)) : [],
    coverPhotoUrl: source?.coverPhotoUrl || '',
  }
}

export function normalizeRecipeForm(form: RecipeFormModel) {
  return {
    description: form.description.trim(),
    category: form.category.trim(),
    difficulty: clampNumber(form.difficulty, 1, 5, 3),
    estimatedTime: clampNumber(form.estimatedTime, 1, 1440, 30),
    ingredients: form.ingredients
      .map(item => ({ ...item, name: item.name.trim(), amount: item.amount?.trim() || '', unit: item.unit?.trim() || '' }))
      .filter(item => item.name),
    steps: form.steps.map(step => step.trim()).filter(Boolean),
    tip: form.tip.trim(),
    tags: [...new Set(form.tags.map(tag => tag.trim()).filter(Boolean))],
    coverPhotoUrl: form.coverPhotoUrl.trim(),
  }
}

export function validateRecipeForm(name: string, form: RecipeFormModel): RecipeFormValidation {
  const normalized = normalizeRecipeForm(form)
  const errors: string[] = []
  if (!name.trim()) errors.push('请先填写菜名。')
  if (!normalized.ingredients.length) errors.push('至少填写一种食材。')
  if (!normalized.steps.length) errors.push('至少填写一个做法步骤。')
  if (normalized.estimatedTime < 1) errors.push('预估时间需要大于 0 分钟。')
  return { valid: errors.length === 0, errors }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, Math.round(number)))
}

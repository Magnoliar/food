import { serializeCookLog } from './cook-log'
import { safeJsonParse } from '../utils/parse-json'

export function serializeRecipe(recipe: any) {
  return {
    ...recipe,
    steps: safeJsonParse(recipe.steps, []),
    tags: Array.isArray(recipe.tags) ? recipe.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.name) : [],
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map((ri: any) => ({
          ingredientId: ri.ingredientId,
          name: ri.ingredient?.name || ri.name || ri.ingredientId,
          amount: ri.amount,
          unit: ri.unit,
          category: ri.ingredient?.category || ri.category || null,
          optional: Boolean(ri.optional),
          lineArtUrl: ri.ingredient?.lineArtUrl || null,
        }))
      : [],
    cookLogs: Array.isArray(recipe.cookLogs)
      ? recipe.cookLogs.map((log: any) => serializeCookLog(log))
      : undefined,
  }
}

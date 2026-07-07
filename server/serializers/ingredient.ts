export function serializeIngredient(ingredient: any) {
  return {
    ...ingredient,
    tags: Array.isArray(ingredient.tags) ? ingredient.tags.map((tag: any) => tag.name) : [],
    usedIn: Array.isArray(ingredient.recipeIngredients)
      ? ingredient.recipeIngredients.map((ri: any) => ri.recipe?.name).filter(Boolean)
      : [],
  }
}

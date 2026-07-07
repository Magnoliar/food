export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const ingredient = await prisma.ingredient.findUnique({
    where: { id },
    include: {
      tags: true,
      recipeIngredients: {
        include: { recipe: { select: { id: true, name: true, score: true } } },
      },
      substitutes: { select: { id: true, name: true } },
    },
  })

  if (!ingredient) throw createError({ statusCode: 404, message: '食材不存在' })

  return {
    ...ingredient,
    tags: ingredient.tags.map(t => t.name),
    usedIn: ingredient.recipeIngredients.map(ri => ({
      id: ri.recipe.id,
      name: ri.recipe.name,
      score: ri.recipe.score,
    })),
    substitutes: ingredient.substitutes.map(s => s.name),
    recipeCount: ingredient.recipeIngredients.length,
  }
})

export default defineEventHandler(async () => {
  const ingredients = await prisma.ingredient.findMany({
    include: {
      tags: true,
      recipeIngredients: {
        include: { recipe: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  return ingredients.map(i => ({
    ...i,
    tags: i.tags.map(t => t.name),
    usedIn: i.recipeIngredients.map(ri => ri.recipe.id),
    recipeCount: i.recipeIngredients.length,
  }))
})

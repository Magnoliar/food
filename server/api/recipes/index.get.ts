import { serializeRecipe } from '../../serializers/recipe'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async () => {
  const recipes = await prisma.recipe.findMany({
    include: {
      tags: true,
      ingredients: {
        include: { ingredient: true },
      },
    },
    orderBy: { score: 'desc' },
  })

  return recipes.map(serializeRecipe)
})

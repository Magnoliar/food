import { serializeRecipe } from '../../serializers/recipe'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      tags: true,
      ingredients: {
        include: { ingredient: true },
      },
      cookLogs: {
        orderBy: { date: 'desc' },
        take: 10,
      },
    },
  })

  if (!recipe) {
    throw createError({ statusCode: 404, message: '菜谱不存在' })
  }

  return serializeRecipe(recipe)
})

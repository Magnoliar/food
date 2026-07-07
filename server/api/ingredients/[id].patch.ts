import { parseIngredientPatch } from '../../schemas/ingredient'
import { serializeIngredient } from '../../serializers/ingredient'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = parseIngredientPatch(await readBody(event))

  try {
    const ingredient = await prisma.ingredient.update({ where: { id }, data: body })
    return serializeIngredient(ingredient)
  } catch (e: any) {
    if (e?.code === 'P2025') throw createError({ statusCode: 404, message: '食材不存在' })
    throw createError({ statusCode: 500, message: '操作失败' })
  }
})

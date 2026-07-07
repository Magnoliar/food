import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '缺少记录 ID' })

  try {
    await prisma.$transaction(async (tx) => {
      const log = await tx.cookLog.delete({ where: { id } })
      await tx.recipe.update({
        where: { id: log.recipeId },
        data: { cookCount: { decrement: 1 } },
      })
    })
    return { ok: true }
  } catch (e: any) {
    if (e?.code === 'P2025') throw createError({ statusCode: 404, message: '烹饪记录不存在' })
    throw createError({ statusCode: 500, message: '操作失败' })
  }
})

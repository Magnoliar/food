import { prisma } from '../../../utils/prisma'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '缺少周计划 ID' })
  try {
    return await prisma.weekPlan.update({ where: { id }, data: { status: 'archived' } })
  } catch (e: any) {
    if (e?.code === 'P2025') throw createError({ statusCode: 404, message: '周计划不存在' })
    throw createError({ statusCode: 500, message: '归档失败' })
  }
})

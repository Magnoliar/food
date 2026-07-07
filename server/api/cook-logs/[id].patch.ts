import { parseCookLogPatch } from '../../schemas/cook-log'
import { serializeCookLog } from '../../serializers/cook-log'
import { recordAchievementEvent } from '../../services/achievement'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '缺少记录 ID' })

  const body = parseCookLogPatch(await readBody(event))
  const data: any = { ...body }
  if (body.photos !== undefined) data.photos = JSON.stringify(body.photos)

  try {
    const log = await prisma.cookLog.update({
      where: { id },
      data,
      include: {
        recipe: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    })

    if ((body.photos || []).length > 0) {
      await recordAchievementEvent('photo_uploaded', event.context.authUser?.id || log.userId, log.id)
    }

    return serializeCookLog(log)
  } catch (e: any) {
    if (e?.code === 'P2025') throw createError({ statusCode: 404, message: '做饭记录不存在' })
    throw createError({ statusCode: 500, message: '操作失败' })
  }
})

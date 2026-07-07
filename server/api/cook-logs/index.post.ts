import { parseCookLogCreate } from '../../schemas/cook-log'
import { serializeCookLog } from '../../serializers/cook-log'
import { recordAchievementEvent } from '../../services/achievement'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const body = parseCookLogCreate(await readBody(event))

  const recipe = await prisma.recipe.findUnique({ where: { id: body.recipeId } })
  if (!recipe) {
    throw createError({ statusCode: 404, message: '菜谱不存在' })
  }

  const authUser = requireAuth(event)
  const userId = authUser.id

  await prisma.user.upsert({
    where: { id: userId },
    update: { name: authUser.name, role: authUser.role },
    create: { id: userId, name: authUser.name, role: authUser.role },
  })

  const log = await prisma.$transaction(async (tx) => {
    const created = await tx.cookLog.create({
      data: {
        recipeId: body.recipeId,
        userId,
        date: body.date || new Date(),
        photos: JSON.stringify(body.photos || []),
        selfScore: body.selfScore,
        partnerScore: body.partnerScore,
        selfComment: body.selfComment,
        partnerComment: body.partnerComment,
        notes: body.notes,
      },
      include: {
        recipe: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    })

    await tx.recipe.update({
      where: { id: body.recipeId },
      data: { cookCount: { increment: 1 } },
    })

    return created
  })

  await recordAchievementEvent('cook_log_created', userId, log.id)
  if ((body.photos || []).length > 0) await recordAchievementEvent('photo_uploaded', userId, log.id)

  return serializeCookLog(log)
})

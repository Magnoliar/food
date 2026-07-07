import { prisma } from '../utils/prisma'

const DEFAULT_ACHIEVEMENTS = [
  { code: 'first_recipe', name: '第一道菜', description: '新增了第一道家庭菜谱', icon: 'book' },
  { code: 'first_cook', name: '第一次开火', description: '记录了第一次做饭', icon: 'flame' },
  { code: 'first_photo', name: '有图有真相', description: '上传了第一张成品照片', icon: 'camera' },
  { code: 'shopping_done', name: '采购完成', description: '完成了一次购物清单', icon: 'check' },
  { code: 'ai_helper', name: '智能参谋', description: '使用了一次智能推荐', icon: 'sparkles' },
]

export async function ensureAchievements() {
  for (const item of DEFAULT_ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: item.code },
      update: item,
      create: item,
    })
  }
}

async function unlock(code: string, userId?: string | null) {
  await ensureAchievements()
  const achievement = await prisma.achievement.findUnique({ where: { code } })
  if (!achievement) return
  await prisma.userAchievement.upsert({
    where: {
      achievementId_userId: {
        achievementId: achievement.id,
        userId: userId || 'household',
      },
    },
    update: {},
    create: {
      achievementId: achievement.id,
      userId: userId || 'household',
    },
  })
}

export async function recordAchievementEvent(eventType: string, userId?: string | null, refKey?: string | null) {
  try {
    await prisma.achievementEvent.create({
      data: {
        eventType,
        userId: userId || null,
        refKey: refKey || null,
      },
    })

    if (eventType === 'recipe_created') await unlock('first_recipe', userId)
    if (eventType === 'cook_log_created') await unlock('first_cook', userId)
    if (eventType === 'photo_uploaded') await unlock('first_photo', userId)
    if (eventType === 'shopping_list_completed') await unlock('shopping_done', userId)
    if (eventType === 'recommendation_used') await unlock('ai_helper', userId)
  } catch (error) {
    console.warn('Achievement event failed:', error)
  }
}

export async function listAchievements(userId?: string | null) {
  await ensureAchievements()
  const achievements = await prisma.achievement.findMany({
    orderBy: { code: 'asc' },
    include: {
      users: true,
    },
  })

  return achievements.map(item => ({
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description,
    icon: item.icon,
    unlocked: item.users.some(user => user.userId === (userId || 'household') || user.userId === 'household'),
    unlockedAt: item.users.find(user => user.userId === (userId || 'household') || user.userId === 'household')?.unlockedAt || null,
  }))
}

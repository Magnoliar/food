import { serializeShoppingList } from '../serializers/week-plan'
import { recordAchievementEvent } from './achievement'
import { prisma } from '../utils/prisma'

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, '')
}

function amountText(amount?: string | null, unit?: string | null) {
  return `${amount || ''}${unit || ''}`.trim()
}

function mergeAmount(existing?: string | null, next?: string | null) {
  if (!existing) return next || null
  if (!next || existing === next) return existing
  const parts = new Set(existing.split('、').concat(next.split('、')).map(s => s.trim()).filter(Boolean))
  return Array.from(parts).join('、')
}

function classify(name: string, fallback?: string | null) {
  if (fallback) return fallback
  if (/[鱼虾蟹贝蛤]/.test(name)) return '海鲜水产'
  if (/[肉鸡鸭牛羊猪蛋]/.test(name)) return '肉禽蛋品'
  if (/[奶酪芝士黄油]/.test(name)) return '乳品'
  if (/[米面粉粉丝面条饼]/.test(name)) return '主食厨房'
  if (/[盐糖酱醋油粉料香]/.test(name)) return '调味干货'
  return '蔬菜菌菇'
}

function findRecipeByLooseName(recipes: any[], name?: string | null) {
  const normalized = normalizeName(name || '')
  if (!normalized) return null

  const exact = recipes.find(recipe => normalizeName(recipe.name) === normalized)
  if (exact) return exact

  if (normalized.length < 2) return null
  return recipes.find((recipe) => {
    const recipeName = normalizeName(recipe.name)
    return recipeName.includes(normalized) || normalized.includes(recipeName)
  }) || null
}

async function findOrCreateList(weekPlanId: string) {
  const plan = await prisma.weekPlan.findUnique({
    where: { id: weekPlanId },
    include: {
      meals: {
        include: {
          recipe: {
            include: {
              ingredients: { include: { ingredient: true } },
            },
          },
        },
      },
      shoppingLists: {
        include: { items: true },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
  })
  if (!plan) throw createError({ statusCode: 404, message: '周计划不存在' })

  const existing = plan.shoppingLists[0]
  if (existing) return { plan, list: existing }

  const list = await prisma.shoppingList.create({
    data: {
      weekPlanId: plan.id,
      name: `${plan.name}购物清单`,
      startDate: plan.startDate,
      endDate: plan.endDate,
    },
    include: { items: true },
  })
  return { plan, list }
}

export async function buildShoppingListFromWeekPlan(weekPlanId: string) {
  const { plan, list } = await findOrCreateList(weekPlanId)
  const existingByName = new Map(list.items.map(item => [normalizeName(item.name), item]))
  const [allRecipes, fridgeItems] = await Promise.all([
    prisma.recipe.findMany({
      include: {
        ingredients: { include: { ingredient: true } },
      },
    }),
    prisma.fridgeItem.findMany(),
  ])
  const fridgeNames = new Set(fridgeItems.map(item => normalizeName(item.name)))
  const generated = new Map<string, { name: string; amount: string | null; category: string; source: string }>()

  for (const meal of plan.meals) {
    if (meal.status === 'skipped') continue
    const recipe = meal.recipe || findRecipeByLooseName(allRecipes, meal.customName) || null
    if (!recipe) continue
    for (const recipeIngredient of recipe.ingredients) {
      const ingredient = recipeIngredient.ingredient
      const key = normalizeName(ingredient.name)
      const current = generated.get(key)
      generated.set(key, {
        name: ingredient.name,
        amount: mergeAmount(current?.amount, amountText(recipeIngredient.amount, recipeIngredient.unit)),
        category: classify(ingredient.name, ingredient.category),
        source: [current?.source, recipe.name].filter(Boolean).join('、'),
      })
    }
  }

  for (const item of generated.values()) {
    const existing = existingByName.get(normalizeName(item.name))
    const inStock = fridgeNames.has(normalizeName(item.name))
    if (existing) {
      // 手动添加的项只更新 inStock，不覆盖 amount/category/source/manual
      if (existing.manual) {
        await prisma.shoppingListItem.update({
          where: { id: existing.id },
          data: { inStock },
        })
      } else {
        await prisma.shoppingListItem.update({
          where: { id: existing.id },
          data: {
            amount: item.amount,
            category: item.category,
            source: item.source,
            inStock,
            manual: false,
          },
        })
      }
    } else {
      // 用 upsert 防止并发重复创建
      await prisma.shoppingListItem.upsert({
        where: {
          shoppingListId_name: { shoppingListId: list.id, name: item.name },
        },
        create: {
          shoppingListId: list.id,
          name: item.name,
          amount: item.amount,
          category: item.category,
          source: item.source,
          inStock,
        },
        update: {
          amount: item.amount,
          category: item.category,
          source: item.source,
          inStock,
          manual: false,
        },
      })
    }
  }

  // 清理已移除菜谱对应的过期食材（保留手动添加的项）
  // 仅在有菜谱解析成功时才清理，避免全文字菜单谱误删已有清单
  if (generated.size > 0) {
    const generatedNames = new Set([...generated.keys()])
    const staleItems = list.items.filter(
      item => !item.manual && !generatedNames.has(normalizeName(item.name)),
    )
    if (staleItems.length) {
      await prisma.shoppingListItem.deleteMany({
        where: { id: { in: staleItems.map(i => i.id) } },
      })
    }
  }

  const refreshed = await prisma.shoppingList.findUnique({
    where: { id: list.id },
    include: { items: { orderBy: [{ category: 'asc' }, { name: 'asc' }] } },
  })
  return serializeShoppingList(refreshed)
}

export async function getCurrentShoppingList() {
  // 优先返回当前周计划关联的清单，而非全局最新清单
  const now = new Date()
  const day = now.getDay()
  const diffToTue = (day + 5) % 7
  const start = new Date(now)
  start.setDate(start.getDate() - diffToTue)
  start.setHours(0, 0, 0, 0)
  const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`

  const currentPlan = await prisma.weekPlan.findFirst({
    where: { weekKey: startStr },
    include: {
      shoppingLists: {
        include: { items: { orderBy: [{ category: 'asc' }, { name: 'asc' }] } },
        take: 1,
      },
    },
  })
  if (currentPlan?.shoppingLists?.[0]) {
    return serializeShoppingList(currentPlan.shoppingLists[0])
  }

  // 降级：返回全局最新清单
  const fallback = await prisma.shoppingList.findFirst({
    include: { items: { orderBy: [{ category: 'asc' }, { name: 'asc' }] } },
    orderBy: { updatedAt: 'desc' },
  })
  return fallback ? serializeShoppingList(fallback) : null
}

export async function addManualShoppingItem(input: { name: string; amount?: string | null; category?: string }) {
  let list = await prisma.shoppingList.findFirst({ orderBy: { updatedAt: 'desc' } })
  if (!list) {
    list = await prisma.shoppingList.create({ data: { name: '临时购物清单' } })
  }
  const item = await prisma.shoppingListItem.upsert({
    where: {
      shoppingListId_name: { shoppingListId: list.id, name: input.name },
    },
    create: {
      shoppingListId: list.id,
      name: input.name,
      amount: input.amount || null,
      category: input.category || '临时',
      manual: true,
    },
    update: {
      amount: input.amount || null,
      category: input.category || '临时',
      manual: true,
    },
  })
  return item
}

export async function updateShoppingItem(id: string, data: Record<string, unknown>) {
  const item = await prisma.shoppingListItem.update({ where: { id }, data })
  const list = await prisma.shoppingList.findUnique({
    where: { id: item.shoppingListId },
    include: { items: true },
  })
  if (list?.items.length && list.items.every(i => i.checked)) {
    await recordAchievementEvent('shopping_list_completed', null, list.id)
  }
  return item
}

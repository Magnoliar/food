import { PrismaClient } from '../app/generated/prisma/client.js'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // 0. Clean existing data (for idempotent re-seeding)
  await prisma.mealSlot.deleteMany()
  await prisma.weekPlan.deleteMany()
  await prisma.cookLog.deleteMany()
  await prisma.recipeIngredient.deleteMany()
  await prisma.fridgeItem.deleteMany()
  await prisma.cookingTip.deleteMany()
  // Clear M:N join tables
  await prisma.$executeRaw`DELETE FROM "_RecipeTags"`
  await prisma.$executeRaw`DELETE FROM "_RecipeCollections"`
  await prisma.$executeRaw`DELETE FROM "_IngredientTags"`
  await prisma.$executeRaw`DELETE FROM "_Substitutes"`

  // Save existing lineArtUrl before clearing ingredients
  const existingArt = await prisma.ingredient.findMany({ where: { lineArtUrl: { not: null } }, select: { name: true, lineArtUrl: true } })
  const lineArtMap: Record<string, string> = {}
  for (const ing of existingArt) {
    if (ing.lineArtUrl) lineArtMap[ing.name] = ing.lineArtUrl
  }
  if (Object.keys(lineArtMap).length) console.log(`💾 Preserving ${Object.keys(lineArtMap).length} line art URLs`)

  await prisma.recipe.deleteMany()
  await prisma.ingredient.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.collection.deleteMany()
  await prisma.user.deleteMany()
  console.log('🧹 Existing data cleared')

  // 1. Create users
  await prisma.user.create({
    data: { id: 'user-momo', name: '猪猪', role: 'admin' },
  })
  await prisma.user.create({
    data: { id: 'user-partner', name: '猪宝', role: 'member' },
  })
  console.log('✅ Users created')

  // 2. Load JSON data
  const dataDir = path.resolve(process.cwd(), 'app/data')
  const recipesJson = JSON.parse(fs.readFileSync(path.join(dataDir, 'recipes.json'), 'utf-8'))
  const ingredientsJson = JSON.parse(fs.readFileSync(path.join(dataDir, 'ingredients.json'), 'utf-8'))
  const tipsJson = JSON.parse(fs.readFileSync(path.join(dataDir, 'tips.json'), 'utf-8'))
  const tagsJson = JSON.parse(fs.readFileSync(path.join(dataDir, 'tags.json'), 'utf-8'))

  // 3. Create tags
  const tagMap: Record<string, string> = {}
  for (const tag of tagsJson) {
    const created = await prisma.tag.create({
      data: {
        name: tag.name,
        dimension: tag.dimension,
        color: tag.color || null,
      },
    })
    tagMap[tag.name] = created.id
  }
  console.log(`✅ ${tagsJson.length} tags created`)

  // 4. Create ingredients
  const ingredientMap: Record<string, string> = {}
  for (const ing of ingredientsJson) {
    const created = await prisma.ingredient.create({
      data: {
        name: ing.name,
        category: ing.category,
        family: ing.family || null,
        crayonColor: ing.crayonColor || null,
      },
    })
    ingredientMap[ing.name] = created.id
  }
  console.log(`✅ ${ingredientsJson.length} ingredients created`)

  // Restore preserved lineArtUrl
  let restored = 0
  for (const [name, url] of Object.entries(lineArtMap)) {
    const id = ingredientMap[name]
    if (id) {
      await prisma.ingredient.update({ where: { id }, data: { lineArtUrl: url } })
      restored++
    }
  }
  if (restored) console.log(`🎨 Restored ${restored} line art URLs`)

  // 5. Create recipes with ingredients and tags
  for (const recipe of recipesJson) {
    const ingredientConnections = await Promise.all((recipe.ingredients || []).map(async (ing: any) => {
      let ingId = ingredientMap[ing.name]
      // Auto-create missing ingredients
      if (!ingId) {
        const created = await prisma.ingredient.create({
          data: {
            name: ing.name,
            category: ing.category || null,
            family: ing.family || null,
          },
        })
        ingredientMap[ing.name] = created.id
        ingId = created.id
      }
      return {
        ingredientId: ingId,
        amount: ing.amount != null ? String(ing.amount) : null,
        unit: ing.unit || null,
        optional: ing.optional || false,
      }
    }))

    const tagConnections = (recipe.tags || [])
      .map((tagName: string) => tagMap[tagName] ? { id: tagMap[tagName] } : null)
      .filter(Boolean)

    await prisma.recipe.create({
      data: {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description || null,
        category: recipe.category || null,
        status: recipe.status || 'want_to_make',
        difficulty: recipe.difficulty || 3,
        estimatedTime: recipe.estimatedTime || 30,
        score: recipe.score || 0,
        cookCount: recipe.cookCount || 0,
        steps: JSON.stringify(recipe.steps || []),
        tip: recipe.tip || null,
        ingredients: { create: ingredientConnections },
        tags: { connect: tagConnections },
      },
    })
  }
  console.log(`✅ ${recipesJson.length} recipes created`)

  // 6. Create cooking tips
  for (const tip of tipsJson) {
    await prisma.cookingTip.create({
      data: {
        id: tip.id,
        title: tip.title,
        content: tip.content,
        category: tip.category || null,
      },
    })
  }
  console.log(`✅ ${tipsJson.length} tips created`)

  // 7. Create a sample week plan
  const weekPlan = await prisma.weekPlan.create({
    data: {
      id: 'wp1',
      name: '2026年第23周',
      startDate: new Date('2026-06-02'),
      endDate: new Date('2026-06-08'),
    },
  })

  const mealSlots = [
    { date: '2026-06-02', mealLabel: '晚餐', recipeId: 'r1', customName: null },
    { date: '2026-06-02', mealLabel: '次日便当', recipeId: 'r2', customName: null },
    { date: '2026-06-03', mealLabel: '晚餐', recipeId: 'r2', customName: null },
    { date: '2026-06-03', mealLabel: '次日便当', recipeId: 'r2', customName: null },
    { date: '2026-06-04', mealLabel: '晚餐', recipeId: 'r3', customName: null },
    { date: '2026-06-04', mealLabel: '次日便当', recipeId: 'r3', customName: null },
    { date: '2026-06-05', mealLabel: '晚餐', recipeId: null, customName: '螺蛳粉' },
    { date: '2026-06-06', mealLabel: '午餐', recipeId: null, customName: '' },
    { date: '2026-06-06', mealLabel: '晚餐', recipeId: null, customName: '韩式烤肉' },
    { date: '2026-06-07', mealLabel: '午餐', recipeId: 'r9', customName: null },
    { date: '2026-06-07', mealLabel: '晚餐', recipeId: 'r9', customName: null },
    { date: '2026-06-08', mealLabel: '晚餐', recipeId: null, customName: '' },
    { date: '2026-06-08', mealLabel: '次日便当', recipeId: null, customName: '' },
  ]

  for (const slot of mealSlots) {
    await prisma.mealSlot.create({
      data: {
        weekPlanId: weekPlan.id,
        date: new Date(slot.date),
        mealLabel: slot.mealLabel,
        recipeId: slot.recipeId,
        customName: slot.customName,
      },
    })
  }
  console.log(`✅ Week plan with ${mealSlots.length} meal slots created`)

  // 8. Create fridge items
  const fridgeItems = [
    { name: '牛腩', amount: '500g', zone: 'frozen' },
    { name: '虾仁', amount: '1袋', zone: 'frozen' },
    { name: '鸡腿', amount: '4个', zone: 'frozen' },
    { name: '鸡蛋', amount: '6个', zone: 'refrigerated' },
    { name: '番茄', amount: '3个', zone: 'refrigerated' },
    { name: '五花肉', amount: '300g', zone: 'refrigerated' },
    { name: '牛奶', amount: '1盒', zone: 'refrigerated' },
  ]

  for (const item of fridgeItems) {
    await prisma.fridgeItem.create({ data: item })
  }
  console.log(`✅ ${fridgeItems.length} fridge items created`)

  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

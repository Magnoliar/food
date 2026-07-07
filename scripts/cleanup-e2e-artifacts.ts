import { PrismaClient } from '../app/generated/prisma/client.js'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import 'dotenv/config'

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db'
const adapter = new PrismaBetterSqlite3({ url: dbUrl })
const prisma = new PrismaClient({ adapter })

async function main() {
  const e2eRecipes = await prisma.recipe.findMany({
    where: {
      OR: [
        { name: { contains: 'e2e' } },
        { name: { contains: '????' } },
        { description: { contains: 'e2e' } },
      ],
    },
    select: { id: true },
  })

  if (e2eRecipes.length) {
    await prisma.recipe.deleteMany({ where: { id: { in: e2eRecipes.map(recipe => recipe.id) } } })
  }

  const deletedLogs = await prisma.cookLog.deleteMany({
    where: { notes: { contains: 'e2e' } },
  })

  const orphanE2EIngredients = await prisma.ingredient.findMany({
    where: {
      name: { contains: 'e2e' },
      recipeIngredients: { none: {} },
    },
    select: { id: true, name: true },
  })

  if (orphanE2EIngredients.length) {
    await prisma.ingredient.deleteMany({
      where: { id: { in: orphanE2EIngredients.map(ingredient => ingredient.id) } },
    })
  }

  const orphanE2ETags = await prisma.tag.findMany({
    where: {
      name: { contains: 'e2e' },
      recipes: { none: {} },
      ingredients: { none: {} },
    },
    select: { id: true, name: true },
  })

  if (orphanE2ETags.length) {
    await prisma.tag.deleteMany({
      where: { id: { in: orphanE2ETags.map(tag => tag.id) } },
    })
  }

  const deletedFridgeItems = await prisma.fridgeItem.deleteMany({
    where: { name: { contains: 'e2e' } },
  })

  const deletedShoppingLists = await prisma.shoppingList.deleteMany({
    where: {
      OR: [
        { name: { contains: 'e2e' } },
        { name: { contains: '购物清单' } },
      ],
    },
  })

  console.log(JSON.stringify({
    deletedRecipes: e2eRecipes.length,
    deletedCookLogs: deletedLogs.count,
    deletedIngredients: orphanE2EIngredients.map(ingredient => ingredient.name),
    deletedTags: orphanE2ETags.map(tag => tag.name),
    deletedFridgeItems: deletedFridgeItems.count,
    deletedShoppingLists: deletedShoppingLists.count,
  }, null, 2))
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })

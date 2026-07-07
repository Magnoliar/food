/**
 * 历史数据入库脚本
 * 读取 app/data/import-report.json 中的周菜单和菜谱数据
 * 写入 Prisma 数据库
 *
 * 用法: npx tsx scripts/import-to-db.ts
 */

import { PrismaClient } from '../app/generated/prisma/client.js'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  const reportPath = path.resolve(process.cwd(), 'app/data/import-report.json')

  if (!fs.existsSync(reportPath)) {
    console.log('❌ import-report.json not found. Run import-data.ts first.')
    return
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
  console.log(`📊 Import report: ${report.stats.recipes} recipes, ${report.stats.weekPlans} week plans, ${report.stats.tips} tips`)

  // Import tips
  let tipCount = 0
  for (const tip of report.tips) {
    try {
      await prisma.cookingTip.create({
        data: {
          title: tip.title.slice(0, 100),
          content: tip.content.slice(0, 500),
          category: tip.category || '其他',
        },
      })
      tipCount++
    } catch (e: any) {
      // Skip duplicates
    }
  }
  console.log(`✅ Imported ${tipCount} tips`)

  // Import recipes from import report
  let recipeCount = 0
  for (const recipe of report.recipes) {
    try {
      await prisma.recipe.create({
        data: {
          name: recipe.name,
          description: recipe.name,
          category: recipe.category || '家常菜',
          status: 'made',
          difficulty: 3,
          estimatedTime: 30,
          score: 0,
          cookCount: 0,
          steps: JSON.stringify(recipe.steps || []),
          tip: recipe.tip || '',
        },
      })
      recipeCount++
    } catch (e: any) {
      // Skip duplicates
    }
  }
  console.log(`✅ Imported ${recipeCount} recipes from import report`)

  // Import week plans
  let planCount = 0
  for (const plan of report.weekPlans) {
    try {
      const wp = await prisma.weekPlan.create({
        data: {
          name: `导入数据 ${plan.startDate}`,
          startDate: new Date(plan.startDate),
          endDate: new Date(plan.endDate),
        },
      })

      for (const meal of plan.meals) {
        // Map day names to dates
        const dayMap: Record<string, number> = {
          '周二': 0, '周三': 1, '周四': 2, '周五': 3, '周六': 4, '周日': 5, '周一': 6,
        }
        const dayOffset = dayMap[meal.day] ?? 0
        const date = new Date(plan.startDate)
        date.setDate(date.getDate() + dayOffset)

        await prisma.mealSlot.create({
          data: {
            weekPlanId: wp.id,
            date,
            mealLabel: '晚餐',
            customName: meal.dinner || null,
          },
        })

        if (meal.bento) {
          await prisma.mealSlot.create({
            data: {
              weekPlanId: wp.id,
              date,
              mealLabel: '次日便当',
              customName: meal.bento,
            },
          })
        }
      }
      planCount++
    } catch (e: any) {
      // Skip duplicates
    }
  }
  console.log(`✅ Imported ${planCount} week plans`)

  console.log('\n✨ Import complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

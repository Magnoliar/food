/**
 * 历史数据导入脚本
 * 读取 docs/source/ac/ 目录下所有 .md 文件，自动分类并提取结构化数据
 *
 * 用法: npx tsx scripts/import-data.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const AC_DIR = path.resolve(process.cwd(), 'docs/source/ac')
const OUTPUT_DIR = path.resolve(process.cwd(), 'app/data')

interface ExtractedRecipe {
  name: string
  source: string
  ingredients: Array<{ name: string; amount: string; unit: string; category: string }>
  steps: string[]
  tip: string
  score: number
  category: string
  tags: string[]
}

interface ExtractedWeekPlan {
  startDate: string
  endDate: string
  meals: Array<{ day: string; dinner: string; bento: string }>
  shoppingList: Record<string, Array<{ name: string; amount: string }>>
}

// Classify a note by content patterns
function classifyNote(content: string): 'week_plan' | 'recipe' | 'tip' | 'other' {
  const hasTable = content.includes('|') && content.includes('---')
  const hasDate = /周[一二三四五六日]/.test(content)
  const hasShoppingList = /采买|购物清单|盒马/.test(content)
  const hasRecipeSteps = /做法|步骤|材料|配方/.test(content)
  const hasIngredients = /\d+\s*(g|ml|个|根|块|袋|勺|份)/.test(content)

  if (hasTable && hasDate && hasShoppingList) return 'week_plan'
  if (hasRecipeSteps && hasIngredients) return 'recipe'
  if (content.length < 500 && !hasTable) return 'tip'
  return 'other'
}

// Extract week plan from structured markdown
function extractWeekPlan(content: string, filename: string): ExtractedWeekPlan | null {
  const days = ['周二', '周三', '周四', '周五', '周六', '周日', '周一']
  const meals: Array<{ day: string; dinner: string; bento: string }> = []

  // Try to parse table rows
  const lines = content.split('\n')
  for (const line of lines) {
    if (!line.includes('|')) continue
    const cells = line.split('|').map(c => c.trim()).filter(Boolean)
    if (cells.length < 2) continue

    for (const day of days) {
      if (cells.some(c => c.includes(day))) {
        const dinner = cells.length > 1 ? cells[1].replace(/\*\*/g, '').trim() : ''
        const bento = cells.length > 2 ? cells[2].replace(/\*\*/g, '').trim() : ''
        if (dinner && dinner !== day) {
          meals.push({ day, dinner, bento: bento !== '-' ? bento : '' })
        }
      }
    }
  }

  // Extract shopping list items
  const shoppingList: Record<string, Array<{ name: string; amount: string }>> = {}
  let currentCategory = ''
  for (const line of lines) {
    const catMatch = line.match(/\*\*(.+?)\*\*|【(.+?)】/)
    if (catMatch) {
      currentCategory = (catMatch[1] || catMatch[2] || '').replace(/[【】\[\]]/g, '').trim()
    }
    const itemMatch = line.match(/[-*]\s*\[[ x]\]\s*\*\*(.+?)\*\*\s*\((.+?)\)/)
    if (itemMatch && currentCategory) {
      if (!shoppingList[currentCategory]) shoppingList[currentCategory] = []
      shoppingList[currentCategory].push({
        name: itemMatch[1].trim(),
        amount: itemMatch[2].trim(),
      })
    }
  }

  if (meals.length === 0) return null

  // Estimate date from filename timestamp
  const ts = filename.match(/note-\d+-(\d+)\.md/)
  const date = ts ? new Date(parseInt(ts[1])) : new Date()

  return {
    startDate: date.toISOString().split('T')[0],
    endDate: new Date(date.getTime() + 6 * 86400000).toISOString().split('T')[0],
    meals,
    shoppingList,
  }
}

// Extract recipe from structured markdown
function extractRecipe(content: string, filename: string): ExtractedRecipe | null {
  const lines = content.split('\n')

  // Try to find recipe name (first heading or first bold text)
  let name = ''
  for (const line of lines.slice(0, 5)) {
    const headingMatch = line.match(/^#+\s*(.+)/)
    const boldMatch = line.match(/\*\*(.+?)\*\*/)
    if (headingMatch) { name = headingMatch[1].trim(); break }
    if (boldMatch && boldMatch[1].length < 20) { name = boldMatch[1].trim(); break }
  }

  if (!name || name.length > 30) return null

  // Extract ingredients
  const ingredients: ExtractedRecipe['ingredients'] = []
  for (const line of lines) {
    const ingMatch = line.match(/[-*]\s*(.+?)[:：]\s*(\d+\.?\d*)\s*(g|ml|个|根|块|袋|勺|份|kg|L|杯|片|条)/)
    if (ingMatch) {
      ingredients.push({
        name: ingMatch[1].trim(),
        amount: ingMatch[2],
        unit: ingMatch[3],
        category: guessCategory(ingMatch[1]),
      })
    }
  }

  // Extract steps
  const steps: string[] = []
  let inSteps = false
  for (const line of lines) {
    if (/步骤|做法|Directions|Instructions/i.test(line)) inSteps = true
    if (inSteps) {
      const stepMatch = line.match(/^\d+[.)]\s*(.+)/)
      if (stepMatch) steps.push(stepMatch[1].trim())
    }
  }

  // Extract tip
  let tip = ''
  const tipMatch = content.match(/(?:tip|贴士|秘诀|小贴士|提示)[:：]?\s*(.+)/i)
  if (tipMatch) tip = tipMatch[1].trim().slice(0, 200)

  if (steps.length === 0 && ingredients.length === 0) return null

  return {
    name,
    source: filename,
    ingredients,
    steps,
    tip,
    score: 0,
    category: guessCuisine(name, content),
    tags: guessTags(name, content),
  }
}

function guessCategory(ingredient: string): string {
  const i = ingredient.toLowerCase()
  if (/肉|鸡|鸭|猪|牛|羊|排骨/.test(i)) return '肉禽蛋品'
  if (/鱼|虾|蟹|贝|海鲜/.test(i)) return '海鲜水产'
  if (/姜|蒜|葱|辣椒|花椒|香菜/.test(i)) return '香辛料'
  if (/盐|糖|酱|醋|油|料酒|生抽|老抽|蚝油|豆瓣/.test(i)) return '调味干货'
  if (/米|面|粉|饭/.test(i)) return '主食'
  if (/奶|芝士|黄油|奶油/.test(i)) return '乳品'
  return '蔬菜菌菇'
}

function guessCuisine(name: string, content: string): string {
  const text = name + content
  if (/川|麻辣|辣椒|花椒|豆瓣/.test(text)) return '川菜'
  if (/粤|广式|豉油|白切|煲仔/.test(text)) return '粤菜'
  if (/湘|湖南|剁椒/.test(text)) return '湘菜'
  if (/鲁|山东/.test(text)) return '鲁菜'
  if (/苏|淮扬|糖醋/.test(text)) return '苏菜'
  if (/浙|杭帮|东坡/.test(text)) return '浙菜'
  if (/闽|福建|沙茶/.test(text)) return '闽菜'
  if (/徽|安徽|臭鳜/.test(text)) return '徽菜'
  return '家常菜'
}

function guessTags(name: string, content: string): string[] {
  const tags: string[] = []
  const text = name + content
  if (/辣/.test(text)) tags.push('辣味')
  if (/烤/.test(text)) tags.push('烤')
  if (/炒/.test(text)) tags.push('炒')
  if (/炖|煲/.test(text)) tags.push('炖')
  if (/蒸/.test(text)) tags.push('蒸')
  if (/拌/.test(text)) tags.push('拌')
  if (/汤/.test(text)) tags.push('汤')
  if (/面|粉/.test(text)) tags.push('主食')
  if (/快手|分钟/.test(text)) tags.push('快手')
  if (/便当/.test(text)) tags.push('便当友好')
  return tags
}

// Main
async function main() {
  console.log('📂 Reading docs/source/ac/ directory...')
  const files = fs.readdirSync(AC_DIR).filter(f => f.endsWith('.md'))
  console.log(`   Found ${files.length} markdown files`)

  const recipes: ExtractedRecipe[] = []
  const weekPlans: ExtractedWeekPlan[] = []
  const tips: Array<{ title: string; content: string; category: string; source: string }> = []
  const other: string[] = []

  for (const file of files) {
    const content = fs.readFileSync(path.join(AC_DIR, file), 'utf-8')
    const type = classifyNote(content)

    switch (type) {
      case 'week_plan': {
        const plan = extractWeekPlan(content, file)
        if (plan) weekPlans.push(plan)
        break
      }
      case 'recipe': {
        const recipe = extractRecipe(content, file)
        if (recipe) recipes.push(recipe)
        break
      }
      case 'tip': {
        const firstLine = content.split('\n')[0]?.replace(/^[#*\->\s]+/, '').trim() || file
        tips.push({
          title: firstLine.slice(0, 50),
          content: content.slice(0, 300),
          category: '秘方',
          source: file,
        })
        break
      }
      default:
        other.push(file)
    }
  }

  console.log(`\n📊 Classification results:`)
  console.log(`   Week plans: ${weekPlans.length}`)
  console.log(`   Recipes: ${recipes.length}`)
  console.log(`   Tips: ${tips.length}`)
  console.log(`   Other (skipped): ${other.length}`)

  // Write extracted data
  const output = {
    recipes,
    weekPlans,
    tips,
    skipped: other,
    stats: {
      total: files.length,
      weekPlans: weekPlans.length,
      recipes: recipes.length,
      tips: tips.length,
      skipped: other.length,
    },
  }

  const outputPath = path.join(OUTPUT_DIR, 'import-report.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`\n✅ Import report written to ${outputPath}`)
  console.log(`   Review the report before importing to database.`)
}

main().catch(console.error)

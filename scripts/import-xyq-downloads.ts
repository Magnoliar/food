import { readdirSync, copyFileSync, existsSync, mkdirSync } from 'fs'
import { join, basename } from 'path'
import { PrismaClient } from '../app/generated/prisma/client.js'
import { PrismaBetterSqlite3 } from '@prisma/adapter/better-sqlite3'

// English filename prefix → Chinese ingredient name
const NAME_MAP: Record<string, string> = {
  'asparagus_colo': '芦笋',
  'baby_cabbage_c': '娃娃菜',
  'bacon_colored_': '培根',
  'bamboo_shoot_c': '笋',
  'beef_colored_p': '牛肉',
  'beef_roll_colo': '肥牛',
  'broccoli_color': '西兰花',
  'cabbage_colore': '白菜',
  'cabbage_sketch': '卷心菜',
  'carrot_colored': '胡萝卜',
  'cauliflower_co': '花菜',
  'chestnut_color': '板栗',
  'chili_colored_': '辣椒',
  'cinnamon_pink_': '桂皮',
  'coconut_milk_c': '椰奶',
  'cooking_wine_c': '料酒',
  'cornstarch_col': '淀粉',
  'cream_cheese_c': '奶油奶酪',
  'cream_colored_': '奶油',
  'cumin_powder_c': '孜然粉',
  'curry_cube_col': '咖喱块',
  'curry_powder_c': '咖喱粉',
  'dachshund_colo': '',  // not an ingredient
  'dried_cowpea_c': '干豇豆',
  'dried_cowpea_s': '干豇豆',
  'erjingtiao_col': '二荆条',
  'garlic_sprout_': '蒜苔',
  'green_beans_co': '四季豆',
  'hefen_colored_': '低筋面粉',
  'king_oyster_mu': '杏鲍菇',
  'lettuce_colore': '生菜',
  'low_gluten_flo': '低筋面粉',
  'luosifen_sketc': '螺蛳粉',
  'mirin_colored_': '味醂',
  'mushroom_color': '蘑菇',
  'mustard_colore': '芥末',
  'oil_tofu_color': '油豆腐',
  'olive_oil_colo': '橄榄油',
  'oyster_sauce_c': '蚝油',
  'papaya_colored': '木瓜',
  'parmesan_color': '帕玛森芝士',
  'parsley_colore': '欧芹',
  'passion_fruit_': '百香果',
  'perilla_colore': '紫苏',
  'pickled_pepper': '泡椒',
  'pig_kidney_col': '猪腰',
  'pork_belly_col': '五花肉',
  'pork_shreds_co': '猪肉丝',
  'pork_stomach_c': '猪肚',
  'pork_tenderloi': '猪里脊',
  'potato_colored': '土豆',
  'rice_flour_col': '粘米粉',
  'rice_noodles_c': '米线',
  'sichuan_pepper': '花椒',
  'star_anise_col': '八角',
  'taro_colored_p': '芋头',
  'toast_colored_': '吐司',
  'tofu_colored_p': '豆腐',
  'xiaomi_chili_c': '小米辣',
  'ximi_color_pen': '',  // not an ingredient
}

// Generic pencil filenames → try to match by timestamp order to ingredient list
const GENERIC_PENCIL = ['colored_pencil', 'color_pencil_b', 'color_pencil_d', 'pencil_pasta_1', 'pencil_pasta_2', 'pencil_pasta_3', 'pencil_pasta_4', 'hand_grabbed_p']

async function main() {
  const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' })
  const prisma = new PrismaClient({ adapter })

  const srcDir = 'C:\\Users\\zrhel\\Desktop\\xyq'
  const destDir = join(process.cwd(), 'public', 'line-arts')
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })

  const files = readdirSync(srcDir).filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'))

  // Get all ingredients from DB
  const allIngredients = await prisma.ingredient.findMany({ select: { id: true, name: true, lineArtUrl: true } })
  const ingByName = new Map(allIngredients.map(i => [i.name, i]))

  // Track per-ingredient image counts (from existing files)
  const existingCounts = new Map<string, number>()
  for (const f of readdirSync(destDir).filter(f => f.endsWith('.jpg'))) {
    const name = f.replace(/_[0-9]+\.jpg$/, '')
    existingCounts.set(name, (existingCounts.get(name) || 0) + 1)
  }

  let matched = 0
  let skipped = 0
  let unmapped: string[] = []

  for (const file of files) {
    // Extract prefix (before the timestamp)
    const prefix = file.replace(/\.png_[0-9]+\.jpeg$/, '').replace(/\.png_[0-9]+ \([0-9]+\)\.jpeg$/, '')

    let ingredientName = NAME_MAP[prefix]

    if (ingredientName === undefined) {
      // Unknown prefix
      if (!GENERIC_PENCIL.includes(prefix)) {
        unmapped.push(prefix)
      }
      skipped++
      continue
    }

    if (ingredientName === '') {
      // Explicitly not an ingredient
      skipped++
      continue
    }

    const ing = ingByName.get(ingredientName)
    if (!ing) {
      console.log(`  ✗ ${prefix} → ${ingredientName} (not in DB)`)
      skipped++
      continue
    }

    // Determine filename
    const count = (existingCounts.get(ingredientName) || 0) + 1
    existingCounts.set(ingredientName, count)
    const destName = `${ingredientName}_${count}.jpg`
    const destPath = join(destDir, destName)
    const webPath = `/line-arts/${destName}`

    copyFileSync(join(srcDir, file), destPath)
    matched++
    console.log(`  ✓ ${prefix} → ${ingredientName} (${destName})`)
  }

  // Update database: rebuild lineArtUrl for all affected ingredients
  let dbUpdated = 0
  for (const [name, ing] of ingByName) {
    const jpgFiles = readdirSync(destDir).filter(f => f.startsWith(name + '_') && f.endsWith('.jpg'))
    if (jpgFiles.length > 0) {
      const urls = jpgFiles.sort().map(f => `/line-arts/${f}`)
      await prisma.ingredient.update({
        where: { id: ing.id },
        data: { lineArtUrl: JSON.stringify(urls) },
      })
      dbUpdated++
    }
  }

  console.log(`\nDone: ${matched} copied, ${skipped} skipped, ${dbUpdated} DB updated`)
  if (unmapped.length) console.log(`Unmapped prefixes: ${[...new Set(unmapped)].join(', ')}`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })

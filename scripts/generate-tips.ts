/**
 * 贴士生成脚本
 * 从菜谱数据中提取/生成厨艺贴士
 *
 * 逻辑：
 * 1. 从现有菜谱的 tip 字段提取
 * 2. 按食材/烹饪方式归类
 * 3. 生成通用厨艺知识贴士
 *
 * 用法: npx tsx scripts/generate-tips.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const recipesPath = path.resolve(process.cwd(), 'app/data/recipes.json')
const tipsPath = path.resolve(process.cwd(), 'app/data/tips.json')

// Universal cooking knowledge base
const knowledgeBase = [
  // 肉类
  { title: '牛肉嫩滑秘诀', content: '牛肉逆纹切薄片，加蛋清、淀粉、少许油抓匀腌制15分钟，大火快炒不超过2分钟，口感嫩滑不柴。', category: '秘方', relatedIngredients: ['牛肉', '牛里脊', '牛腩'] },
  { title: '五花肉煸出灵魂', content: '五花肉冷水下锅煮至筷子能插透，捞出放凉切薄片。不粘锅不放油，小火慢煸至边缘微卷、出油，这才是回锅肉的灵魂。', category: '秘方', relatedIngredients: ['五花肉'] },
  { title: '猪蹄去腥三步', content: '猪蹄冷水浸泡30分钟去血水 → 冷水下锅焯水加姜片料酒 → 焯好后温水冲洗干净。三步走完，猪蹄零腥味。', category: '食材特性', relatedIngredients: ['猪蹄'] },
  { title: '排骨焯水用冷水', content: '排骨一定要冷水下锅焯水，热水下锅会让蛋白质瞬间凝固，血水锁在里面，越焯越腥。', category: '食材特性', relatedIngredients: ['排骨'] },

  // 海鲜
  { title: '鱼不破皮的秘诀', content: '煎鱼前用厨房纸彻底擦干表面水分，热锅冷油，撒少许盐在锅底，鱼下锅后不要急着翻面，等3分钟定型再翻。', category: '秘方', relatedIngredients: ['鱼', '鲫鱼', '鲈鱼'] },
  { title: '虾仁弹牙处理', content: '虾仁加少许盐和淀粉轻轻抓匀，静置10分钟后冲洗干净。这一步能让虾仁口感更弹牙。', category: '食材特性', relatedIngredients: ['虾仁', '虾'] },

  // 调味
  { title: '酱油分两次加', content: '炒菜时酱油分两次加：第一次在食材入锅时沿锅边淋入增香，第二次出锅前加提鲜。两次加比一次加味道更有层次。', category: '秘方', relatedIngredients: ['生抽'] },
  { title: '番茄出汁是关键', content: '做番茄类菜品时，番茄一定要先用油炒出汁水再加其他食材。用铲子按压帮助出汁，这是汤汁浓郁的关键。', category: '食材特性', relatedIngredients: ['番茄'] },

  // 烹饪技巧
  { title: '热锅冷油防粘', content: '炒菜前先把空锅烧至冒烟，再倒油润锅，随即下食材。"热锅冷油"是中式炒菜防粘的基本功。', category: '工具技巧', relatedIngredients: [] },
  { title: '炖肉加山楂或茶叶', content: '炖牛肉时加几颗山楂或一小撮茶叶，肉质更软烂，时间缩短三分之一。原理是酸性物质帮助分解蛋白质。', category: '秘方', relatedIngredients: ['牛肉', '牛腩'] },
  { title: '蒸鱼豉油最后淋', content: '清蒸鱼出锅后，倒掉盘中蒸出的腥水，铺上葱姜丝，淋上滚烫的热油激发香味，最后才浇蒸鱼豉油。顺序很重要。', category: '秘方', relatedIngredients: ['鲈鱼', '鱼'] },
  { title: '蒜要最后放', content: '蒜蓉类菜品，蒜蓉不要炒太久。关火前30秒下蒜蓉，利用余温激香，蒜香味最浓郁。炒过头会发苦。', category: '食材特性', relatedIngredients: ['蒜'] },
]

function main() {
  // Load existing recipes
  const recipes = JSON.parse(fs.readFileSync(recipesPath, 'utf-8'))

  // Extract tips from recipes
  const recipeTips = recipes
    .filter((r: any) => r.tip && r.tip.length > 10)
    .map((r: any) => ({
      title: r.name + ' - 小贴士',
      content: r.tip,
      category: '秘方',
      relatedIngredients: r.ingredients?.slice(0, 2).map((i: any) => i.name) || [],
    }))

  // Merge with knowledge base
  const allTips = [...knowledgeBase, ...recipeTips]

  // Deduplicate by title
  const seen = new Set<string>()
  const uniqueTips = allTips.filter(t => {
    if (seen.has(t.title)) return false
    seen.add(t.title)
    return true
  })

  // Add IDs
  const tipsWithIds = uniqueTips.map((t, i) => ({
    id: `tip-gen-${i + 1}`,
    ...t,
  }))

  fs.writeFileSync(tipsPath, JSON.stringify(tipsWithIds, null, 2), 'utf-8')
  console.log(`Generated ${tipsWithIds.length} tips (${knowledgeBase.length} from knowledge base + ${recipeTips.length} from recipes)`)
}

main()

<script setup lang="ts">
const { getRecipes } = useApi()

const recipes = ref<any[]>([])
const tips = ref<any[]>([])
const tagsByDimension = ref<Record<string, any[]>>({})

const searchQuery = ref('')
const selectedTags = ref<string[]>([])
const filterExpanded = ref(false)
const filteredSort = ref('')
const viewMode = ref<'grid' | 'category'>('grid')
const activeCategory = ref('')

const loadPageData = async () => {
  const [recipesResult, tipsResult, tagsResult] = await Promise.allSettled([
    getRecipes(),
    $fetch<any[]>('/api/tips'),
    $fetch<Record<string, any[]>>('/api/tags'),
  ])

  if (recipesResult.status === 'fulfilled' && recipesResult.value) recipes.value = recipesResult.value
  if (tipsResult.status === 'fulfilled' && tipsResult.value) tips.value = tipsResult.value
  if (tagsResult.status === 'fulfilled' && tagsResult.value) tagsByDimension.value = tagsResult.value
}

onMounted(loadPageData)
onServerPrefetch(loadPageData)

const categoryTree = computed(() => {
  const cats: Record<string, { label: string; count: number; children: Record<string, number> }> = {}
  for (const r of recipes.value) {
    const cat = r.category || '其他'
    if (!cats[cat]) cats[cat] = { label: cat, count: 0, children: {} }
    cats[cat].count++
    for (const tag of (r.tags || [])) {
      if (['炒', '炖', '蒸', '烤', '炸', '拌', '煎', '焖'].includes(tag)) {
        cats[cat].children[tag] = (cats[cat].children[tag] || 0) + 1
      }
    }
  }
  return Object.entries(cats)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([key, val]) => ({ key, ...val }))
})

const quickFilters = [
  { label: '最高评分', action: () => { filteredSort.value = filteredSort.value === 'score' ? '' : 'score' } },
  { label: '做过最多', action: () => { filteredSort.value = filteredSort.value === 'cookCount' ? '' : 'cookCount' } },
  { label: '快手菜', action: () => { toggleTag('快手') } },
  { label: '便当友好', action: () => { toggleTag('便当友好') } },
  { label: '下饭菜', action: () => { toggleTag('下饭菜') } },
]

const ingredientFamilyMap: Record<string, string[]> = {
  '猪肉类': ['猪肉', '五花肉', '排骨', '猪里脊', '猪肉末', '猪肉丝', '猪肉片', '猪蹄', '猪肚', '猪腰', '猪肝', '猪小排', '培根', '午餐肉', '腊肠', '肉肠'],
  '牛肉类': ['牛肉', '牛腩', '牛里脊', '肥牛', '黄牛肉'],
  '海鲜类': ['虾', '虾仁', '罗氏虾', '鱼', '鲫鱼', '蟹', '扇贝肉', '黑鱼片', '虾米'],
  '鸡肉类': ['鸡肉', '鸡腿', '三黄鸡', '鸭子', '鸭血'],
  '蔬菜类': ['番茄', '土豆', '白菜', '小白菜', '娃娃菜', '生菜', '青椒', '洋葱', '蘑菇', '口蘑', '杏鲍菇', '豆腐', '嫩豆腐', '黄瓜', '四季豆', '西兰花', '花菜', '胡萝卜', '南瓜', '莴笋', '茄子', '豆芽', '金针菇', '笋'],
  '主食类': ['面条', '米饭', '米线', '意面', '河粉', '粉丝', '螺蛳粉', '吐司', '手抓饼皮', '魔芋丝', '西米', '中筋面粉', '低筋面粉', '粘米粉'],
}

const filteredRecipes = computed(() => {
  let result = recipes.value

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.tags.some((t: string) => t.toLowerCase().includes(q)) ||
      r.ingredients?.some((i: any) => i.name.toLowerCase().includes(q)),
    )
  }

  if (selectedTags.value.length) {
    result = result.filter(r =>
      selectedTags.value.every(tag => {
        if (r.tags.includes(tag)) return true
        const familyKeywords = ingredientFamilyMap[tag]
        if (familyKeywords) {
          return r.ingredients?.some((ing: any) => familyKeywords.some(kw => ing.name.includes(kw)))
        }
        return false
      }),
    )
  }

  if (activeCategory.value) {
    result = result.filter(r => r.category === activeCategory.value)
  }

  if (filteredSort.value === 'score') result = [...result].sort((a, b) => b.score - a.score)
  else if (filteredSort.value === 'cookCount') result = [...result].sort((a, b) => b.cookCount - a.cookCount)

  return result
})

const listWithTips = computed(() => {
  const items: Array<{ type: 'recipe' | 'tip'; data: any }> = []
  filteredRecipes.value.forEach((r, i) => {
    items.push({ type: 'recipe', data: r })
    if ((i + 1) % 5 === 0 && tips.value[Math.floor(i / 5)]) {
      items.push({ type: 'tip', data: tips.value[Math.floor(i / 5)] })
    }
  })
  return items
})

const toggleTag = (tagName: string) => {
  const idx = selectedTags.value.indexOf(tagName)
  if (idx >= 0) selectedTags.value.splice(idx, 1)
  else selectedTags.value.push(tagName)
}

const clearTags = () => {
  selectedTags.value = []
  filteredSort.value = ''
}

const randomRecipe = () => {
  const pool = filteredRecipes.value.length ? filteredRecipes.value : recipes.value
  if (!pool.length) return
  const r = pool[Math.floor(Math.random() * pool.length)]
  navigateTo(`/recipes/${r.id}`)
}

const libraryStats = computed(() => {
  const rs = recipes.value
  const totalCooked = rs.reduce((s: number, r: any) => s + (r.cookCount || 0), 0)
  const avgScore = rs.length ? (rs.reduce((s: number, r: any) => s + (r.score || 0), 0) / rs.length).toFixed(1) : '0'
  const topCuisine = (() => {
    const counts: Record<string, number> = {}
    rs.forEach((r: any) => { if (r.category) counts[r.category] = (counts[r.category] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'
  })()
  const favorite = rs.reduce((best: any, r: any) => (!best || r.cookCount > best.cookCount) ? r : best, null)
  return { total: rs.length, totalCooked, avgScore, topCuisine, favorite: favorite?.name || '-' }
})
</script>

<template>
  <div class="animate-fade-in">
    <div class="flex items-end justify-between mb-6">
      <div>
        <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-1 font-sans">Recipe Collection</p>
        <h1 class="text-3xl lg:text-4xl font-serif font-bold text-[#1a1714]">菜谱库</h1>
      </div>
      <div class="flex gap-2">
        <button
          class="flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-[#8B7D6B] hover:text-[#1a1714] hover:border-gray-400 transition-all text-sm"
          @click="randomRecipe"
        >随机一道</button>
        <NuxtLink to="/recipes/new" class="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C06030] text-white hover:bg-[#A85028] transition-all text-sm shadow-sm">
          新建菜谱
        </NuxtLink>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
        <p class="font-mono text-xl font-bold text-[#1a1714]">{{ libraryStats.total }}</p>
        <p class="text-[10px] font-bold text-[#A69080] uppercase tracking-widest">总菜谱</p>
      </div>
      <div class="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
        <p class="font-mono text-xl font-bold text-[#1a1714]">{{ libraryStats.totalCooked }}</p>
        <p class="text-[10px] font-bold text-[#A69080] uppercase tracking-widest">总烹饪次数</p>
      </div>
      <div class="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
        <p class="font-mono text-xl font-bold text-[#D86830]">{{ libraryStats.avgScore }}</p>
        <p class="text-[10px] font-bold text-[#A69080] uppercase tracking-widest">平均分</p>
      </div>
      <div class="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
        <p class="text-lg font-bold text-[#1a1714] truncate">{{ libraryStats.favorite }}</p>
        <p class="text-[10px] font-bold text-[#A69080] uppercase tracking-widest">最爱做</p>
      </div>
    </div>

    <div class="mb-6">
      <div class="flex items-center gap-3 mb-3">
        <div class="flex gap-1 p-1 bg-gray-100 rounded-lg">
          <button class="px-3 py-1.5 rounded-md text-xs font-medium transition-all" :class="viewMode === 'grid' ? 'bg-white text-[#1a1714] shadow-sm' : 'text-[#8B7D6B]'" @click="viewMode = 'grid'; activeCategory = ''">全部</button>
          <button class="px-3 py-1.5 rounded-md text-xs font-medium transition-all" :class="viewMode === 'category' ? 'bg-white text-[#1a1714] shadow-sm' : 'text-[#8B7D6B]'" @click="viewMode = 'category'">按分类</button>
        </div>
      </div>

      <div v-if="viewMode === 'category'" class="flex flex-wrap gap-2">
        <button class="px-3 py-1.5 rounded-full text-xs font-medium transition-all border" :class="!activeCategory ? 'bg-[#3D3530] text-white border-[#3D3530]' : 'bg-white text-[#8B7D6B] border-gray-200 hover:bg-gray-50'" @click="activeCategory = ''">
          全部 ({{ recipes.length }})
        </button>
        <button v-for="cat in categoryTree" :key="cat.key" class="px-3 py-1.5 rounded-full text-xs font-medium transition-all border" :class="activeCategory === cat.key ? 'bg-[#3D3530] text-white border-[#3D3530]' : 'bg-white text-[#8B7D6B] border-gray-200 hover:bg-gray-50'" @click="activeCategory = activeCategory === cat.key ? '' : cat.key">
          {{ cat.label }} ({{ cat.count }})
        </button>
      </div>
    </div>

    <div class="flex items-center gap-3 mb-4">
      <div class="relative flex-1 max-w-md">
        <input v-model="searchQuery" type="text" placeholder="搜索菜名、食材、标签..." class="w-full pl-11 pr-4 py-2.5 bg-white rounded-full border border-gray-200 text-sm text-[#1a1714] placeholder:text-[#A69080]/50 focus:outline-none focus:border-[#3D3530] shadow-sm" />
      </div>
      <button class="px-4 py-2.5 rounded-full border text-sm transition-all flex items-center gap-1.5" :class="filterExpanded ? 'bg-[#3D3530] text-white border-[#3D3530]' : 'bg-white text-[#8B7D6B] border-gray-200 hover:bg-gray-50'" @click="filterExpanded = !filterExpanded">
        筛选
      </button>
    </div>

    <div class="flex flex-wrap gap-2 mb-4">
      <button v-for="qf in quickFilters" :key="qf.label" class="px-3 py-1.5 rounded-full text-xs font-medium transition-all" :class="selectedTags.includes(qf.label) || (qf.label === '最高评分' && filteredSort === 'score') || (qf.label === '做过最多' && filteredSort === 'cookCount') ? 'bg-[#A69080] text-white' : 'bg-gray-100 text-[#8B7D6B] hover:bg-gray-200'" @click="qf.action()">
        {{ qf.label }}
      </button>
      <button v-if="selectedTags.length || filteredSort" class="px-3 py-1.5 rounded-full text-xs text-[#A69080] hover:text-[#1a1714] transition-colors" @click="clearTags">
        清除
      </button>
    </div>

    <div v-if="filterExpanded" class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <TagFilter :tags="tagsByDimension" :selected="selectedTags" @toggle="toggleTag" @clear="clearTags" />
    </div>

    <p class="text-xs text-[#A69080] mb-4 font-mono">{{ filteredRecipes.length }} 道菜谱</p>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      <template v-for="item in listWithTips" :key="item.data.id || item.data.title">
        <RecipeCard v-if="item.type === 'recipe'" :recipe="item.data" />
        <div v-else class="bg-white rounded-lg p-5 border border-gray-200 shadow-sm relative">
          <div class="absolute -top-1.5 -right-1 bg-[#D86830] text-white text-[9px] px-2.5 py-0.5 rotate-2 rounded-sm shadow-sm tracking-wider font-bold">TIP</div>
          <h4 class="text-lg font-bold text-[#1a1714] mb-2">{{ item.data.title }}</h4>
          <p class="text-base text-[#4A3D2E] leading-relaxed line-clamp-4">{{ item.data.content }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

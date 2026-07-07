<script setup lang="ts">
const { getRecipes, getCurrentShoppingList, recommendRecipes, getFridge } = useApi()

const hasCookLog = ref(false)
const todayCookLogs = ref<any[]>([])
const recipes = ref<any[]>([])
const expiringItems = ref<Array<{ name: string; daysLeft: number }>>([])
const fridgeNames = ref<Set<string>>(new Set())
const shoppingUncheckedNames = ref<Set<string>>(new Set())
const shoppingLoaded = ref(false)
const tips = ref<any[]>([])
const weekPlan = ref<any | null>(null)
const homeRecommendations = ref<any[]>([])
const shoppingList = ref<any | null>(null)
const aiTip = ref('')
const todayDate = ref('')
const todayDisplay = ref('')
const loading = ref(true)

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isPlanned = computed(() => {
  const meals = weekPlan.value?.meals || []
  return meals.some((meal: any) => !!meal.meal1?.recipeId || !!meal.meal1?.name || !!meal.meal2?.recipeId || !!meal.meal2?.name)
})

const todayMeal = computed(() => {
  if (!todayDate.value) return null
  return (weekPlan.value?.meals || []).find((meal: any) => meal.date === todayDate.value) || null
})

const tomorrowMeal = computed(() => {
  if (!todayDate.value) return null
  const parts = todayDate.value.split('-').map(Number)
  const tomorrow = new Date(parts[0]!, (parts[1] || 1) - 1, (parts[2] || 1) + 1)
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
  return (weekPlan.value?.meals || []).find((meal: any) => meal.date === tomorrowStr) || null
})

const todayRecipe = computed(() => {
  if (!todayMeal.value?.meal1?.recipeId) return null
  return recipes.value.find((recipe: any) => recipe.id === todayMeal.value.meal1.recipeId)
})

const bentoRecipe = computed(() => {
  if (!todayMeal.value?.meal2?.recipeId) return null
  return recipes.value.find((recipe: any) => recipe.id === todayMeal.value.meal2.recipeId)
})

const tomorrowRecipe = computed(() => {
  if (!tomorrowMeal.value?.meal1?.recipeId) return null
  return recipes.value.find((recipe: any) => recipe.id === tomorrowMeal.value.meal1.recipeId)
})

const tomorrowRecipe2 = computed(() => {
  if (!tomorrowMeal.value?.meal2?.recipeId) return null
  return recipes.value.find((recipe: any) => recipe.id === tomorrowMeal.value.meal2.recipeId)
})

const dinnerDone = computed(() => {
  if (todayRecipe.value) {
    return todayCookLogs.value.some((log: any) => log.recipeId === todayRecipe.value!.id)
  }
  // 文本菜名（无 recipeId）：有任意今天的记录视为完成
  if (todayMeal.value?.meal1?.name) return todayCookLogs.value.length > 0
  return false
})

const bentoDone = computed(() => {
  if (bentoRecipe.value) {
    return todayCookLogs.value.some((log: any) => log.recipeId === bentoRecipe.value!.id)
  }
  return false
})

const allDone = computed(() => {
  if (!todayMeal.value?.meal1?.name) return false
  if (!todayMeal.value?.meal2?.name || todayMeal.value.meal2.name === todayMeal.value.meal1?.name) {
    return dinnerDone.value
  }
  return dinnerDone.value && bentoDone.value
})

const weekStats = computed(() => {
  const meals = weekPlan.value?.meals || []
  const activeMeals = meals.filter((meal: any) => meal.meal1?.status !== 'skipped')
  const filled = activeMeals.filter((meal: any) => meal.meal1?.recipeId || meal.meal1?.name).length
  return { filled, total: activeMeals.length, remaining: Math.max(activeMeals.length - filled, 0) }
})

const tonightIngredients = computed(() => {
  const map = new Map<string, { name: string; amount: string; unit: string }>()
  const addIngredients = (recipe: any) => {
    if (!recipe?.ingredients) return
    for (const ingredient of recipe.ingredients) {
      if (!map.has(ingredient.name)) {
        map.set(ingredient.name, { name: ingredient.name, amount: String(ingredient.amount || ''), unit: ingredient.unit || '' })
      }
    }
  }
  addIngredients(todayRecipe.value)
  if (bentoRecipe.value?.id !== todayRecipe.value?.id) addIngredients(bentoRecipe.value)
  return Array.from(map.values())
})

const THAW_KEYWORDS = ['肉', '鸡', '鱼', '虾', '牛', '猪', '排骨', '羊肉', '鸭', '蟹', '贝']

const prepItems = computed(() => {
  // 收集明天 meal1（晚餐）+ meal2（后天便当）的食材（去重）
  const map = new Map<string, { name: string; amount: string; unit: string }>()
  const addFromRecipe = (recipe: any) => {
    if (!recipe?.ingredients) return
    for (const ri of recipe.ingredients) {
      const name = ri.name || ri.ingredient?.name
      if (!name || map.has(name)) continue
      map.set(name, { name, amount: String(ri.amount || ''), unit: ri.unit || '' })
    }
  }
  addFromRecipe(tomorrowRecipe.value)
  if (tomorrowRecipe2.value?.id !== tomorrowRecipe.value?.id) addFromRecipe(tomorrowRecipe2.value)

  const all = Array.from(map.values())
  const thaw: typeof all = []
  const buy: typeof all = []

  for (const item of all) {
    const isMeat = THAW_KEYWORDS.some(k => item.name.includes(k))
    const inFridge = fridgeNames.value.has(item.name)

    if (isMeat && inFridge) {
      thaw.push(item)
    } else if (!inFridge && shoppingLoaded.value && shoppingUncheckedNames.value.has(item.name)) {
      // 不在冰箱、购物清单已加载、且还未勾选（仍需购买）
      buy.push(item)
    }
  }
  return { thaw, buy }
})

const recommendations = computed(() => {
  return homeRecommendations.value.length
    ? homeRecommendations.value
    : [...recipes.value].sort((a, b) => b.score - a.score).slice(0, 6)
})

onMounted(async () => {
  const now = new Date()
  todayDate.value = formatLocalDate(now)
  todayDisplay.value = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })

  loading.value = true
  const [recipeResult, tipResult, planResult, logResult, shoppingResult, fridgeResult] = await Promise.allSettled([
    getRecipes(),
    $fetch<any[]>('/api/tips'),
    $fetch<any>('/api/week-plans/current'),
    $fetch<any[]>('/api/cook-logs'),
    getCurrentShoppingList(),
    getFridge(),
  ])

  if (recipeResult.status === 'fulfilled') recipes.value = recipeResult.value as any[]
  if (tipResult.status === 'fulfilled') tips.value = tipResult.value as any[]
  if (planResult.status === 'fulfilled') weekPlan.value = planResult.value
  if (logResult.status === 'fulfilled') {
    todayCookLogs.value = logResult.value.filter((log: any) => log.date?.startsWith(todayDate.value))
    hasCookLog.value = todayCookLogs.value.length > 0
  }
  if (shoppingResult.status === 'fulfilled') {
    shoppingList.value = shoppingResult.value
    // 提取未勾选的购物项名称
    const items = Array.isArray(shoppingResult.value?.items) ? shoppingResult.value.items : []
    shoppingUncheckedNames.value = new Set(items.filter((i: any) => !i.checked && !i.inStock).map((i: any) => i.name))
    shoppingLoaded.value = true
  }

  // 检查即将过期的食材
  if (fridgeResult.status === 'fulfilled') {
    const fridge = fridgeResult.value as any
    const allItems = [...(fridge.refrigerated || []), ...(fridge.frozen || []), ...(fridge.room_temp || [])]
    fridgeNames.value = new Set(allItems.map((item: any) => item.name))
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    expiringItems.value = allItems
      .filter((item: any) => item.expiryDate)
      .map((item: any) => {
        const diff = Math.ceil((new Date(item.expiryDate).getTime() - now.getTime()) / 86400000)
        return { name: item.name, daysLeft: diff }
      })
      .filter((item: any) => item.daysLeft <= 3)
      .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
  }

  loading.value = false

  // 推荐区域独立加载，不阻塞首页渲染
  recommendRecipes({
    count: 6,
    profile: 'balanced',
    mealType: 'dinner',
    useFridge: true,
    enrichWithAI: true,
  }).then((result) => {
    homeRecommendations.value = result
  }).catch(() => { /* 静默失败，降级到本地排序 */ })

  // AI 今日贴士
  $fetch<{ tip: string }>('/api/ai/daily-tip').then((result) => {
    if (result?.tip) aiTip.value = result.tip
  }).catch(() => {})

  // 切回标签页时刷新关键数据
  if (import.meta.client) {
    const onVisibilityChange = () => {
      if (document.hidden) return
      Promise.allSettled([
        getRecipes(),
        $fetch<any>('/api/week-plans/current'),
        $fetch<any[]>('/api/cook-logs'),
        getCurrentShoppingList(),
        getFridge(),
      ]).then(([recipeRes, planRes, logRes, shopRes, fridgeRes]) => {
        if (recipeRes.status === 'fulfilled') recipes.value = recipeRes.value as any[]
        if (planRes.status === 'fulfilled') weekPlan.value = planRes.value
        if (logRes.status === 'fulfilled') {
          todayCookLogs.value = logRes.value.filter((log: any) => log.date?.startsWith(todayDate.value))
          hasCookLog.value = todayCookLogs.value.length > 0
        }
        if (shopRes.status === 'fulfilled') {
          shoppingList.value = shopRes.value
          const items = Array.isArray(shopRes.value?.items) ? shopRes.value.items : []
          shoppingUncheckedNames.value = new Set(items.filter((i: any) => !i.checked && !i.inStock).map((i: any) => i.name))
          shoppingLoaded.value = true
        }
        if (fridgeRes.status === 'fulfilled') {
          const fridge = fridgeRes.value as any
          const allItems = [...(fridge.refrigerated || []), ...(fridge.frozen || []), ...(fridge.room_temp || [])]
          fridgeNames.value = new Set(allItems.map((item: any) => item.name))
        }
      })
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    onUnmounted(() => document.removeEventListener('visibilitychange', onVisibilityChange))
  }

  // SPA 导航回到首页时刷新关键数据
  const route = useRoute()
  watch(() => route.path, (path) => {
    if (path !== '/') return
    Promise.allSettled([
      getRecipes(),
      $fetch<any>('/api/week-plans/current'),
      $fetch<any[]>('/api/cook-logs'),
      getCurrentShoppingList(),
      getFridge(),
    ]).then(([recipeRes, planRes, logRes, shopRes, fridgeRes]) => {
      if (recipeRes.status === 'fulfilled') recipes.value = recipeRes.value as any[]
      if (planRes.status === 'fulfilled') weekPlan.value = planRes.value
      if (logRes.status === 'fulfilled') {
        todayCookLogs.value = logRes.value.filter((log: any) => log.date?.startsWith(todayDate.value))
        hasCookLog.value = todayCookLogs.value.length > 0
      }
      if (shopRes.status === 'fulfilled') {
        shoppingList.value = shopRes.value
        const items = Array.isArray(shopRes.value?.items) ? shopRes.value.items : []
        shoppingUncheckedNames.value = new Set(items.filter((i: any) => !i.checked && !i.inStock).map((i: any) => i.name))
        shoppingLoaded.value = true
      }
      if (fridgeRes.status === 'fulfilled') {
        const fridge = fridgeRes.value as any
        const allItems = [...(fridge.refrigerated || []), ...(fridge.frozen || []), ...(fridge.room_temp || [])]
        fridgeNames.value = new Set(allItems.map((item: any) => item.name))
      }
    })
  })
})
</script>

<template>
  <div class="animate-fade-in">
    <div v-if="loading" class="rounded-lg border border-gray-200 bg-white/75 p-8 text-center text-sm text-[#8B7D6B]">
      正在看看今天厨房里有什么...
    </div>

    <template v-else>
    <template v-if="!isPlanned">
      <section class="min-h-[50vh] flex items-center mb-12" data-testid="home-next-step">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full items-center">
          <div>
            <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-3">今日厨房</p>
            <h1 class="text-4xl lg:text-5xl font-serif font-bold text-[#1a1714] leading-tight mb-4">
              本周还没有规划，今晚想吃什么？
            </h1>
            <p class="text-lg text-[#8B7D6B] mb-8">翻翻想吃的，今晚就有着落。</p>
            <div class="flex gap-3">
              <NuxtLink to="/planner" class="px-6 py-3 bg-[#C06030] text-white rounded-lg font-medium hover:bg-[#A85028] transition-colors shadow-sm">
                去规划本周
              </NuxtLink>
              <NuxtLink to="/recipes" class="px-6 py-3 bg-white text-[#8B7D6B] border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                先看看菜谱
              </NuxtLink>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <NuxtLink v-for="recipe in recommendations.slice(0, 4)" :key="recipe.id" :to="`/recipes/${recipe.id}`" class="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all">
              <div class="aspect-[3/2] bg-gray-50">
                <HandDrawnPlaceholder :tags="recipe.tags" aspect-ratio="3/2" class="w-full h-full" />
              </div>
              <div class="p-3">
                <p class="text-sm font-medium truncate text-[#1a1714]">{{ recipe.name }}</p>
                <p class="font-mono text-xs text-[#D86830] mt-1">{{ recipe.recommendationScore || recipe.score }}</p>
                <p v-if="recipe.reason?.length" class="text-[11px] text-[#6D8B74] mt-1 line-clamp-1">{{ recipe.reason[0] }}</p>
              </div>
            </NuxtLink>
          </div>
        </div>
      </section>
    </template>

    <template v-else>
      <div class="flex items-end justify-between mb-6">
        <div>
          <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-1 font-sans">今天先看这里</p>
          <h1 class="text-3xl lg:text-4xl font-serif font-bold text-[#1a1714]">{{ todayMeal?.dayLabel || '今天' }}</h1>
        </div>
        <span class="font-mono text-sm text-[#8B7D6B]">{{ todayDisplay }}</span>
      </div>

      <!-- 今天不安排（跳过） -->
      <section v-if="todayMeal?.meal1?.status === 'skipped'" class="mb-8">
        <div class="bg-white rounded-2xl p-8 border border-dashed border-[#D8C9B8]">
          <p class="text-xs text-[#A69080] uppercase tracking-widest mb-1">今日不安排</p>
          <h2 class="text-3xl font-serif font-bold text-[#A69080] mb-3">{{ todayMeal.meal1.skipReason || '不安排' }}</h2>
          <p class="text-sm text-[#B3A391]">今天不用做饭，好好享受吧。</p>
        </div>
      </section>

      <!-- 今日待安排 -->
      <section v-if="!todayMeal?.meal1?.name && todayMeal?.meal1?.status !== 'skipped'" class="mb-8">
        <div class="bg-white rounded-2xl p-8 border border-gray-200">
          <p class="text-xs text-[#A69080] uppercase tracking-widest mb-1">今日待安排</p>
          <h2 class="text-3xl font-serif font-bold text-[#1a1714] mb-3">今天吃什么还没定</h2>
          <p class="text-sm text-[#8B7D6B] mb-6">想好今晚吃什么了的话，随时可以加上。</p>
          <NuxtLink to="/planner" class="inline-flex px-5 py-2.5 bg-[#C06030] text-white rounded-lg text-sm font-medium hover:bg-[#A85028] transition-colors">
            去安排今天
          </NuxtLink>
        </div>
      </section>

      <!-- 全部完成 → 小条 + 备餐提醒升级为主角 -->
      <section v-else-if="allDone" class="mb-6">
        <div class="flex items-center justify-between rounded-lg bg-[#6D8B74]/5 border border-[#6D8B74]/15 px-4 py-3">
          <p class="text-sm text-[#6D8B74] font-medium">今晚都做好了</p>
          <NuxtLink to="/cook-logs" class="text-xs text-[#8B7D6B] hover:text-[#1a1714] transition-colors">查看记录</NuxtLink>
        </div>
      </section>

      <!-- 晚餐已记录、便当未完成 → 便当递补 -->
      <section v-else-if="hasCookLog" class="mb-6">
        <div class="bg-gradient-to-br from-[#6D8B74]/10 to-[#C9A96E]/10 rounded-lg p-4 border border-[#6D8B74]/15 flex items-center justify-between">
          <div>
            <p class="text-xs text-[#A69080] uppercase tracking-widest mb-0.5">晚餐已记录</p>
            <p class="font-serif font-bold text-[#1a1714]">{{ todayMeal.meal1.name }}</p>
          </div>
          <NuxtLink to="/cook-logs" class="px-3 py-1.5 bg-white border border-gray-200 text-[#8B7D6B] rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">
            查看记录
          </NuxtLink>
        </div>
      </section>

      <!-- 今日晚餐主体卡片（未记录时） -->
      <template v-if="!hasCookLog && todayMeal?.meal1?.name">
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <div class="bg-white rounded-lg border border-gray-200 p-1.5 shadow-sm rotate-[-1deg] mb-4">
              <div class="aspect-[4/3] rounded-lg overflow-hidden relative bg-gray-50">
                <HandDrawnPlaceholder :tags="todayRecipe?.tags || []" aspect-ratio="4/3" class="w-full h-full" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div class="absolute bottom-4 left-4 z-10 text-white">
                  <span class="bg-[#B5838D] text-[10px] px-2.5 py-0.5 rounded-sm uppercase tracking-widest mb-2 inline-block font-sans font-semibold">今日晚餐</span>
                  <h2 class="text-2xl sm:text-3xl font-serif font-bold leading-tight">{{ todayMeal.meal1.name }}</h2>
                </div>
              </div>
            </div>
            <div v-if="todayRecipe" class="flex items-center gap-4 text-sm text-[#8B7D6B]">
              <span class="font-mono text-[#D86830] font-bold">{{ todayRecipe.score }}/10</span>
              <span class="font-mono">{{ todayRecipe.estimatedTime }}min</span>
              <span class="font-mono">做过 {{ todayRecipe.cookCount }} 次</span>
            </div>
          </div>

          <div class="flex flex-col gap-4">
            <div class="flex flex-wrap gap-2">
              <NuxtLink v-if="todayRecipe" :to="`/cook/${todayRecipe.id}`" class="px-4 py-2 bg-[#C06030] text-white rounded-lg text-sm font-medium hover:bg-[#A85028] transition-colors">
                开始做饭
              </NuxtLink>
              <NuxtLink v-if="todayRecipe" :to="`/recipes/${todayRecipe.id}`" class="px-4 py-2 bg-white border border-gray-200 text-[#8B7D6B] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                查看详情
              </NuxtLink>
              <NuxtLink to="/cook-logs" class="px-4 py-2 bg-white border border-gray-200 text-[#8B7D6B] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                记录今日
              </NuxtLink>
            </div>
          </div>
        </section>
      </template>

      <!-- 晚餐已记录 + 便当未完成 → 便当递补为主体 -->
      <template v-if="hasCookLog && !allDone && todayMeal?.meal2?.name && todayMeal.meal2.name !== todayMeal.meal1?.name">
        <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <div class="bg-white rounded-lg border border-gray-200 p-1.5 shadow-sm rotate-[1deg] mb-4">
              <div class="aspect-[4/3] rounded-lg overflow-hidden relative bg-gray-50">
                <HandDrawnPlaceholder :tags="bentoRecipe?.tags || []" aspect-ratio="4/3" class="w-full h-full" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                <div class="absolute bottom-4 left-4 z-10 text-white">
                  <span class="bg-[#7BA7C2] text-[10px] px-2.5 py-0.5 rounded-sm uppercase tracking-widest mb-2 inline-block font-sans font-semibold">次日便当</span>
                  <h2 class="text-2xl sm:text-3xl font-serif font-bold leading-tight">{{ todayMeal.meal2.name }}</h2>
                </div>
              </div>
            </div>
            <div v-if="bentoRecipe" class="flex items-center gap-4 text-sm text-[#8B7D6B]">
              <span class="font-mono text-[#D86830] font-bold">{{ bentoRecipe.score }}/10</span>
              <span class="font-mono">{{ bentoRecipe.estimatedTime }}min</span>
            </div>
          </div>
          <div class="flex flex-col gap-4">
            <div class="flex flex-wrap gap-2">
              <NuxtLink v-if="bentoRecipe" :to="`/cook/${bentoRecipe.id}`" class="px-4 py-2 bg-[#C06030] text-white rounded-lg text-sm font-medium hover:bg-[#A85028] transition-colors">
                开始做饭
              </NuxtLink>
              <NuxtLink v-if="bentoRecipe" :to="`/recipes/${bentoRecipe.id}`" class="px-4 py-2 bg-white border border-gray-200 text-[#8B7D6B] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                查看详情
              </NuxtLink>
            </div>
          </div>
        </section>
      </template>

      <!-- 次日便当卡片（晚餐未记录 + 便当不同菜） -->
      <section v-if="!hasCookLog && todayMeal?.meal2?.name && todayMeal.meal2.name !== todayMeal.meal1?.name" class="mb-6">
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-2">次日便当 · 今晚一起做</p>
          <p class="text-xl font-serif font-bold text-[#1a1714] mb-1">{{ todayMeal.meal2.name }}</p>
          <div v-if="bentoRecipe" class="flex items-center gap-3 mt-2 text-xs text-[#8B7D6B]">
            <span class="font-mono text-[#D86830] font-bold">{{ bentoRecipe.score }}/10</span>
            <span class="font-mono">{{ bentoRecipe.estimatedTime }}min</span>
          </div>
          <div v-if="bentoRecipe" class="flex gap-2 mt-3">
            <NuxtLink :to="`/cook/${bentoRecipe.id}`" class="px-3 py-1.5 bg-[#C06030]/10 text-[#C06030] rounded-lg text-xs font-medium hover:bg-[#C06030]/20 transition-colors">
              做饭步骤
            </NuxtLink>
            <NuxtLink :to="`/recipes/${bentoRecipe.id}`" class="px-3 py-1.5 bg-gray-100 text-[#6B5D4D] rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
              查看详情
            </NuxtLink>
          </div>
        </div>
      </section>
      <section v-else-if="!hasCookLog && todayMeal?.meal2?.name" class="mb-6">
        <div class="bg-[#6D8B74]/5 rounded-lg border border-[#6D8B74]/15 p-4">
          <p class="text-xs text-[#6D8B74] font-medium">次日便当和晚餐一样，多做一点就好</p>
        </div>
      </section>

      <!-- 今晚食材（做饭完成后隐藏） -->
      <section v-if="tonightIngredients.length && !allDone" class="mb-6">
        <div class="bg-white rounded-lg border border-gray-200 p-5">
          <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-3">
            今晚食材
            <span v-if="todayMeal?.meal2?.name && todayMeal.meal2.name !== todayMeal.meal1?.name" class="font-normal normal-case tracking-normal text-[#8B7D6B]">（含便当）</span>
          </p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="ingredient in tonightIngredients" :key="ingredient.name" class="px-2.5 py-1 bg-gray-100 text-[#6B5D4D] text-xs rounded-full">
              {{ ingredient.name }} {{ ingredient.amount }}{{ ingredient.unit }}
            </span>
          </div>
        </div>
      </section>

      <!-- 备餐提醒（明天晚餐 + 后天便当） -->
      <section v-if="prepItems.thaw.length || prepItems.buy.length" class="mb-6">
        <div class="rounded-lg border p-5" :class="allDone ? 'border-[#C06030]/30 bg-gradient-to-br from-[#C06030]/5 to-[#D86830]/5 shadow-sm' : 'border-[#E3D6C8] bg-white'">
          <p class="text-xs font-bold uppercase tracking-widest mb-1" :class="allDone ? 'text-[#C06030]' : 'text-[#A69080]'">明晚备餐</p>
          <h3 class="font-serif text-lg font-bold text-[#1a1714] mb-3">
            {{ tomorrowMeal?.meal1?.name || '' }}
            <span v-if="tomorrowMeal?.meal2?.name && tomorrowMeal.meal2.name !== tomorrowMeal.meal1?.name" class="text-[#8B7D6B] font-normal text-base"> + {{ tomorrowMeal.meal2.name }}（便当）</span>
          </h3>
          <div v-if="prepItems.thaw.length" class="mb-3">
            <p class="text-xs font-medium mb-2" :class="allDone ? 'text-[#D86830]' : 'text-[#D86830]'">🧊 今晚拿出来解冻</p>
            <div class="flex flex-wrap gap-2">
              <span v-for="item in prepItems.thaw" :key="item.name" class="px-3 py-1.5 bg-[#D86830]/10 text-[#D86830] rounded-full font-medium" :class="allDone ? 'text-sm' : 'text-xs'">
                {{ item.name }}
              </span>
            </div>
          </div>
          <div v-if="prepItems.buy.length" class="mb-3">
            <p class="text-xs font-medium mb-2" :class="allDone ? 'text-[#8B7D6B]' : 'text-[#8B7D6B]'">🛒 还没买</p>
            <div class="flex flex-wrap gap-2">
              <span v-for="item in prepItems.buy" :key="item.name" class="px-3 py-1.5 bg-gray-100 text-[#6B5D4D] rounded-full" :class="allDone ? 'text-sm' : 'text-xs'">
                {{ item.name }}
              </span>
            </div>
          </div>
          <NuxtLink to="/planner" class="inline-flex items-center gap-1.5 mt-1 text-sm font-medium text-[#C06030] hover:text-[#A85028] transition-colors">
            去清单看看
            <svg viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" /></svg>
          </NuxtLink>
        </div>
      </section>

      <!-- 即将过期 -->
      <section v-if="expiringItems.length" class="mb-6">
        <div class="rounded-lg border border-orange-200 bg-orange-50/50 p-4">
          <p class="text-xs font-bold text-orange-700 mb-2">⚠️ 即将过期</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="item in expiringItems" :key="item.name" class="rounded-full px-2 py-0.5 text-xs" :class="item.daysLeft < 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'">
              {{ item.name }} {{ item.daysLeft < 0 ? '已过期' : item.daysLeft + '天' }}
            </span>
          </div>
          <NuxtLink to="/ingredients" class="inline-block mt-2 text-xs text-orange-700 hover:text-orange-900">去冰箱看看</NuxtLink>
        </div>
      </section>

      <!-- 周统计 -->
      <section class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div class="bg-white rounded-lg border border-gray-200 p-5 text-center">
          <p class="font-mono text-3xl font-bold text-[#1a1714]">{{ weekStats.filled }}</p>
          <p class="text-xs text-[#A69080] mt-1">已规划</p>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 p-5 text-center">
          <p class="font-mono text-3xl font-bold text-[#D86830]">{{ weekStats.remaining }}</p>
          <p class="text-xs text-[#A69080] mt-1">待安排</p>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 p-5 text-center">
          <p class="font-mono text-3xl font-bold text-[#6D8B74]">{{ hasCookLog ? '已记' : '待记' }}</p>
          <p class="text-xs text-[#A69080] mt-1">今日记录</p>
        </div>
      </section>
    </template>

    <div v-if="aiTip" class="mt-6 mb-2">
      <div class="rounded-lg border border-[#E3D6C8] bg-white/80 px-5 py-3 flex items-start gap-3">
        <span class="text-lg mt-0.5">💡</span>
        <div>
          <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-0.5">今日贴士</p>
          <p class="text-sm text-[#6B5D4D]">{{ aiTip }}</p>
        </div>
      </div>
    </div>

    <div class="mt-8">
      <TipCarousel :tips="tips" />
    </div>
    </template>
  </div>
</template>

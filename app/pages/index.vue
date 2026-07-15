<script setup lang="ts">
import type { CookLog, FridgeInventory, FridgeItem, KitchenPlanDay, Recipe, RecipeRecommendation, ShoppingList } from '~/types'

const { recipes, weekPlan, tips, loadFromApi, loadWeekPlanByDate } = useKitchenData()
const { getCookLogs, getCurrentShoppingList, recommendRecipes, getFridge } = useApi()
const toast = useToast()

await loadFromApi()

const todayDate = ref('')
const todayDisplay = ref('')
const todayCookLogs = ref<CookLog[]>([])
const shoppingList = ref<ShoppingList | null>(null)
const fridge = ref<FridgeInventory>({ frozen: [], refrigerated: [], room_temp: [] })
const homeRecommendations = ref<RecipeRecommendation[]>([])
const loading = ref(true)
const refreshing = ref(false)
const recommendationsLoading = ref(false)
const aiTip = ref('')
const aiTipFailed = ref(false)
const imageFailures = ref(new Set<string>())
const sectionErrors = ref<{ plan?: string; logs?: string; shopping?: string; fridge?: string }>({})

type HomeState = 'unplanned' | 'planned' | 'skipped' | 'cooked-unrecorded' | 'complete'
const formatLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const todayMeal = computed<KitchenPlanDay | null>(() => weekPlan.value.meals.find(day => day.date === todayDate.value) || null)
const primarySlot = computed(() => todayMeal.value?.meal1 || null)
const secondarySlot = computed(() => todayMeal.value?.meal2 || null)
const todayRecipe = computed(() => recipes.value.find(recipe => recipe.id === primarySlot.value?.recipeId) || null)
const bentoRecipe = computed(() => recipes.value.find(recipe => recipe.id === secondarySlot.value?.recipeId) || null)
const relevantRecipeIds = computed(() => new Set([primarySlot.value?.recipeId, secondarySlot.value?.recipeId].filter((id): id is string => Boolean(id))))
const relevantLogs = computed(() => todayCookLogs.value.filter(log => relevantRecipeIds.value.size ? relevantRecipeIds.value.has(log.recipeId) : true))
const logHasDetails = (log: CookLog) => Boolean(log.photos?.length || log.selfScore || log.partnerScore || log.selfComment?.trim() || log.partnerComment?.trim() || log.notes?.trim())
const homeState = computed<HomeState>(() => {
  if (primarySlot.value?.status === 'skipped') return 'skipped'
  if (!primarySlot.value?.name?.trim()) return 'unplanned'
  if (!relevantLogs.value.length) return 'planned'
  return relevantLogs.value.some(logHasDetails) ? 'complete' : 'cooked-unrecorded'
})
const stateCopy = computed(() => ({
  unplanned: { eyebrow: '今晚还没安排', title: '今晚想吃什么？', description: '先选一道菜，接下来要买什么、什么时候开始做就清楚了。' },
  planned: { eyebrow: '今晚吃这个', title: primarySlot.value?.name || '今晚的菜', description: secondarySlot.value?.name && secondarySlot.value.name !== primarySlot.value?.name ? `顺手多做一份：${secondarySlot.value.name}` : '安排已经有了，按自己的节奏开始就好。' },
  skipped: { eyebrow: '今天不做饭', title: primarySlot.value?.skipReason || '今晚休息', description: '厨房今天也放个假，不需要完成任何任务。' },
  'cooked-unrecorded': { eyebrow: '已经做好了', title: '趁热记两句', description: '基础记录已经保存，再补一张照片或一句感受就完整了。' },
  complete: { eyebrow: '今天完成', title: '这一餐已经好好收进小本子', description: '辛苦了。接下来只要看看明天是否需要提前解冻或补货。' },
}[homeState.value]))

const allFridgeItems = computed<FridgeItem[]>(() => [...fridge.value.refrigerated, ...fridge.value.frozen, ...fridge.value.room_temp])
const fridgeNames = computed(() => new Set(allFridgeItems.value.map(item => item.name.trim().toLowerCase())))
const pendingShoppingNames = computed(() => new Set((shoppingList.value?.items || []).filter(item => !item.checked && !item.inStock).map(item => item.name.trim().toLowerCase())))
const tonightIngredients = computed(() => {
  const result = new Map<string, { name: string; amount: string; unit: string }>()
  for (const recipe of [todayRecipe.value, bentoRecipe.value]) {
    for (const item of recipe?.ingredients || []) {
      if (!result.has(item.name)) result.set(item.name, { name: item.name, amount: item.amount || '', unit: item.unit || '' })
    }
  }
  return [...result.values()]
})
const missingItems = computed(() => tonightIngredients.value.filter(item => {
  const name = item.name.toLowerCase()
  return pendingShoppingNames.value.has(name) || (!fridgeNames.value.has(name) && !shoppingList.value)
}))
const expiringItems = computed(() => {
  if (!todayDate.value) return []
  const today = new Date(`${todayDate.value}T00:00:00`).getTime()
  return allFridgeItems.value.filter(item => item.expiryDate).map(item => ({ ...item, daysLeft: Math.ceil((new Date(item.expiryDate!).getTime() - today) / 86400000) })).filter(item => item.daysLeft <= 3).sort((a, b) => a.daysLeft - b.daysLeft)
})
const recommendations = computed<Recipe[]>(() => homeRecommendations.value.length ? homeRecommendations.value : [...recipes.value].sort((a, b) => b.score - a.score).slice(0, 4))
const primaryLog = computed(() => relevantLogs.value[0] || null)
const primaryAction = computed(() => {
  if (homeState.value === 'unplanned') return { label: '安排今晚', to: '/planner' }
  if (homeState.value === 'planned' && todayRecipe.value) return { label: '开始做饭', to: `/cook/${todayRecipe.value.id}` }
  if (homeState.value === 'planned') return { label: '完善计划', to: '/planner' }
  if (homeState.value === 'cooked-unrecorded' && primaryLog.value) return { label: '补充这次记录', to: `/cook-logs?editLog=${primaryLog.value.id}` }
  if (homeState.value === 'complete') return { label: '看看记录', to: '/cook-logs' }
  return { label: '看看菜谱', to: '/recipes' }
})
const fallbackTip = computed(() => tips.value[0]?.content || '把常用的食材放在顺手的位置，做饭会轻松很多。')

let statusRequest: Promise<void> | null = null
const refreshHome = async ({ announce = false }: { announce?: boolean } = {}) => {
  if (statusRequest) return statusRequest
  refreshing.value = true
  statusRequest = (async () => {
    const [planResult, logResult, shoppingResult, fridgeResult] = await Promise.allSettled([loadWeekPlanByDate(), getCookLogs(), getCurrentShoppingList(), getFridge()])
    const errors: typeof sectionErrors.value = {}
    if (planResult.status === 'rejected') errors.plan = getApiErrorMessage(planResult.reason, '今天的计划没有加载出来。')
    if (logResult.status === 'fulfilled') todayCookLogs.value = logResult.value.filter(log => log.date?.startsWith(todayDate.value))
    else errors.logs = getApiErrorMessage(logResult.reason, '今天的记录没有加载出来。')
    if (shoppingResult.status === 'fulfilled') shoppingList.value = shoppingResult.value
    else errors.shopping = getApiErrorMessage(shoppingResult.reason, '购物清单没有加载出来。')
    if (fridgeResult.status === 'fulfilled') fridge.value = fridgeResult.value
    else errors.fridge = getApiErrorMessage(fridgeResult.reason, '库存没有加载出来。')
    sectionErrors.value = errors
    if (announce) {
      if (Object.keys(errors).length) toast.error('部分厨房信息刷新失败。')
      else toast.success('首页已刷新。')
    }
  })().finally(() => { loading.value = false; refreshing.value = false; statusRequest = null })
  return statusRequest
}

const loadSecondaryContent = async () => {
  recommendationsLoading.value = true
  try { homeRecommendations.value = await recommendRecipes({ count: 4, profile: 'balanced', mealType: 'dinner', useFridge: true, enrichWithAI: true }) }
  catch { homeRecommendations.value = [] }
  finally { recommendationsLoading.value = false }
  try { const result = await $fetch<{ tip: string }>('/api/ai/daily-tip'); aiTip.value = result.tip || '' }
  catch { aiTipFailed.value = true }
}
const markImageFailed = (id: string) => { imageFailures.value = new Set(imageFailures.value).add(id) }

onMounted(async () => {
  const now = new Date()
  todayDate.value = formatLocalDate(now)
  todayDisplay.value = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
  await refreshHome()
  void loadSecondaryContent()
})
</script>

<template>
  <div class="animate-fade-in pb-5">
    <PageHeader title="今天的厨房" :description="todayDisplay || '正在确认今天的安排'">
      <template #actions><AppButton variant="ghost" :loading="refreshing" @click="refreshHome({ announce: true })">刷新</AppButton></template>
    </PageHeader>

    <div v-if="loading" class="space-y-4" aria-live="polite" aria-label="正在加载首页">
      <div class="h-64 animate-pulse rounded-[var(--radius-xl)] bg-[var(--color-surface-muted)]" />
      <div class="grid gap-4 sm:grid-cols-3"><div v-for="index in 3" :key="index" class="h-28 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)]" /></div>
    </div>

    <template v-else>
      <AppNotice v-if="sectionErrors.plan || sectionErrors.logs" class="mb-5" tone="warning" title="有些信息暂时没取到" :message="sectionErrors.plan || sectionErrors.logs" />

      <section class="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-md)] sm:p-7 lg:p-9" data-testid="home-next-step" :data-home-state="homeState">
        <div class="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--color-accent-soft)] opacity-70 blur-3xl" />
        <div class="relative grid gap-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,.7fr)] lg:items-center">
          <div>
            <p class="mb-2 text-sm font-semibold text-[var(--color-accent)]">{{ stateCopy.eyebrow }}</p>
            <h2 class="heading-serif max-w-2xl text-3xl leading-tight text-[var(--color-text)] sm:text-4xl lg:text-5xl">{{ stateCopy.title }}</h2>
            <p class="mt-3 max-w-xl text-base leading-7 text-[var(--color-text-muted)]">{{ stateCopy.description }}</p>
            <div class="mt-6 flex flex-wrap gap-3">
              <AppButton :to="primaryAction.to" size="lg">{{ primaryAction.label }}</AppButton>
              <AppButton v-if="homeState === 'unplanned'" to="/recipes" variant="secondary" size="lg">先看菜谱</AppButton>
              <AppButton v-else-if="homeState === 'planned' && todayRecipe" :to="`/recipes/${todayRecipe.id}`" variant="secondary" size="lg">查看菜谱</AppButton>
              <AppButton v-else-if="homeState === 'skipped'" to="/planner" variant="secondary" size="lg">调整安排</AppButton>
            </div>
          </div>
          <div v-if="todayRecipe && homeState !== 'skipped'" class="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-soft)]">
            <div class="aspect-[4/3] overflow-hidden bg-[var(--color-surface-muted)]">
              <img v-if="todayRecipe.coverPhotoUrl && !imageFailures.has(todayRecipe.id)" :src="todayRecipe.coverPhotoUrl" :alt="`${todayRecipe.name}的成品照片`" width="640" height="480" class="h-full w-full object-cover" @error="markImageFailed(todayRecipe.id)" />
              <HandDrawnPlaceholder v-else :tags="todayRecipe.tags" :alt="`${todayRecipe.name}的手绘封面占位图`" aspect-ratio="4/3" class="h-full w-full" />
            </div>
            <div class="flex items-center justify-between gap-3 p-4"><p class="font-serif text-lg font-semibold text-[var(--color-text)]">{{ todayRecipe.name }}</p><span class="shrink-0 font-mono text-xs tabular-nums text-[var(--color-text-muted)]">{{ todayRecipe.estimatedTime }} 分钟</span></div>
          </div>
          <div v-else-if="homeState === 'unplanned'" class="grid grid-cols-2 gap-3">
            <NuxtLink v-for="recipe in recommendations.slice(0, 4)" :key="recipe.id" :to="`/recipes/${recipe.id}`" class="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)]">
              <div class="aspect-[4/3] bg-[var(--color-surface-muted)]"><img v-if="recipe.coverPhotoUrl && !imageFailures.has(recipe.id)" :src="recipe.coverPhotoUrl" :alt="`${recipe.name}的成品照片`" width="320" height="240" loading="lazy" class="h-full w-full object-cover" @error="markImageFailed(recipe.id)" /><HandDrawnPlaceholder v-else :tags="recipe.tags" :alt="`${recipe.name}的手绘封面占位图`" aspect-ratio="4/3" class="h-full w-full" /></div>
              <p class="truncate px-3 py-2.5 text-sm font-semibold text-[var(--color-text)]">{{ recipe.name }}</p>
            </NuxtLink>
            <p v-if="recommendationsLoading" class="col-span-2 text-center text-sm text-[var(--color-text-muted)]">正在挑几道合适的菜…</p>
          </div>
        </div>
      </section>

      <section class="mt-5 grid gap-4 sm:grid-cols-3" aria-label="今天的三个关键信息">
        <article class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p class="text-sm font-semibold text-[var(--color-text-muted)]">今天吃什么</p><p class="mt-2 font-serif text-xl font-semibold text-[var(--color-text)]">{{ primarySlot?.name || (homeState === 'skipped' ? '今天不做饭' : '还没安排') }}</p><p v-if="secondarySlot?.name && secondarySlot.name !== primarySlot?.name" class="mt-1 text-sm text-[var(--color-text-muted)]">另做：{{ secondarySlot.name }}</p>
        </article>
        <article class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p class="text-sm font-semibold text-[var(--color-text-muted)]">现在做什么</p><p class="mt-2 font-serif text-xl font-semibold text-[var(--color-text)]">{{ homeState === 'planned' ? '准备食材，开始做饭' : homeState === 'cooked-unrecorded' ? '补照片或感受' : homeState === 'complete' ? '休息一下' : homeState === 'skipped' ? '享受今晚' : '先定一道菜' }}</p>
        </article>
        <article class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <p class="text-sm font-semibold text-[var(--color-text-muted)]">还缺什么</p><p class="mt-2 font-serif text-xl font-semibold text-[var(--color-text)]">{{ missingItems.length ? `还有 ${missingItems.length} 样待确认` : sectionErrors.shopping || sectionErrors.fridge ? '暂时无法确认' : '目前没有缺项' }}</p><NuxtLink v-if="missingItems.length" to="/planner" class="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-accent)]">去购物清单</NuxtLink>
        </article>
      </section>

      <section v-if="missingItems.length || tonightIngredients.length" class="mt-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div class="flex flex-wrap items-end justify-between gap-2"><div><h2 class="font-serif text-xl font-semibold text-[var(--color-text)]">今晚要用的食材</h2><p class="mt-1 text-sm text-[var(--color-text-muted)]">缺项优先显示，家里有的也保留在这里方便核对。</p></div><NuxtLink to="/ingredients" class="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-accent)]">查看库存</NuxtLink></div>
        <div class="mt-4 flex flex-wrap gap-2"><span v-for="item in tonightIngredients" :key="item.name" class="rounded-full border px-3 py-2 text-sm" :class="missingItems.some(missing => missing.name === item.name) ? 'border-[var(--color-warning)] bg-[var(--color-warning-soft)] text-[var(--color-text)]' : 'border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]'">{{ item.name }} {{ item.amount }}{{ item.unit }}</span></div>
      </section>

      <section v-if="expiringItems.length" class="mt-6 rounded-[var(--radius-lg)] border border-[var(--color-warning)] bg-[var(--color-warning-soft)] p-5">
        <div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="font-serif text-xl font-semibold text-[var(--color-text)]">这些食材快到期了</h2><p class="mt-1 text-sm text-[var(--color-text-muted)]">优先用掉，比临时加任务更轻松。</p></div><NuxtLink to="/ingredients" class="inline-flex min-h-11 items-center font-semibold text-[var(--color-accent)]">去库存看看</NuxtLink></div>
        <div class="mt-3 flex flex-wrap gap-2"><span v-for="item in expiringItems" :key="item.id" class="rounded-full bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]">{{ item.name }} · {{ item.daysLeft < 0 ? '已过期' : item.daysLeft === 0 ? '今天到期' : item.daysLeft + ' 天' }}</span></div>
      </section>

      <section class="mt-8 grid gap-5 lg:grid-cols-[1fr_1.6fr]">
        <article class="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-soft)] p-5"><p class="text-sm font-semibold text-[var(--color-accent)]">厨房小贴士</p><p class="mt-2 leading-7 text-[var(--color-text)]">{{ aiTip || fallbackTip }}</p><p v-if="aiTipFailed" class="mt-2 text-xs text-[var(--color-text-faint)]">智能贴士暂时休息，先显示本地小贴士。</p></article>
        <div><div class="mb-3 flex items-end justify-between gap-3"><div><h2 class="font-serif text-xl font-semibold text-[var(--color-text)]">换个口味</h2><p class="mt-1 text-sm text-[var(--color-text-muted)]">只是备选，不打扰今天的主流程。</p></div><NuxtLink to="/recipes" class="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-accent)]">全部菜谱</NuxtLink></div><div class="grid grid-cols-2 gap-3 sm:grid-cols-4"><NuxtLink v-for="recipe in recommendations.slice(0, 4)" :key="recipe.id" :to="`/recipes/${recipe.id}`" class="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"><p class="truncate font-semibold text-[var(--color-text)]">{{ recipe.name }}</p><p class="mt-1 font-mono text-xs tabular-nums text-[var(--color-text-muted)]">{{ recipe.estimatedTime }} 分钟 · {{ recipe.score }} 分</p></NuxtLink></div></div>
      </section>
    </template>
  </div>
</template>

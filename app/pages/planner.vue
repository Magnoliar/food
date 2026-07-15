<script setup lang="ts">
import type { KitchenPlanDay, PlanMealUpdate, ShoppingList } from '~/types'

const { weekPlan, recipes, loadFromApi, loadWeekPlanByDate } = useKitchenData()
const { updateWeekPlan, generateShoppingListFromWeekPlan, recommendRecipes } = useApi()
const toast = useToast()

await loadFromApi()

const currentWeekDate = ref('')
const activeDay = ref(weekPlan.value.meals?.[0]?.date || '')
const recipeNames = computed(() => recipes.value.map(recipe => recipe.name))
const shoppingList = ref<ShoppingList | null>(weekPlan.value.shoppingList?.items ? weekPlan.value.shoppingList as ShoppingList : null)
const aiLoading = ref(false)
const saving = ref(false)
const syncing = ref(false)
const dirty = ref(false)
const savedAt = ref<string | null>(null)
const plannerMessage = ref('')
const plannerMessageTone = ref<'info' | 'success' | 'warning' | 'danger'>('info')
const shoppingSectionRef = ref<HTMLElement | null>(null)
const clientReady = ref(false)
const aiUndoSnapshot = ref<KitchenPlanDay[] | null>(null)
const planReady = computed(() => Boolean(weekPlan.value?.meals?.length && weekPlan.value.id))

onMounted(() => { clientReady.value = true })

const isPastWeek = computed(() => {
  if (!clientReady.value || !weekPlan.value?.endDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(`${weekPlan.value.endDate}T00:00:00`) < today
})
const isNotCurrentWeek = computed(() => Boolean(currentWeekDate.value))
const saveStatus = computed(() => {
  if (saving.value) return '正在保存计划…'
  if (dirty.value) return '有改动尚未保存'
  if (savedAt.value) return `计划已保存 · ${savedAt.value}`
  return '输入后会自动保存计划'
})

const hasMealName = (meal: KitchenPlanDay['meal1']) => Boolean(meal?.name?.trim())
const mealTypeForLabel = (label?: string) => label === '次日便当' ? 'bento' : label === '午餐' ? 'weekend' : 'dinner'
const cloneMeals = (meals: KitchenPlanDay[]) => JSON.parse(JSON.stringify(meals)) as KitchenPlanDay[]
const setMessage = (message: string, tone: typeof plannerMessageTone.value = 'info') => {
  plannerMessage.value = message
  plannerMessageTone.value = tone
}

watch(() => weekPlan.value.shoppingList, (next) => {
  shoppingList.value = next?.items ? next as ShoppingList : null
}, { immediate: true })
watch(() => weekPlan.value.meals?.[0]?.date, (next) => {
  if (next && !weekPlan.value.meals.some(day => day.date === activeDay.value)) activeDay.value = next
}, { immediate: true })

let saveTimer: ReturnType<typeof setTimeout> | null = null
const clearSaveTimer = () => { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null } }
const markDirty = () => {
  dirty.value = true
  clearSaveTimer()
  saveTimer = setTimeout(() => { void savePlan({ announce: false }) }, 800)
}

const updateMealSlot = (date: string, slotKey: 'meal1' | 'meal2', name: string) => {
  const slot = weekPlan.value.meals.find(item => item.date === date)?.[slotKey]
  if (!slot) return
  slot.name = name
  const matched = recipes.value.find(recipe => recipe.name === name)
  slot.recipeId = matched?.id || null
  aiUndoSnapshot.value = null
  markDirty()
}
const updateMeal1 = (date: string, name: string) => updateMealSlot(date, 'meal1', name)
const updateMeal2 = (date: string, name: string) => updateMealSlot(date, 'meal2', name)

const buildMealUpdates = (): PlanMealUpdate[] => {
  for (const day of weekPlan.value.meals) {
    for (const slot of [day.meal1, day.meal2]) {
      if (!slot?.name?.trim() || slot.recipeId) continue
      const query = slot.name.trim().toLowerCase()
      if (query.length < 2) continue
      const match = recipes.value.find(recipe => recipe.name.toLowerCase().includes(query))
      if (match) { slot.name = match.name; slot.recipeId = match.id }
    }
  }
  return weekPlan.value.meals.flatMap(day => [day.meal1, day.meal2]).filter(slot => Boolean(slot?.id)).map(slot => ({
    id: slot!.id,
    recipeId: slot!.recipeId || null,
    customName: slot!.name || null,
    status: slot!.status || null,
    skipReason: slot!.skipReason || null,
  }))
}

const savePlan = async ({ announce = true }: { announce?: boolean } = {}) => {
  if (!planReady.value || saving.value) return false
  clearSaveTimer()
  saving.value = true
  try {
    weekPlan.value = await updateWeekPlan(weekPlan.value.id, buildMealUpdates())
    dirty.value = false
    savedAt.value = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
    if (announce) { setMessage('计划已保存。购物清单尚未重新生成。', 'success'); toast.success('计划已保存。') }
    return true
  } catch (error: unknown) {
    dirty.value = true
    const message = getApiErrorMessage(error, '计划没有保存成功，请再试一次。')
    setMessage(message, 'danger')
    toast.error(message)
    return false
  } finally { saving.value = false }
}

const switchWeek = async (date?: string) => {
  if (dirty.value && !(await savePlan({ announce: false }))) return
  setMessage('', 'info')
  try {
    await loadWeekPlanByDate(date)
    currentWeekDate.value = date || ''
    activeDay.value = weekPlan.value.meals?.[0]?.date || ''
    shoppingList.value = weekPlan.value.shoppingList?.items ? weekPlan.value.shoppingList as ShoppingList : null
    dirty.value = false
    savedAt.value = null
    aiUndoSnapshot.value = null
  } catch (error: unknown) { setMessage(getApiErrorMessage(error, '切换周失败了，再试一次。'), 'danger') }
}
const shiftedWeekDate = (amount: number) => {
  const base = currentWeekDate.value || weekPlan.value.startDate
  if (!base) return undefined
  const [year = 0, month = 1, day = 1] = base.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + amount)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const goToPrevWeek = () => switchWeek(shiftedWeekDate(-7))
const goToNextWeek = () => switchWeek(shiftedWeekDate(7))
const goToCurrentWeek = () => switchWeek()

const toggleDaySkip = (date: string, reason: string | null) => {
  const day = weekPlan.value.meals.find(item => item.date === date)
  if (!day) return
  for (const slot of [day.meal1, day.meal2]) {
    if (!slot) continue
    if (reason) { slot.status = 'skipped'; slot.skipReason = reason; slot.name = ''; slot.recipeId = null }
    else { slot.status = null; slot.skipReason = null }
  }
  aiUndoSnapshot.value = null
  markDirty()
}

const aiFillWeek = async () => {
  if (!planReady.value || aiLoading.value) return
  clearSaveTimer()
  const snapshot = cloneMeals(weekPlan.value.meals)
  const emptySlots = weekPlan.value.meals.flatMap(day => [day.meal1, day.meal2]).filter(slot => slot && slot.status !== 'skipped' && !hasMealName(slot))
  if (!emptySlots.length) { setMessage('这周没有空位，AI 不会覆盖你已经填写的内容。', 'info'); return }
  aiLoading.value = true
  setMessage('', 'info')
  let filled = 0
  try {
    try {
      const result = await $fetch<{ assignments: Array<{ dayIndex: number; slot: 'meal1' | 'meal2'; recipeName: string; recipeId: string }> }>('/api/ai/week-plan', {
        method: 'POST', body: { meals: weekPlan.value.meals, availableRecipes: recipes.value },
      })
      for (const assignment of result.assignments || []) {
        const slot = weekPlan.value.meals[assignment.dayIndex]?.[assignment.slot]
        if (!slot || slot.status === 'skipped' || hasMealName(slot)) continue
        slot.name = assignment.recipeName; slot.recipeId = assignment.recipeId; filled++
      }
    } catch {
      setMessage('智能编排暂时不可用，正在用普通推荐补空位。', 'warning')
    }
    if (!filled) {
      const usedRecipeIds = new Set(weekPlan.value.meals.flatMap(day => [day.meal1?.recipeId, day.meal2?.recipeId]).filter((id): id is string => Boolean(id)))
      for (const day of weekPlan.value.meals) {
        for (const slot of [day.meal1, day.meal2]) {
          if (!slot || hasMealName(slot) || slot.status === 'skipped') continue
          const [recipe] = await recommendRecipes({ profile: slot.label === '次日便当' ? 'quick' : 'balanced', mealType: mealTypeForLabel(slot.label), count: 1, useFridge: true, excludeRecipeIds: [...usedRecipeIds] })
          if (!recipe) continue
          slot.name = recipe.name; slot.recipeId = recipe.id; usedRecipeIds.add(recipe.id); filled++
        }
      }
    }
    if (!filled) { setMessage('没有找到合适的推荐，原计划保持不变，你仍可手动填写。', 'warning'); return }
    aiUndoSnapshot.value = snapshot
    dirty.value = true
    const saved = await savePlan({ announce: false })
    setMessage(saved ? `已补上 ${filled} 个空位，没有覆盖手填内容。` : `已补上 ${filled} 个空位，但尚未保存。`, saved ? 'success' : 'warning')
  } catch (error: unknown) {
    weekPlan.value.meals = snapshot
    setMessage(getApiErrorMessage(error, '推荐暂时不可用，原计划没有改变，可以继续手动安排。'), 'warning')
  } finally { aiLoading.value = false }
}

const undoAiFill = async () => {
  if (!aiUndoSnapshot.value) return
  weekPlan.value.meals = cloneMeals(aiUndoSnapshot.value)
  aiUndoSnapshot.value = null
  dirty.value = true
  const saved = await savePlan({ announce: false })
  setMessage(saved ? '已撤销刚才的推荐。' : '已撤销推荐，但还没有保存成功。', saved ? 'success' : 'warning')
}

const syncShoppingList = async () => {
  if (!planReady.value || syncing.value) return
  syncing.value = true
  try {
    if (dirty.value && !(await savePlan({ announce: false }))) return
    shoppingList.value = await generateShoppingListFromWeekPlan(weekPlan.value.id)
    weekPlan.value.shoppingList = shoppingList.value
    setMessage('计划已保存，购物清单也已按最新安排同步。', 'success')
    toast.success('购物清单已同步。')
    await nextTick()
    shoppingSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (error: unknown) {
    const message = getApiErrorMessage(error, '计划已保留，但购物清单同步失败，请稍后重试。')
    setMessage(message, 'danger'); toast.error(message)
  } finally { syncing.value = false }
}
const refreshShoppingList = () => syncShoppingList()

onBeforeUnmount(() => clearSaveTimer())
</script>

<template>
  <div class="animate-fade-in pb-4">
    <PageHeader
      :title="weekPlan.name || '一周计划'"
      eyebrow="一周吃饭安排"
      description="先安排每餐；计划会自动保存，点击“保存并同步清单”才会重新生成购物清单。"
    >
      <template #actions>
        <AppButton variant="secondary" :loading="aiLoading" :disabled="!planReady" data-testid="planner-ai-fill" @click="aiFillWeek">补空位</AppButton>
        <AppButton class="hidden sm:inline-flex" :loading="syncing" :disabled="!planReady" data-testid="planner-save" @click="syncShoppingList">保存并同步清单</AppButton>
      </template>
    </PageHeader>

    <section class="mb-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-sm)] sm:p-4" aria-label="周切换与保存状态">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <button class="touch-target flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)]" aria-label="上一周" data-testid="planner-prev-week" @click="goToPrevWeek">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div class="min-w-0 px-1 text-center">
            <p class="truncate font-mono text-sm font-semibold tabular-nums text-[var(--color-text)]">{{ weekPlan.startDate || '—' }} 至 {{ weekPlan.endDate || '—' }}</p>
            <div class="mt-1 flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
              <span v-if="isPastWeek" class="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5">已过去</span>
              <button v-if="isNotCurrentWeek" class="min-h-7 rounded-md px-2 font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]" data-testid="planner-back-to-current" @click="goToCurrentWeek">回到本周</button>
            </div>
          </div>
          <button class="touch-target flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-soft)]" aria-label="下一周" data-testid="planner-next-week" @click="goToNextWeek">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <p class="text-xs" :class="dirty ? 'font-semibold text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]'" role="status">{{ saveStatus }}</p>
      </div>
    </section>

    <AppNotice v-if="plannerMessage" class="mb-5" :tone="plannerMessageTone" :message="plannerMessage" :role="plannerMessageTone === 'danger' ? 'alert' : 'status'" data-testid="planner-message">
      <button v-if="aiUndoSnapshot" class="ml-2 min-h-11 font-semibold text-[var(--color-accent)] underline decoration-transparent underline-offset-4 hover:decoration-current" @click="undoAiFill">撤销推荐</button>
    </AppNotice>

    <div class="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <div class="min-w-0 flex-1">
        <WeekCalendar :meals="weekPlan.meals" :active-day="activeDay" :recipe-names="recipeNames" :is-past="isPastWeek" @select-day="activeDay = $event" @update-meal1="updateMeal1" @update-meal2="updateMeal2" @toggle-skip="toggleDaySkip" />
      </div>
      <section ref="shoppingSectionRef" class="w-full min-w-0 scroll-mt-6 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-sm)] lg:sticky lg:top-6 lg:w-[360px] lg:shrink-0 lg:p-5" aria-label="购物清单">
        <ShoppingList :items="shoppingList?.items || []" @refresh="refreshShoppingList" />
      </section>
    </div>

    <div class="safe-bottom sticky bottom-[4.75rem] z-20 -mx-3 mt-5 border-t border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] px-3 py-3 backdrop-blur sm:hidden">
      <AppButton block :loading="syncing" :disabled="!planReady" data-testid="planner-save-mobile" @click="syncShoppingList">保存并同步购物清单</AppButton>
    </div>
  </div>
</template>

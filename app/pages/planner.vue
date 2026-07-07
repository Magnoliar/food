<script setup lang="ts">
const { weekPlan, recipes, loadFromApi, loadWeekPlanByDate } = useMockData()
const { updateWeekPlan, generateShoppingListFromWeekPlan, recommendRecipes } = useApi()

await loadFromApi()

const currentWeekDate = ref<string>('')
const activeDay = ref(weekPlan.value.meals?.[0]?.date || '')
const recipeNames = computed(() => recipes.value.map((recipe: any) => recipe.name))
const shoppingList = ref<any | null>(weekPlan.value.shoppingList?.items ? weekPlan.value.shoppingList : null)
const aiLoading = ref(false)
const saving = ref(false)
const plannerMessage = ref('')
const shoppingSectionRef = ref<HTMLElement | null>(null)
const planReady = computed(() => !!weekPlan.value?.meals?.length && !!weekPlan.value.id)

const isPastWeek = computed(() => {
  if (!weekPlan.value?.endDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(`${weekPlan.value.endDate}T00:00:00`)
  return end < today
})

const isNotCurrentWeek = computed(() => !!currentWeekDate.value)

const hasMealName = (meal: any) => Boolean(meal?.name?.trim())

const mealTypeForLabel = (label?: string) => {
  if (label === '次日便当') return 'bento'
  if (label === '午餐') return 'weekend'
  return 'dinner'
}

watch(
  () => weekPlan.value.shoppingList,
  (next) => {
    if (next?.items?.length) shoppingList.value = next
  },
  { immediate: true },
)

watch(
  () => weekPlan.value.meals?.[0]?.date,
  (next) => {
    if (next && !activeDay.value) activeDay.value = next
  },
  { immediate: true },
)

const updateMealSlot = (date: string, slotKey: 'meal1' | 'meal2', name: string) => {
  const day = weekPlan.value.meals.find((item: any) => item.date === date)
  const slot = day?.[slotKey]
  if (!slot) return
  slot.name = name
  const matched = recipes.value.find((recipe: any) => recipe.name === name)
  slot.recipeId = matched?.id || null
  debouncedSave()
}

// 实时保存：输入变化后 800ms 自动保存
let saveTimer: ReturnType<typeof setTimeout> | null = null
const debouncedSave = () => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { savePlan().catch(() => {}) }, 800)
}

onBeforeUnmount(() => {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
})

const updateMeal1 = (date: string, name: string) => updateMealSlot(date, 'meal1', name)
const updateMeal2 = (date: string, name: string) => updateMealSlot(date, 'meal2', name)

const goToPrevWeek = async () => {
  const base = currentWeekDate.value || weekPlan.value.startDate
  if (!base) return
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 7)
  const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  currentWeekDate.value = dateStr
  try {
    await loadWeekPlanByDate(dateStr)
  } catch {
    plannerMessage.value = '切换周失败了，再试一次。'
    return
  }
  activeDay.value = weekPlan.value.meals?.[0]?.date || ''
  if (weekPlan.value.shoppingList?.items?.length) shoppingList.value = weekPlan.value.shoppingList
  else shoppingList.value = null
}

const goToNextWeek = async () => {
  const base = currentWeekDate.value || weekPlan.value.startDate
  if (!base) return
  const [y, m, d] = base.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + 7)
  const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
  currentWeekDate.value = dateStr
  try {
    await loadWeekPlanByDate(dateStr)
  } catch {
    plannerMessage.value = '切换周失败了，再试一次。'
    return
  }
  activeDay.value = weekPlan.value.meals?.[0]?.date || ''
  if (weekPlan.value.shoppingList?.items?.length) shoppingList.value = weekPlan.value.shoppingList
  else shoppingList.value = null
}

const goToCurrentWeek = async () => {
  currentWeekDate.value = ''
  try {
    await loadWeekPlanByDate()
  } catch {
    plannerMessage.value = '回到本周失败了，再试一次。'
    return
  }
  activeDay.value = weekPlan.value.meals?.[0]?.date || ''
  if (weekPlan.value.shoppingList?.items?.length) shoppingList.value = weekPlan.value.shoppingList
  else shoppingList.value = null
}

const toggleDaySkip = (date: string, reason: string | null) => {
  const day = weekPlan.value.meals.find((item: any) => item.date === date)
  if (!day) return
  for (const slot of [day.meal1, day.meal2]) {
    if (!slot) continue
    if (reason) {
      slot.status = 'skipped'
      slot.skipReason = reason
      slot.name = ''
      slot.recipeId = null
    } else {
      slot.status = null
      slot.skipReason = null
    }
  }
  debouncedSave()
}

const refreshCurrentPlan = async () => {
  const url = currentWeekDate.value ? `/api/week-plans/by-date?date=${currentWeekDate.value}` : '/api/week-plans/current'
  const refreshedPlan = await $fetch<any>(url)
  weekPlan.value = refreshedPlan
  if (refreshedPlan?.shoppingList) shoppingList.value = refreshedPlan.shoppingList
}

const aiFillWeek = async () => {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  aiLoading.value = true
  plannerMessage.value = ''
  try {
    const emptyCount = (weekPlan.value.meals || []).reduce((sum: number, day: any) => {
      if (day.meal1?.status === 'skipped') return sum
      return sum + (day.meal1 && !hasMealName(day.meal1) ? 1 : 0) + (day.meal2 && !hasMealName(day.meal2) ? 1 : 0)
    }, 0)

    if (!emptyCount) {
      plannerMessage.value = '这周已经排满了。'
      return
    }

    // 尝试 AI 智能编排（考虑荤素搭配、口味多样性）
    try {
      const result = await $fetch<{ assignments: Array<{ dayIndex: number; slot: string; recipeName: string; recipeId: string }> }>('/api/ai/week-plan', {
        method: 'POST',
        body: { meals: weekPlan.value.meals, availableRecipes: recipes.value },
      })
      if (result?.assignments?.length) {
        for (const a of result.assignments) {
          const day = weekPlan.value.meals[a.dayIndex]
          const slot = day?.[a.slot as 'meal1' | 'meal2']
          if (slot && !hasMealName(slot) && slot.status !== 'skipped') {
            slot.name = a.recipeName
            slot.recipeId = a.recipeId
          }
        }
        plannerMessage.value = '已经补好空位，荤素搭配都考虑了。'
        await savePlan()
        return
      }
    } catch {}

    // 降级：逐个空位独立推荐
    const usedRecipeIds = new Set<string>()
    for (const day of weekPlan.value.meals || []) {
      for (const slot of [day.meal1, day.meal2]) {
        if (slot?.recipeId) usedRecipeIds.add(slot.recipeId)
      }
    }

    let filled = 0
    for (const day of weekPlan.value.meals || []) {
      for (const slot of [day.meal1, day.meal2]) {
        if (!slot || hasMealName(slot) || slot.status === 'skipped') continue
        const suggestions = await recommendRecipes({
          profile: slot.label === '次日便当' ? 'quick' : 'balanced',
          mealType: mealTypeForLabel(slot.label),
          count: 1,
          useFridge: true,
          excludeRecipeIds: Array.from(usedRecipeIds),
        })
        const recipe = suggestions[0]
        if (!recipe) continue
        slot.name = recipe.name
        slot.recipeId = recipe.id
        usedRecipeIds.add(recipe.id)
        filled++
      }
    }
    plannerMessage.value = filled ? '已经补好空位。' : '这周已经排满了。'
    await savePlan()
  } catch (error) {
    console.warn('Recommendation fill failed:', error)
    const shuffled = [...recipes.value].sort(() => Math.random() - 0.5)
    let index = 0
    let exhausted = false
    for (const day of weekPlan.value.meals || []) {
      if (exhausted) break
      for (const slot of [day.meal1, day.meal2]) {
        if (!slot || hasMealName(slot) || slot.status === 'skipped') continue
        const recipe = shuffled[index++]
        if (!recipe) { exhausted = true; break }
        slot.name = recipe.name
        slot.recipeId = recipe.id
      }
    }
    plannerMessage.value = '已经帮你补了一版。'
  } finally {
    aiLoading.value = false
  }
}

const savePlan = async () => {
  if (!planReady.value || saving.value) return false
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  saving.value = true
  try {
    // 自动补全：输入 >= 2 字符且无精确匹配时，匹配第一个包含该文字的菜谱
    for (const day of weekPlan.value.meals || []) {
      for (const slot of [day.meal1, day.meal2]) {
        if (!slot?.name?.trim() || slot.recipeId) continue
        const q = slot.name.trim().toLowerCase()
        if (q.length < 3) continue
        const match = recipes.value.find((r: any) => r.name.toLowerCase().includes(q))
        if (match) {
          slot.name = match.name
          slot.recipeId = match.id
        }
      }
    }

    const meals: any[] = []
    for (const day of weekPlan.value.meals || []) {
      for (const slot of [day.meal1, day.meal2]) {
        if (!slot?.id) continue
        meals.push({
          id: slot.id,
          recipeId: slot.recipeId || null,
          customName: slot.name || null,
          status: slot.status || null,
          skipReason: slot.skipReason || null,
        })
      }
    }
    weekPlan.value = await updateWeekPlan(weekPlan.value.id, meals)
    // 保存后同步购物清单（单独 try，失败不影响计划保存结果）
    try {
      shoppingList.value = await generateShoppingListFromWeekPlan(weekPlan.value.id)
      await refreshCurrentPlan()
      plannerMessage.value = '已保存，清单也同步了。'
    } catch (listErr) {
      console.warn('Shopping list sync failed:', listErr)
      plannerMessage.value = '计划已保存，但清单同步出了问题。'
    }
    return true
  } catch (error) {
    console.warn('Save plan failed:', error)
    plannerMessage.value = '保存失败了，再试一次。'
    return false
  } finally {
    saving.value = false
  }
}

const refreshShoppingList = async () => {
  if (!weekPlan.value.id) return
  await savePlan()
}
</script>

<template>
  <div class="animate-fade-in">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-8">
      <div>
        <p class="text-xs font-bold text-[#A69080] uppercase tracking-widest mb-1 font-sans">Meal Planner</p>
        <div class="flex items-center gap-3">
          <button
            class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E3D6C8] text-[#8B7D6B] hover:bg-[#F5F0EB] transition-colors"
            data-testid="planner-prev-week"
            @click="goToPrevWeek"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div class="text-center">
            <h1 class="text-3xl lg:text-4xl font-serif font-bold text-[#1a1714]">{{ weekPlan.name || '本轮计划' }}</h1>
            <p class="text-sm text-[#8B7D6B] mt-1 font-mono">{{ weekPlan.startDate || '' }} {{ weekPlan.endDate ? '- ' + weekPlan.endDate : '' }}</p>
          </div>
          <button
            class="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E3D6C8] text-[#8B7D6B] hover:bg-[#F5F0EB] transition-colors"
            data-testid="planner-next-week"
            @click="goToNextWeek"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <div class="flex items-center gap-2 mt-1">
          <span v-if="isPastWeek" class="inline-flex items-center rounded-full bg-[#A69080]/15 px-2 py-0.5 text-xs font-medium text-[#8B7D6B]">已过去</span>
          <button
            v-if="isNotCurrentWeek"
            class="text-xs text-[#C06030] hover:text-[#A85028] transition-colors"
            data-testid="planner-back-to-current"
            @click="goToCurrentWeek"
          >
            回到本周
          </button>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          class="bg-[#A69080] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#8B7D6B] transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          :disabled="aiLoading || !planReady"
          data-testid="planner-ai-fill"
          @click="aiFillWeek"
        >
          {{ aiLoading ? '推荐中...' : 'AI 推荐' }}
        </button>
        <button
          class="bg-[#C06030] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#A85028] transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          :disabled="saving || !planReady"
          data-testid="planner-save"
          @click="savePlan"
        >
          {{ saving ? '保存中...' : '保存并同步清单' }}
        </button>
      </div>
    </div>

    <p v-if="plannerMessage" class="mb-4 rounded-lg border border-[#E3D6C8] bg-white/70 px-4 py-3 text-sm text-[#6B5D4D]" data-testid="planner-message">
      {{ plannerMessage }}
    </p>

    <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <div class="w-full min-w-0 flex-1">
        <WeekCalendar
          :meals="weekPlan.meals"
          :active-day="activeDay"
          :recipe-names="recipeNames"
          :is-past="isPastWeek"
          @select-day="activeDay = $event"
          @update-meal1="updateMeal1"
          @update-meal2="updateMeal2"
          @toggle-skip="toggleDaySkip"
        />
      </div>

      <section
        ref="shoppingSectionRef"
        class="w-full scroll-mt-6 rounded-lg border border-[#E3D6C8] bg-white/65 p-4 shadow-[0_1px_0_rgba(90,72,52,0.04)] lg:sticky lg:top-6 lg:w-[340px] lg:p-5"
        aria-label="购物清单"
      >
        <ShoppingList
          v-if="shoppingList?.items?.length"
          :items="shoppingList.items"
          @refresh="refreshShoppingList"
        />
        <div v-else>
          <p class="mb-4 text-sm font-semibold text-[#1a1714]">还没有清单，计划好菜谱后来生成一份</p>
          <div>
            <ShoppingList :items="[]" @refresh="refreshShoppingList" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

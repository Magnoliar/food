function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function mealLabelsForDate(date: Date) {
  const day = date.getDay()
  if (day === 5) return ['晚餐']
  if (day === 0 || day === 6) return ['午餐', '晚餐']
  return ['晚餐', '次日便当']
}

function createEmptyWeekPlan() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tuesdayOffset = (today.getDay() + 5) % 7
  const start = addDays(today, -tuesdayOffset)
  const end = addDays(start, 6)
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

  return {
    id: '',
    name: '本轮计划',
    startDate: formatDate(start),
    endDate: formatDate(end),
    status: 'active',
    weekKey: formatDate(start),
    meals: Array.from({ length: 7 }).map((_, index) => {
      const date = addDays(start, index)
      const labels = mealLabelsForDate(date)
      return {
        date: formatDate(date),
        dayLabel: dayNames[date.getDay()],
        meal1: { id: '', recipeId: null, name: '', label: labels[0], notes: null, status: null, skipReason: null },
        meal2: labels[1] ? { id: '', recipeId: null, name: '', label: labels[1], notes: null, status: null, skipReason: null } : null,
      }
    }),
    shoppingList: {},
  }
}

export function useMockData() {
  const recipes = useState<any[]>('recipes', () => [])
  const weekPlan = useState<any>('weekPlan', () => createEmptyWeekPlan())
  const ingredients = useState<any[]>('ingredients', () => [])
  const tips = useState<any[]>('tips', () => [])
  const tags = useState<any[]>('tags', () => [])
  const apiLoaded = useState('api-loaded', () => false)
  const weekPlanLoaded = useState('week-plan-loaded', () => false)
  const loadPromise = useState<Promise<void> | null>('api-load-promise', () => null)

  const loadFromApi = async () => {
    if (loadPromise.value) return loadPromise.value

    loadPromise.value = (async () => {
      const hasLoadedData = recipes.value.length > 0
        && ingredients.value.length > 0
        && tips.value.length > 0
        && tags.value.length > 0
        && weekPlanLoaded.value

      if (hasLoadedData) {
        apiLoaded.value = true
        return
      }

      try {
        const [apiRecipes, apiIngredients, apiTips, apiTags, apiPlan] = await Promise.allSettled([
          $fetch('/api/recipes'),
        $fetch('/api/ingredients'),
        $fetch('/api/tips'),
        $fetch('/api/tags'),
        $fetch('/api/week-plans/current'),
      ])

      if (apiRecipes.status === 'fulfilled' && Array.isArray(apiRecipes.value) && apiRecipes.value.length > 0) {
        recipes.value = apiRecipes.value
      }
      if (apiIngredients.status === 'fulfilled' && Array.isArray(apiIngredients.value) && apiIngredients.value.length > 0) {
        ingredients.value = apiIngredients.value
      }
      if (apiTips.status === 'fulfilled' && Array.isArray(apiTips.value) && apiTips.value.length > 0) {
        tips.value = apiTips.value
      }
      if (apiTags.status === 'fulfilled' && apiTags.value) {
        const flat: any[] = []
        for (const [dimension, tagList] of Object.entries(apiTags.value as Record<string, any[]>)) {
          for (const tag of tagList) flat.push({ ...tag, dimension })
        }
        tags.value = flat
      }
      if (apiPlan.status === 'fulfilled' && apiPlan.value) {
        weekPlan.value = apiPlan.value
        weekPlanLoaded.value = true
      }
      if (!weekPlanLoaded.value && weekPlan.value?.meals?.length) {
        weekPlanLoaded.value = true
      }
      apiLoaded.value = true
      } catch { /* silent fallback */ }
    })().finally(() => {
      loadPromise.value = null
    })

    return loadPromise.value
  }

  onServerPrefetch(loadFromApi)
  if (import.meta.client) loadFromApi()

  const loadWeekPlanByDate = async (date?: string) => {
    const url = date ? `/api/week-plans/by-date?date=${date}` : '/api/week-plans/current'
    const plan = await $fetch<any>(url)
    if (plan) {
      weekPlan.value = plan
      weekPlanLoaded.value = true
    }
  }

  const tagsByDimension = computed(() => {
    const map: Record<string, any[]> = {}
    for (const tag of tags.value) {
      const dim = tag.dimension || 'other'
      if (!map[dim]) map[dim] = []
      map[dim].push(tag)
    }
    return map
  })

  return {
    recipes,
    weekPlan,
    ingredients,
    tips,
    tags,
    apiLoaded,
    weekPlanLoaded,
    loadFromApi,
    loadWeekPlanByDate,
    tagsByDimension,
  }
}

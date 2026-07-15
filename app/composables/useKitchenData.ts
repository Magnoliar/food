import type { CookingTip, Ingredient, KitchenWeekPlan, Recipe, Tag } from '~/types'
import { getApiErrorMessage } from '~/utils/api-error'

type KitchenResource = 'recipes' | 'ingredients' | 'tips' | 'tags' | 'weekPlan'
interface KitchenLoadResult { ok: boolean; errors: Partial<Record<KitchenResource, string>> }
const activeLoads = new WeakMap<object, Promise<KitchenLoadResult>>()

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next }
function mealLabelsForDate(date: Date) { const day = date.getDay(); if (day === 5) return ['晚餐']; if (day === 0 || day === 6) return ['午餐', '晚餐']; return ['晚餐', '次日便当'] }
function createEmptyWeekPlan(): KitchenWeekPlan {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = addDays(today, -((today.getDay() + 5) % 7))
  const end = addDays(start, 6)
  const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return {
    id: '', name: '本轮计划', startDate: formatDate(start), endDate: formatDate(end), status: 'active', weekKey: formatDate(start), shoppingList: {},
    meals: Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index); const labels = mealLabelsForDate(date)
      const slot = (label: string) => ({ id: '', recipeId: null, name: '', label, notes: null, status: null, skipReason: null })
      return { date: formatDate(date), dayLabel: dayNames[date.getDay()] || '', meal1: slot(labels[0] || '晚餐'), meal2: labels[1] ? slot(labels[1]) : null }
    }),
  }
}

export function useKitchenData() {
  const nuxtApp = useNuxtApp()
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const recipes = useState<Recipe[]>('recipes', () => [])
  const weekPlan = useState<KitchenWeekPlan>('weekPlan', createEmptyWeekPlan)
  const ingredients = useState<Ingredient[]>('ingredients', () => [])
  const tips = useState<CookingTip[]>('tips', () => [])
  const tags = useState<Tag[]>('tags', () => [])
  const apiLoaded = useState('api-loaded', () => false)
  const weekPlanLoaded = useState('week-plan-loaded', () => false)
  const kitchenErrors = useState<Partial<Record<KitchenResource, string>>>('kitchen-errors', () => ({}))
  const kitchenRefreshing = useState('kitchen-refreshing', () => false)
  const lastUpdatedAt = useState<string | null>('kitchen-last-updated', () => null)

  const loadFromApi = async (options: { force?: boolean } = {}): Promise<KitchenLoadResult> => {
    const current = activeLoads.get(nuxtApp)
    if (current) return current
    const hasLoadedData = recipes.value.length > 0 && ingredients.value.length > 0 && tips.value.length > 0 && tags.value.length > 0 && weekPlanLoaded.value
    if (!options.force && hasLoadedData) { apiLoaded.value = true; return { ok: true, errors: {} } }

    const request = (async () => {
      kitchenRefreshing.value = true
      const results = await Promise.allSettled([
        $fetch<Recipe[]>('/api/recipes', { headers: requestHeaders }),
        $fetch<Ingredient[]>('/api/ingredients', { headers: requestHeaders }),
        $fetch<CookingTip[]>('/api/tips', { headers: requestHeaders }),
        $fetch<Record<string, Omit<Tag, 'dimension'>[]>>('/api/tags', { headers: requestHeaders }),
        $fetch<KitchenWeekPlan>('/api/week-plans/current', { headers: requestHeaders }),
      ])
      const errors: Partial<Record<KitchenResource, string>> = {}
      const resourceNames: KitchenResource[] = ['recipes', 'ingredients', 'tips', 'tags', 'weekPlan']
      for (const [index, result] of results.entries()) if (result.status === 'rejected') errors[resourceNames[index]!] = getApiErrorMessage(result.reason, '数据暂时没有加载成功。')
      const [recipeResult, ingredientResult, tipResult, tagResult, planResult] = results
      if (recipeResult.status === 'fulfilled' && Array.isArray(recipeResult.value)) recipes.value = recipeResult.value
      if (ingredientResult.status === 'fulfilled' && Array.isArray(ingredientResult.value)) ingredients.value = ingredientResult.value
      if (tipResult.status === 'fulfilled' && Array.isArray(tipResult.value)) tips.value = tipResult.value
      if (tagResult.status === 'fulfilled' && tagResult.value) {
        tags.value = Object.entries(tagResult.value).flatMap(([dimension, list]) => list.map(tag => ({ ...tag, dimension })))
      }
      if (planResult.status === 'fulfilled' && planResult.value) { weekPlan.value = planResult.value; weekPlanLoaded.value = true }
      if (!weekPlanLoaded.value && weekPlan.value.meals.length) weekPlanLoaded.value = true
      kitchenErrors.value = errors
      apiLoaded.value = true
      lastUpdatedAt.value = new Date().toISOString()
      return { ok: Object.keys(errors).length === 0, errors }
    })().catch((error: unknown) => {
      const message = getApiErrorMessage(error, '厨房数据暂时没有加载成功。')
      kitchenErrors.value = { recipes: message, ingredients: message, tips: message, tags: message, weekPlan: message }
      apiLoaded.value = true
      return { ok: false, errors: kitchenErrors.value }
    }).finally(() => { kitchenRefreshing.value = false; activeLoads.delete(nuxtApp) })
    activeLoads.set(nuxtApp, request)
    return request
  }

  const refresh = () => loadFromApi({ force: true })
  const loadWeekPlanByDate = async (date?: string) => {
    const query = date ? { date } : undefined
    const plan = date
      ? await $fetch<KitchenWeekPlan>('/api/week-plans/by-date', { query, headers: requestHeaders })
      : await $fetch<KitchenWeekPlan>('/api/week-plans/current', { headers: requestHeaders })
    if (plan) { weekPlan.value = plan; weekPlanLoaded.value = true; kitchenErrors.value = { ...kitchenErrors.value, weekPlan: undefined }; lastUpdatedAt.value = new Date().toISOString() }
    return plan
  }
  const tagsByDimension = computed(() => tags.value.reduce<Record<string, Tag[]>>((map, tag) => { const dim = tag.dimension || 'other'; (map[dim] ||= []).push(tag); return map }, {}))

  onServerPrefetch(() => loadFromApi())
  if (import.meta.client && !apiLoaded.value) void loadFromApi()
  return { recipes, weekPlan, ingredients, tips, tags, apiLoaded, weekPlanLoaded, kitchenErrors, kitchenRefreshing, lastUpdatedAt, loadFromApi, loadWeekPlanByDate, refresh, tagsByDimension }
}

import type {
  CookLog, CookLogUpdateInput, FridgeInventory, FridgeItem, Ingredient, IngredientUpdateInput,
  KitchenWeekPlan, PlanMealUpdate, LineArtJob, LineArtSubmitResult, MediaUploadResult, Recipe, RecipeRecommendation,
  RecipeUpdateInput, RecommendationOptions, ShoppingItem, ShoppingItemUpdateInput, ShoppingList,
} from '~/types'

export function useApi() {
  const getRecipes = () => $fetch<Recipe[]>('/api/recipes')
  const updateRecipe = (id: string, data: RecipeUpdateInput) => $fetch<Recipe>(`/api/recipes/${id}`, { method: 'PATCH', body: data })
  const updateIngredient = (id: string, data: IngredientUpdateInput) => $fetch<Ingredient>(`/api/ingredients/${id}`, { method: 'PATCH', body: data })
  const createCookLog = (data: { recipeId: string; selfScore?: number; partnerScore?: number; selfComment?: string; partnerComment?: string; notes?: string; photos?: string[] }) => $fetch<CookLog>('/api/cook-logs', { method: 'POST', body: data })
  const updateCookLog = (id: string, data: CookLogUpdateInput) => $fetch<CookLog>(`/api/cook-logs/${id}`, { method: 'PATCH', body: data })
  const getCookLogs = () => $fetch<CookLog[]>('/api/cook-logs')
  const updateWeekPlan = (id: string, meals: PlanMealUpdate[]) => $fetch<KitchenWeekPlan>(`/api/week-plans/${id}`, { method: 'PATCH', body: { meals } })
  const getCurrentShoppingList = () => $fetch<ShoppingList | null>('/api/shopping-lists/current')
  const generateShoppingListFromWeekPlan = (weekPlanId: string) => $fetch<ShoppingList>('/api/shopping-lists/from-week-plan', { method: 'POST', body: { weekPlanId } })
  const updateShoppingItem = (id: string, data: ShoppingItemUpdateInput) => $fetch<ShoppingItem>(`/api/shopping-lists/items/${id}`, { method: 'PATCH', body: data })
  const addShoppingItem = (data: { name: string; amount?: string; category?: string }) => $fetch<ShoppingItem>('/api/shopping-lists/items', { method: 'POST', body: data })
  const recommendRecipes = (data: RecommendationOptions = {}) => $fetch<RecipeRecommendation[]>('/api/recommendations', { method: 'POST', body: data })
  const uploadMedia = async (file: File, kind = 'general') => { const form = new FormData(); form.append('file', file); form.append('kind', kind); return $fetch<MediaUploadResult>('/api/media/upload', { method: 'POST', body: form }) }
  const aiGenerateRecipe = (name: string) => $fetch<RecipeUpdateInput>('/api/ai/recipe', { method: 'POST', body: { name } })
  const generateAndSaveLineArt = (ingredientName: string, ingredientId: string) => $fetch<LineArtSubmitResult>('/api/xyq/generate-and-save', { method: 'POST', body: { ingredientName, ingredientId } })
  const checkLineArtJob = (jobId: string) => $fetch<LineArtJob>(`/api/xyq/${jobId}`)
  const getLineArtJobs = (ingredientIds: string[]) => $fetch<LineArtJob[]>('/api/xyq/jobs', { query: { ingredientIds: ingredientIds.join(',') } })
  const getFridge = () => $fetch<FridgeInventory>('/api/fridge')
  const addFridgeItem = (data: { name: string; amount?: string; zone?: string; expiryDate?: string }) => $fetch<FridgeItem>('/api/fridge', { method: 'POST', body: data })
  const removeFridgeItem = (id: string) => $fetch<{ success?: boolean }>('/api/fridge', { method: 'DELETE', body: { id } })

  return { getRecipes, updateRecipe, updateIngredient, createCookLog, updateCookLog, getCookLogs, updateWeekPlan, getCurrentShoppingList, generateShoppingListFromWeekPlan, updateShoppingItem, addShoppingItem, recommendRecipes, uploadMedia, aiGenerateRecipe, generateAndSaveLineArt, checkLineArtJob, getLineArtJobs, getFridge, addFridgeItem, removeFridgeItem }
}

// API helper functions for write operations

export function useApi() {
  const getRecipes = async () => {
    return await $fetch('/api/recipes')
  }

  const updateRecipe = async (id: string, data: Record<string, any>) => {
    return await $fetch(`/api/recipes/${id}`, { method: 'PATCH', body: data })
  }

  const updateIngredient = async (id: string, data: Record<string, any>) => {
    return await $fetch(`/api/ingredients/${id}`, { method: 'PATCH', body: data })
  }

  const createCookLog = async (data: {
    recipeId: string
    selfScore?: number
    partnerScore?: number
    selfComment?: string
    partnerComment?: string
    notes?: string
    photos?: string[]
  }) => {
    return await $fetch('/api/cook-logs', { method: 'POST', body: data })
  }

  const updateCookLog = async (id: string, data: Record<string, any>) => {
    return await $fetch(`/api/cook-logs/${id}`, { method: 'PATCH', body: data })
  }

  const getCookLogs = async () => {
    return await $fetch('/api/cook-logs')
  }

  const updateWeekPlan = async (id: string, meals: any[]) => {
    return await $fetch(`/api/week-plans/${id}`, { method: 'PATCH', body: { meals } })
  }

  const getCurrentShoppingList = async () => {
    return await $fetch<any>('/api/shopping-lists/current')
  }

  const generateShoppingListFromWeekPlan = async (weekPlanId: string) => {
    return await $fetch<any>('/api/shopping-lists/from-week-plan', {
      method: 'POST',
      body: { weekPlanId },
    })
  }

  const updateShoppingItem = async (id: string, data: Record<string, any>) => {
    return await $fetch<any>(`/api/shopping-lists/items/${id}`, { method: 'PATCH', body: data })
  }

  const addShoppingItem = async (data: { name: string; amount?: string; category?: string }) => {
    return await $fetch<any>('/api/shopping-lists/items', { method: 'POST', body: data })
  }

  const recommendRecipes = async (data: Record<string, any> = {}) => {
    return await $fetch<any[]>('/api/recommendations', { method: 'POST', body: data })
  }

  const uploadMedia = async (file: File, kind = 'general') => {
    const form = new FormData()
    form.append('file', file)
    form.append('kind', kind)
    return await $fetch<any>('/api/media/upload', { method: 'POST', body: form })
  }

  const aiGenerateRecipe = async (name: string) => {
    return await $fetch('/api/ai/recipe', {
      method: 'POST',
      body: { name },
    })
  }

  const generateAndSaveLineArt = async (ingredientName: string, ingredientId: string) => {
    return await $fetch<any>('/api/xyq/generate-and-save', {
      method: 'POST',
      body: { ingredientName, ingredientId },
    })
  }

  const checkLineArtJob = async (jobId: string) => {
    return await $fetch<any>(`/api/xyq/${jobId}`)
  }

  const getLineArtJobs = async (ingredientIds: string[]) => {
    return await $fetch<any[]>('/api/xyq/jobs', {
      query: { ingredientIds: ingredientIds.join(',') },
    })
  }

  const getFridge = async () => {
    return await $fetch<any>('/api/fridge')
  }

  const addFridgeItem = async (data: { name: string; amount?: string; zone?: string; expiryDate?: string }) => {
    return await $fetch('/api/fridge', { method: 'POST', body: data })
  }

  const removeFridgeItem = async (id: string) => {
    return await $fetch('/api/fridge', { method: 'DELETE', body: { id } })
  }

  return {
    getRecipes,
    updateRecipe,
    updateIngredient,
    createCookLog,
    updateCookLog,
    getCookLogs,
    updateWeekPlan,
    getCurrentShoppingList,
    generateShoppingListFromWeekPlan,
    updateShoppingItem,
    addShoppingItem,
    recommendRecipes,
    uploadMedia,
    aiGenerateRecipe,
    generateAndSaveLineArt,
    checkLineArtJob,
    getLineArtJobs,
    getFridge,
    addFridgeItem,
    removeFridgeItem,
  }
}

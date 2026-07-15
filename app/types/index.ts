export interface Recipe {
  id: string
  name: string
  description?: string
  category?: string
  status: string
  difficulty: number
  estimatedTime: number
  score: number
  cookCount: number
  steps: string[]
  tip?: string
  notes?: string
  coverColor: string
  coverPhotoUrl?: string
  ingredients: RecipeIngredient[]
  tags: string[]
}

export interface RecipeIngredient {
  name: string
  amount?: string
  unit?: string
  ingredientId?: string
  category?: string | null
  optional?: boolean
  lineArtUrl?: string | null
}

export interface Ingredient {
  id: string
  name: string
  category: string
  family: string | null
  lineArtUrl?: string
  crayonColor: string
  usedIn: string[]
  recipeCount: number
  tags?: string[]
}

export interface Tag {
  id: string
  name: string
  dimension: string
  color?: string
  parentId?: string
}

export interface CookLog {
  id: string
  recipeId: string
  userId: string
  date: string
  photos: string[]
  selfScore?: number
  partnerScore?: number
  selfComment?: string
  partnerComment?: string
  notes?: string
  recipe?: { id: string; name: string; tags?: Tag[] }
  user?: { id: string; name: string }
}

export interface CookingTip {
  id: string
  title: string
  content: string
  category?: string
  relatedIngredients?: string[]
}

export interface WeekPlan {
  id: string
  name: string
  startDate: string
  endDate: string
  meals: MealSlot[]
}

export interface MealSlot {
  id: string
  date: string
  mealLabel: string
  recipeId?: string
  customName?: string
  notes?: string
  status?: string | null
  skipReason?: string | null
  recipe?: { id: string; name: string }
}

export interface FridgeItem {
  id: string
  name: string
  amount?: string
  zone: string
  addedDate: string
  expiryDate?: string | null
}


export interface KitchenMealSlot {
  id: string
  recipeId: string | null
  name: string
  label: string
  notes: string | null
  status: string | null
  skipReason: string | null
}

export interface KitchenPlanDay {
  date: string
  dayLabel: string
  meal1: KitchenMealSlot | null
  meal2: KitchenMealSlot | null
}

export interface KitchenWeekPlan {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  weekKey: string
  meals: KitchenPlanDay[]
  shoppingList: Partial<ShoppingList>
}

export interface ShoppingItem {
  id: string
  shoppingListId?: string
  name: string
  amount?: string | null
  category?: string | null
  source?: string | null
  checked: boolean
  inStock: boolean
  manual: boolean
}

export interface ShoppingList {
  id: string
  name: string
  weekPlanId?: string | null
  startDate?: string | null
  endDate?: string | null
  items: ShoppingItem[]
}

export interface FridgeInventory {
  frozen: FridgeItem[]
  refrigerated: FridgeItem[]
  room_temp: FridgeItem[]
}

export interface RecipeRecommendation extends Recipe {
  recommendationScore: number
  reason: string[]
}

export interface RecommendationOptions {
  mealType?: 'dinner' | 'bento' | 'weekend'
  profile?: 'quick' | 'light' | 'spicy' | 'fridge' | 'balanced'
  count?: number
  excludeRecipeIds?: string[]
  useFridge?: boolean
  enrichWithAI?: boolean
}

export interface MediaUploadResult {
  id: string
  url: string
  path?: string
  mimeType?: string
  width?: number
  height?: number
  size?: number
}

export interface LineArtJob {
  id: string
  status: string
  imageUrls: string[]
  selectedUrl: string | null
  error?: string | null
  ingredientName?: string
  ingredientId?: string
  updatedAt?: string
}

export interface LineArtSubmitResult {
  jobId: string | null
  status: 'submitted' | 'already_exists' | 'already_running' | string
  imageUrls?: string[]
  selectedUrl?: string | null
}

export interface ApiErrorInfo {
  statusCode?: number
  message: string
  data?: unknown
}

export type RecipeUpdateInput = Partial<Omit<Recipe, 'id' | 'ingredients'>> & {
  ingredients?: RecipeIngredient[]
}

export type IngredientUpdateInput = Partial<Omit<Ingredient, 'id'>>
export type CookLogUpdateInput = Partial<Omit<CookLog, 'id' | 'recipe' | 'user'>>
export type ShoppingItemUpdateInput = Partial<Pick<ShoppingItem, 'name' | 'amount' | 'category' | 'checked' | 'inStock'>>

export interface PlanMealUpdate { id: string; recipeId: string | null; customName: string | null; status: string | null; skipReason: string | null }

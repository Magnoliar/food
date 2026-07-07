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
  coverColor?: string
  coverPhotoUrl?: string
  ingredients: RecipeIngredient[]
  tags: string[]
}

export interface RecipeIngredient {
  name: string
  amount?: string
  unit?: string
  ingredientId?: string
}

export interface Ingredient {
  id: string
  name: string
  category?: string
  family?: string
  lineArtUrl?: string
  crayonColor?: string
  usedIn?: string[]
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

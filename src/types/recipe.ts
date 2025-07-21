export interface Recipe {
  id: number
  name: string
  description?: string
  category?: string
  preparationTime?: number
  cookingTime?: number
  difficulty?: string
  servings?: number
  createdAt: string
  updatedAt: string
  deletedAt?: string
  isOriginal: boolean
  userId: string
}

export interface Ingredient {
  id?: number
  recipeId?: number
  ingredient: string
  quantity?: number
  unitId?: string
  notes?: string
}

export interface Instruction {
  id?: number
  recipeId?: number
  stepNumber: number
  instruction: string
}

export interface Unit {
  id: string
  name: string
  type: 'mass' | 'volume' | 'unit'
  conversionToBase: number
  isBase: boolean
}

export interface RecipeFormData {
  name: string
  description?: string
  category?: string
  preparationTime?: number
  cookingTime?: number
  difficulty?: string
  servings?: number
  ingredients: Ingredient[]
  instructions: Instruction[]
}
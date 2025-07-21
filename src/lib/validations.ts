import { z } from 'zod'

export const ingredientSchema = z.object({
  ingredient: z.string().min(1, 'El ingrediente es requerido'),
  quantity: z.number().positive('La cantidad debe ser positiva').optional(),
  unit_id: z.string().optional(),
  notes: z.string().optional()
})

export const instructionSchema = z.object({
  step_number: z.number().positive('El número de paso debe ser positivo'),
  instruction: z.string().min(1, 'La instrucción es requerida')
})

export const recipeSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255, 'El nombre es muy largo'),
  description: z.string().optional(),
  category: z.string().optional(),
  preparation_time: z.number().positive('El tiempo de preparación debe ser positivo').optional(),
  cooking_time: z.number().positive('El tiempo de cocción debe ser positivo').optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  servings: z.number().positive('Las porciones deben ser positivas').optional(),
  ingredients: z.array(ingredientSchema).min(1, 'Debe agregar al menos un ingrediente'),
  instructions: z.array(instructionSchema).min(1, 'Debe agregar al menos una instrucción')
})

export type RecipeFormData = z.infer<typeof recipeSchema>
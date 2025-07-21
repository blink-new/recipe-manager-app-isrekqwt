import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Minus, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { blink } from '@/lib/blink'
import { recipeSchema } from '@/lib/validations'
import type { Recipe, Unit } from '@/types/recipe'
import { z } from 'zod'

type RecipeFormData = z.infer<typeof recipeSchema>

export default function RecipeForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [units, setUnits] = useState<Unit[]>([])
  const isEditing = Boolean(id)

  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      preparation_time: 0,
      cooking_time: 0,
      difficulty: 'easy',
      servings: 1,
      ingredients: [{ ingredient: '', quantity: 0, unit_id: '', notes: '' }],
      instructions: [{ step_number: 1, instruction: '' }]
    }
  })

  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({
    control: form.control,
    name: 'ingredients'
  })

  const { fields: instructionFields, append: appendInstruction, remove: removeInstruction } = useFieldArray({
    control: form.control,
    name: 'instructions'
  })

  // Cargar unidades
  useEffect(() => {
    const loadUnits = async () => {
      try {
        const unitsData = await blink.db.units.list()
        setUnits(unitsData)
      } catch (error) {
        console.error('Error loading units:', error)
      }
    }
    loadUnits()
  }, [])

  // Cargar receta si estamos editando
  useEffect(() => {
    if (isEditing && id) {
      const loadRecipe = async () => {
        try {
          setLoading(true)
          const recipe = await blink.db.recipes.list({
            where: { id: id },
            limit: 1
          })

          if (recipe.length > 0) {
            const recipeData = recipe[0]
            
            // Cargar ingredientes
            const ingredients = await blink.db.ingredients.list({
              where: { recipe_id: id }
            })

            // Cargar instrucciones
            const instructions = await blink.db.instructions.list({
              where: { recipe_id: id },
              orderBy: { step_number: 'asc' }
            })

            form.reset({
              name: recipeData.name,
              description: recipeData.description || '',
              category: recipeData.category || '',
              preparation_time: recipeData.preparation_time || 0,
              cooking_time: recipeData.cooking_time || 0,
              difficulty: recipeData.difficulty || 'easy',
              servings: recipeData.servings || 1,
              ingredients: ingredients.length > 0 ? ingredients : [{ ingredient: '', quantity: 0, unit_id: '', notes: '' }],
              instructions: instructions.length > 0 ? instructions : [{ step_number: 1, instruction: '' }]
            })
          }
        } catch (error) {
          console.error('Error loading recipe:', error)
          toast({
            title: 'Error',
            description: 'No se pudo cargar la receta',
            variant: 'destructive'
          })
        } finally {
          setLoading(false)
        }
      }
      loadRecipe()
    }
  }, [id, isEditing, form, toast])

  const onSubmit = async (data: RecipeFormData) => {
    try {
      setLoading(true)

      if (isEditing && id) {
        // Actualizar receta existente
        await blink.db.recipes.update(id, {
          name: data.name,
          description: data.description,
          category: data.category,
          preparation_time: data.preparation_time,
          cooking_time: data.cooking_time,
          difficulty: data.difficulty,
          servings: data.servings,
          updated_at: new Date().toISOString()
        })

        // Eliminar ingredientes e instrucciones existentes
        await blink.db.ingredients.delete({ where: { recipe_id: id } })
        await blink.db.instructions.delete({ where: { recipe_id: id } })
      } else {
        // Crear nueva receta
        const newRecipe = await blink.db.recipes.create({
          name: data.name,
          description: data.description,
          category: data.category,
          preparation_time: data.preparation_time,
          cooking_time: data.cooking_time,
          difficulty: data.difficulty,
          servings: data.servings,
          is_original: true
        })
        id = newRecipe.id
      }

      // Crear ingredientes
      for (const ingredient of data.ingredients) {
        if (ingredient.ingredient.trim()) {
          await blink.db.ingredients.create({
            recipe_id: id,
            ingredient: ingredient.ingredient,
            quantity: ingredient.quantity,
            unit_id: ingredient.unit_id || null,
            notes: ingredient.notes
          })
        }
      }

      // Crear instrucciones
      for (const instruction of data.instructions) {
        if (instruction.instruction.trim()) {
          await blink.db.instructions.create({
            recipe_id: id,
            step_number: instruction.step_number,
            instruction: instruction.instruction
          })
        }
      }

      toast({
        title: 'Éxito',
        description: `Receta ${isEditing ? 'actualizada' : 'creada'} correctamente`
      })

      navigate('/')
    } catch (error) {
      console.error('Error saving recipe:', error)
      toast({
        title: 'Error',
        description: `No se pudo ${isEditing ? 'actualizar' : 'crear'} la receta`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const addIngredient = () => {
    appendIngredient({ ingredient: '', quantity: 0, unit_id: '', notes: '' })
  }

  const addInstruction = () => {
    const nextStep = instructionFields.length + 1
    appendInstruction({ step_number: nextStep, instruction: '' })
  }

  if (loading && isEditing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Cargando receta...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Editar Receta' : 'Nueva Receta'}
          </h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Información básica */}
            <Card>
              <CardHeader>
                <CardTitle>Información Básica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la receta *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Paella Valenciana" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Plato principal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe tu receta..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="preparation_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prep. (min)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cooking_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cocción (min)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="servings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Porciones</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dificultad</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="easy">Fácil</SelectItem>
                            <SelectItem value="medium">Medio</SelectItem>
                            <SelectItem value="hard">Difícil</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Ingredientes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Ingredientes
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addIngredient}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ingredientFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4">
                      <FormField
                        control={form.control}
                        name={`ingredients.${index}.ingredient`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ingrediente</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: Arroz bomba" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`ingredients.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cantidad</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`ingredients.${index}.unit_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unidad</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Unidad" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {units.map((unit) => (
                                  <SelectItem key={unit.id} value={unit.id}>
                                    {unit.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`ingredients.${index}.notes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notas</FormLabel>
                            <FormControl>
                              <Input placeholder="Opcional" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="md:col-span-1">
                      {ingredientFields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeIngredient(index)}
                          className="w-full"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Instrucciones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Instrucciones
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addInstruction}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {instructionFields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name={`instructions.${index}.instruction`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                placeholder={`Paso ${index + 1}...`}
                                className="min-h-[80px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {instructionFields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeInstruction(index)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Botones de acción */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')} Receta
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
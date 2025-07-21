import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Users, ChefHat, Edit, Trash2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { blink } from '@/lib/blink'
import { generateRecipePDF } from '@/lib/pdf-utils'
import type { Recipe, Ingredient, Instruction, Unit } from '@/types/recipe'

interface RecipeWithDetails extends Recipe {
  ingredients: (Ingredient & { unit?: Unit })[]
  instructions: Instruction[]
}

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [recipe, setRecipe] = useState<RecipeWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return

    const loadRecipe = async () => {
      try {
        setLoading(true)
        
        // Cargar receta
        const recipes = await blink.db.recipes.list({
          where: { id: id },
          limit: 1
        })

        if (recipes.length === 0) {
          toast({
            title: 'Error',
            description: 'Receta no encontrada',
            variant: 'destructive'
          })
          navigate('/')
          return
        }

        const recipeData = recipes[0]

        // Cargar ingredientes
        const ingredients = await blink.db.ingredients.list({
          where: { recipe_id: id }
        })

        // Cargar unidades para los ingredientes
        const units = await blink.db.units.list()
        const unitsMap = new Map(units.map(unit => [unit.id, unit]))

        const ingredientsWithUnits = ingredients.map(ingredient => ({
          ...ingredient,
          unit: ingredient.unit_id ? unitsMap.get(ingredient.unit_id) : undefined
        }))

        // Cargar instrucciones
        const instructions = await blink.db.instructions.list({
          where: { recipe_id: id },
          orderBy: { step_number: 'asc' }
        })

        setRecipe({
          ...recipeData,
          ingredients: ingredientsWithUnits,
          instructions
        })
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
  }, [id, navigate, toast])

  const handleDelete = async () => {
    if (!recipe) return

    try {
      setDeleting(true)
      
      // Eliminar ingredientes e instrucciones primero (por las foreign keys)
      await blink.db.ingredients.delete({ where: { recipe_id: recipe.id } })
      await blink.db.instructions.delete({ where: { recipe_id: recipe.id } })
      
      // Eliminar la receta
      await blink.db.recipes.delete(recipe.id)

      toast({
        title: 'Éxito',
        description: 'Receta eliminada correctamente'
      })

      navigate('/')
    } catch (error) {
      console.error('Error deleting recipe:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la receta',
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleExportPDF = async () => {
    if (!recipe) return

    try {
      await generateRecipePDF(recipe)
      toast({
        title: 'Éxito',
        description: 'Receta exportada como PDF correctamente'
      })
    } catch (error) {
      console.error('Error exporting recipe:', error)
      toast({
        title: 'Error',
        description: 'No se pudo exportar la receta a PDF',
        variant: 'destructive'
      })
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Fácil'
      case 'medium': return 'Medio'
      case 'hard': return 'Difícil'
      default: return 'No especificado'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Cargando receta...</div>
        </div>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Receta no encontrada</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">{recipe.name}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/recipe/${recipe.id}/edit`)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la receta "{recipe.name}" y todos sus datos asociados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deleting ? 'Eliminando...' : 'Eliminar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Información básica */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            {recipe.description && (
              <p className="text-gray-600 mb-6">{recipe.description}</p>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-sm text-gray-500">Preparación</div>
                  <div className="font-medium">{recipe.preparation_time || 0} min</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <ChefHat className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-sm text-gray-500">Cocción</div>
                  <div className="font-medium">{recipe.cooking_time || 0} min</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-orange-500" />
                <div>
                  <div className="text-sm text-gray-500">Porciones</div>
                  <div className="font-medium">{recipe.servings || 1}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 flex items-center justify-center">
                  <Badge className={getDifficultyColor(recipe.difficulty || 'easy')}>
                    {getDifficultyText(recipe.difficulty || 'easy')}
                  </Badge>
                </div>
              </div>
            </div>

            {recipe.category && (
              <div className="mt-4 pt-4 border-t">
                <span className="text-sm text-gray-500">Categoría: </span>
                <Badge variant="secondary">{recipe.category}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ingredientes */}
          <Card>
            <CardHeader>
              <CardTitle>Ingredientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">
                        {ingredient.quantity ? `${ingredient.quantity} ` : ''}
                        {ingredient.unit?.name ? `${ingredient.unit.name} ` : ''}
                        {ingredient.ingredient}
                      </span>
                      {ingredient.notes && (
                        <div className="text-sm text-gray-500 mt-1">
                          {ingredient.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Instrucciones */}
          <Card>
            <CardHeader>
              <CardTitle>Instrucciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recipe.instructions.map((instruction, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {instruction.step_number}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-gray-700 leading-relaxed">
                        {instruction.instruction}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
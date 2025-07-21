import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { blink } from '../lib/blink'
import { generateRecipePDF } from '../lib/pdf-utils'
import { Recipe, Ingredient, Instruction, Unit } from '../types/recipe'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { useToast } from '../hooks/use-toast'
import { Plus, Search, Eye, Edit, Trash2, FileDown, Clock, Users } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog'

interface RecipeWithDetails extends Recipe {
  ingredients: (Ingredient & { unit?: Unit })[]
  instructions: Instruction[]
}

export default function RecipeList() {
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { toast } = useToast()

  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true)
      const data = await blink.db.recipes.list({
        where: { 
          deleted_at: null 
        },
        orderBy: { created_at: 'desc' }
      })
      setRecipes(data)
    } catch (error) {
      console.error('Error loading recipes:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las recetas',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadRecipes()
  }, [loadRecipes])

  const deleteRecipe = async (id: string) => {
    try {
      // Eliminar ingredientes e instrucciones primero
      await blink.db.ingredients.delete({ where: { recipe_id: id } })
      await blink.db.instructions.delete({ where: { recipe_id: id } })
      
      // Eliminar la receta
      await blink.db.recipes.delete(id)
      
      setRecipes(recipes.filter(recipe => recipe.id !== id))
      toast({
        title: 'Éxito',
        description: 'Receta eliminada correctamente'
      })
    } catch (error) {
      console.error('Error deleting recipe:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la receta',
        variant: 'destructive'
      })
    }
  }

  const exportToPDF = async (recipe: Recipe) => {
    try {
      // Cargar los detalles completos de la receta
      const ingredients = await blink.db.ingredients.list({
        where: { recipe_id: recipe.id }
      })

      const units = await blink.db.units.list()
      const unitsMap = new Map(units.map(unit => [unit.id, unit]))

      const ingredientsWithUnits = ingredients.map(ingredient => ({
        ...ingredient,
        unit: ingredient.unit_id ? unitsMap.get(ingredient.unit_id) : undefined
      }))

      const instructions = await blink.db.instructions.list({
        where: { recipe_id: recipe.id },
        orderBy: { step_number: 'asc' }
      })

      const recipeWithDetails: RecipeWithDetails = {
        ...recipe,
        ingredients: ingredientsWithUnits,
        instructions
      }

      await generateRecipePDF(recipeWithDetails)
      
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

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyText = (difficulty?: string) => {
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
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Mis Recetas</h2>
            <p className="text-gray-600 mt-1">Gestiona y organiza tus recetas favoritas</p>
          </div>
          <Button 
            onClick={() => navigate('/recipe/new')}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Receta
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Lista de Recetas ({filteredRecipes.length})</span>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar recetas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRecipes.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No se encontraron recetas' : 'No tienes recetas aún'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm 
                    ? 'Intenta con otros términos de búsqueda' 
                    : 'Comienza creando tu primera receta'
                  }
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={() => navigate('/recipe/new')}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Primera Receta
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Dificultad</TableHead>
                      <TableHead className="text-center">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Tiempo
                      </TableHead>
                      <TableHead className="text-center">
                        <Users className="w-4 h-4 inline mr-1" />
                        Porciones
                      </TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecipes.map((recipe) => (
                      <TableRow key={recipe.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold text-gray-900">{recipe.name}</div>
                            {recipe.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {recipe.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {recipe.category && (
                            <Badge variant="outline">{recipe.category}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {recipe.difficulty && (
                            <Badge className={getDifficultyColor(recipe.difficulty)}>
                              {getDifficultyText(recipe.difficulty)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {(recipe.preparation_time || recipe.cooking_time) && (
                            <span className="text-sm text-gray-600">
                              {(recipe.preparation_time || 0) + (recipe.cooking_time || 0)} min
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {recipe.servings && (
                            <span className="text-sm text-gray-600">{recipe.servings}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-500">
                            {new Date(recipe.created_at).toLocaleDateString('es-ES')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/recipe/${recipe.id}`)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/recipe/${recipe.id}/edit`)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => exportToPDF(recipe)}
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            >
                              <FileDown className="w-4 h-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar receta?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. La receta "{recipe.name}" será eliminada permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteRecipe(recipe.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
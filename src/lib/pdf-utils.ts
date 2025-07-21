import jsPDF from 'jspdf'
import type { Recipe, Ingredient, Instruction, Unit } from '@/types/recipe'

interface RecipeWithDetails extends Recipe {
  ingredients: (Ingredient & { unit?: Unit })[]
  instructions: Instruction[]
}

export const generateRecipePDF = async (recipe: RecipeWithDetails): Promise<void> => {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  let currentY = margin

  // Función para agregar texto con salto de línea automático
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false, color: string = '#000000') => {
    pdf.setFontSize(fontSize)
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal')
    
    // Convertir color hex a RGB
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    pdf.setTextColor(r, g, b)
    
    const lines = pdf.splitTextToSize(text, contentWidth)
    const lineHeight = fontSize * 0.4
    
    // Verificar si necesitamos una nueva página
    if (currentY + (lines.length * lineHeight) > pageHeight - margin) {
      pdf.addPage()
      currentY = margin
    }
    
    pdf.text(lines, margin, currentY)
    currentY += lines.length * lineHeight + 5
  }

  // Función para agregar una línea separadora
  const addSeparator = () => {
    if (currentY + 10 > pageHeight - margin) {
      pdf.addPage()
      currentY = margin
    }
    pdf.setDrawColor(249, 115, 22) // Color naranja
    pdf.line(margin, currentY, pageWidth - margin, currentY)
    currentY += 15
  }

  try {
    // Título principal
    addText(recipe.name, 24, true, '#f97316')
    currentY += 5

    // Descripción
    if (recipe.description) {
      addText(recipe.description, 12, false, '#666666')
      currentY += 10
    }

    // Información básica en una tabla
    const getDifficultyText = (difficulty?: string) => {
      switch (difficulty) {
        case 'easy': return 'Fácil'
        case 'medium': return 'Medio'
        case 'hard': return 'Difícil'
        default: return 'No especificado'
      }
    }

    // Crear tabla de información
    const infoData = [
      ['Tiempo de Preparación:', `${recipe.preparation_time || 0} minutos`],
      ['Tiempo de Cocción:', `${recipe.cooking_time || 0} minutos`],
      ['Porciones:', `${recipe.servings || 1}`],
      ['Dificultad:', getDifficultyText(recipe.difficulty)],
      ...(recipe.category ? [['Categoría:', recipe.category]] : [])
    ]

    // Dibujar tabla de información
    const tableStartY = currentY
    const rowHeight = 8
    const col1Width = contentWidth * 0.4
    const col2Width = contentWidth * 0.6

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(0, 0, 0)

    infoData.forEach((row, index) => {
      const y = tableStartY + (index * rowHeight)
      
      // Verificar si necesitamos nueva página
      if (y + rowHeight > pageHeight - margin) {
        pdf.addPage()
        currentY = margin
        return
      }
      
      // Columna 1 (etiqueta) - en negrita
      pdf.setFont('helvetica', 'bold')
      pdf.text(row[0], margin, y)
      
      // Columna 2 (valor)
      pdf.setFont('helvetica', 'normal')
      pdf.text(row[1], margin + col1Width, y)
    })

    currentY = tableStartY + (infoData.length * rowHeight) + 15

    // Separador
    addSeparator()

    // Sección de Ingredientes
    addText('Ingredientes', 18, true, '#f97316')
    currentY += 5

    recipe.ingredients.forEach((ingredient, index) => {
      const ingredientText = `• ${ingredient.quantity ? `${ingredient.quantity} ` : ''}${ingredient.unit?.name || ''} ${ingredient.ingredient}${ingredient.notes ? ` (${ingredient.notes})` : ''}`
      addText(ingredientText, 11)
    })

    currentY += 10
    addSeparator()

    // Sección de Instrucciones
    addText('Instrucciones', 18, true, '#f97316')
    currentY += 5

    recipe.instructions.forEach((instruction, index) => {
      // Número del paso
      const stepText = `${instruction.step_number}. ${instruction.instruction}`
      addText(stepText, 11)
      currentY += 3
    })

    // Footer
    const footerY = pageHeight - 15
    pdf.setFontSize(8)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(128, 128, 128)
    pdf.text('Generado con Recipe Manager App', margin, footerY)
    pdf.text(new Date().toLocaleDateString('es-ES'), pageWidth - margin - 30, footerY)

    // Descargar el PDF
    const fileName = `${recipe.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
    pdf.save(fileName)

  } catch (error) {
    console.error('Error generating PDF:', error)
    throw new Error('No se pudo generar el PDF')
  }
}
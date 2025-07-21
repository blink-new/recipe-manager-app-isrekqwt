import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { blink } from './lib/blink'
import { Toaster } from './components/ui/toaster'
import RecipeList from './components/RecipeList'
import RecipeForm from './components/RecipeForm'
import RecipeDetail from './components/RecipeDetail'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-orange-600 mb-4">Recipe Manager</h1>
          <p className="text-gray-600 mb-8">Gestiona tus recetas de manera profesional</p>
          <button
            onClick={() => blink.auth.login()}
            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-orange-600">
                  Recipe Manager
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-600">Hola, {user.email}</span>
                <button
                  onClick={() => blink.auth.logout()}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={<RecipeList />} />
          <Route path="/recipe/new" element={<RecipeForm />} />
          <Route path="/recipe/:id" element={<RecipeDetail />} />
          <Route path="/recipe/:id/edit" element={<RecipeForm />} />
        </Routes>

        <Toaster />
      </div>
    </Router>
  )
}

export default App
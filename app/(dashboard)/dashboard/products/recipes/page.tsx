'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  Eye
} from 'lucide-react'
import Link from 'next/link'
import { RecipeForm } from './recipe-form'

interface RecipeItem {
  id?: string
  recipe_id?: string
  raw_material_id: string
  raw_material_name?: string
  quantity: number
  unit_cost?: number
  total_cost?: number
}

interface Recipe {
  id?: string
  name: string
  description?: string
  items: RecipeItem[]
  total_price?: number
  is_active: boolean
}

export default function ProductRecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchRecipes()
  }, [])

  // Filter recipes whenever search term or recipes change
  useEffect(() => {
    const term = searchTerm.toLowerCase()
    const filtered = recipes.filter(recipe => 
      recipe.name.toLowerCase().includes(term)
    )
    setFilteredRecipes(filtered)
  }, [searchTerm, recipes])

  const fetchRecipes = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch recipes with their items and calculate total price
      const { data: recipesData, error: recipesError } = await supabase
        .from('product_recipes')
        .select(`
          *,
          items:recipe_items(
            *,
            raw_material:raw_materials(name)
          )
        `)
        .order('name')
      
      if (recipesError) throw recipesError
      
      // Format recipes with items and calculate total price
      const formattedRecipes = (recipesData || []).map(recipe => ({
        ...recipe,
        items: (recipe.items || []).map(item => ({
          ...item,
          raw_material_name: item.raw_material?.name
        })),
        // Calculate total price from recipe items
        total_price: (recipe.items || []).reduce(
          (total, item) => total + (item.total_cost || 0), 
          0
        )
      }))
      
      setRecipes(formattedRecipes)
    } catch (error: any) {
      console.error('Error fetching recipes:', error)
      setError(error.message || 'Failed to load recipes. Please check your connection or permissions.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRecipe = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        const { error } = await supabase
          .from('product_recipes')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        // Refresh recipes list
        fetchRecipes()
      } catch (error: any) {
        console.error('Error deleting recipe:', error)
        setError(error.message || 'Failed to delete recipe. Please try again.')
      }
    }
  }

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe)
    setShowForm(true)
  }

  const handleSaveRecipe = () => {
    // Close form
    setShowForm(false)
    setEditingRecipe(null)
    
    // Refresh data
    fetchRecipes()
  }

  return (
    <div className="space-y-8">
      {/* Error Notification */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
          <span 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.03a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Product Recipes</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Create and manage recipes for your products
          </p>
        </div>
        <button
          onClick={() => {
            setEditingRecipe(null)
            setShowForm(true)
          }}
          className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="h-5 w-5" />
          Create New Recipe
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          placeholder="Search by recipe name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Recipes Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recipe Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ingredients
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Price
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredRecipes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="pxx-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No recipes found.
                  </td>
                </tr>
              ) : (
                filteredRecipes.map((recipe) => (
                  <tr key={recipe.id} className={!recipe.is_active ? 'bg-gray-50 dark:bg-gray-900' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {recipe.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {recipe.description || 'No description'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col">
                        <span className="font-medium">{recipe.items.length} ingredients</span>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate max-w-xs">
                          {recipe.items.slice(0, 2).map(item => 
                            `${item.raw_material_name} (${item.quantity})`
                          ).join(', ')}
                          {recipe.items.length > 2 && '...'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      £{recipe.total_price?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        recipe.is_active 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {recipe.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-x-3">
                        <Link
                          href={`/dashboard/products/recipes/${recipe.id}`}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleEditRecipe(recipe)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => recipe.id && handleDeleteRecipe(recipe.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recipe Form Modal */}
      {showForm && (
        <RecipeForm
          recipe={editingRecipe}
          onClose={() => {
            setShowForm(false)
            setEditingRecipe(null)
          }}
          onSubmit={handleSaveRecipe}
        />
      )}
    </div>
  )
}

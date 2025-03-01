'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  Eye,
  Clipboard,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { RecipeForm } from '@/components/products/recipes/recipe-form'

// Recipe interfaces
interface RecipeItem {
  id?: string
  recipe_id?: string
  raw_material_id: string
  raw_material_name?: string
  quantity: number
  unit?: string
  unit_cost?: number
}

interface Recipe {
  id?: string
  name: string
  description?: string
  final_product_id: string
  final_product_name?: string
  yield_quantity: number
  production_cost?: number
  is_active: boolean
  items: RecipeItem[]
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
      recipe.name.toLowerCase().includes(term) ||
      recipe.final_product_name?.toLowerCase().includes(term)
    )
    setFilteredRecipes(filtered)
  }, [searchTerm, recipes])

  const fetchRecipes = async () => {
    setLoading(true)
    setError(null)
    try {
      // First, get recipes with final product name
      const { data: recipesData, error: recipesError } = await supabase
        .from('product_recipes')
        .select(`
          *,
          final_products(name)
        `)
        .order('name')
      
      if (recipesError) throw recipesError
      
      if (!recipesData || recipesData.length === 0) {
        setRecipes([])
        setLoading(false)
        return
      }
      
      // Format recipes with product name
      const formattedRecipes = recipesData.map(recipe => ({
        ...recipe,
        final_product_name: recipe.final_products?.name,
        items: [] // Will be populated with recipe items
      }))
      
      // Now get all recipe items
      const recipeIds = formattedRecipes.map(r => r.id)
      const { data: recipeItemsData, error: itemsError } = await supabase
        .from('recipe_items')
        .select(`
          *,
          raw_materials(name, unit)
        `)
        .in('recipe_id', recipeIds)
      
      if (itemsError) throw itemsError
      
      // Group recipe items by recipe_id
      const itemsByRecipe: Record<string, RecipeItem[]> = {}
      
      recipeItemsData?.forEach(item => {
        if (!itemsByRecipe[item.recipe_id]) {
          itemsByRecipe[item.recipe_id] = []
        }
        
        itemsByRecipe[item.recipe_id].push({
          ...item,
          raw_material_name: item.raw_materials?.name,
          unit: item.raw_materials?.unit
        })
      })
      
      // Add items to their recipes
      const recipesWithItems = formattedRecipes.map(recipe => ({
        ...recipe,
        items: itemsByRecipe[recipe.id as string] || []
      }))
      
      setRecipes(recipesWithItems)
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
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
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
          <h2 className="text-2xl font-bold">Product Recipes</h2>
          <p className="text-gray-600">Create and manage recipes for your final products</p>
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
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name or product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {/* Recipes Table */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipe Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Final Product
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Yield
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Production Cost
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ingredients
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredRecipes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500">
                    No recipes found.
                  </td>
                </tr>
              ) : (
                filteredRecipes.map((recipe) => (
                  <tr key={recipe.id} className={!recipe.is_active ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {recipe.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {recipe.final_product_name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {recipe.yield_quantity || 1} {recipe.yield_quantity > 1 ? 'units' : 'unit'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {recipe.production_cost ? `£${recipe.production_cost.toFixed(2)}` : 'Calculated on production'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      <div className="flex flex-col">
                        <span className="font-medium">{recipe.items.length} ingredients</span>
                        <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">
                          {recipe.items.slice(0, 2).map(item => item.raw_material_name).join(', ')}
                          {recipe.items.length > 2 && '...'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        recipe.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {recipe.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-x-3">
                        <Link
                          href={`/dashboard/products/recipes/${recipe.id}`}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleEditRecipe(recipe)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => recipe.id && handleDeleteRecipe(recipe.id)}
                          className="text-red-600 hover:text-red-900"
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

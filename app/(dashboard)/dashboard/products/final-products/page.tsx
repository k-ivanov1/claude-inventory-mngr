'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search 
} from 'lucide-react'
import { FinalProductForm } from './final-product-form'

// Updated Final Product interface
export interface FinalProduct {
  id?: string
  name: string
  recipe_id?: string
  recipe_name?: string
  category: string
  unit_selling_price: number
  recipe_cost: number
  markup: number
  profit_margin: number
  profit_per_item: number
  is_active: boolean
}

export default function FinalProductsPage() {
  const [finalProducts, setFinalProducts] = useState<FinalProduct[]>([])
  const [filteredProducts, setFilteredProducts] = useState<FinalProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<FinalProduct | null>(null)
  const [categories, setCategories] = useState<string[]>(['tea', 'coffee', 'gear', 'packaging', 'books'])
  const [recipes, setRecipes] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchFinalProducts()
    fetchRecipes()
    fetchCategories()
  }, [])

  // Filter products whenever search term or products change
  useEffect(() => {
    const term = searchTerm.toLowerCase()
    const filtered = finalProducts.filter(product =>
      product.name.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term) ||
      (product.recipe_name && product.recipe_name.toLowerCase().includes(term))
    )
    setFilteredProducts(filtered)
  }, [searchTerm, finalProducts])

  const fetchFinalProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('final_products')
        .select(
          *,
          recipe:recipe_id(name, total_price)
        )
        .order('name')
      
      if (error) throw error
      
      // Transform data to include calculated fields
      const processedProducts = (data || []).map(product => {
        const recipeCost = product.recipe?.total_price || 0
        const unitSellingPrice = product.unit_price || 0
        const markup = recipeCost > 0 
          ? ((unitSellingPrice - recipeCost) / recipeCost) * 100 
          : 0
        const profitPerItem = unitSellingPrice - recipeCost
        const profitMargin = recipeCost > 0 
          ? ((unitSellingPrice - recipeCost) / unitSellingPrice) * 100 
          : 0

        return {
          ...product,
          recipe_name: product.recipe?.name,
          recipe_cost: recipeCost,
          unit_selling_price: unitSellingPrice,
          markup: Number(markup.toFixed(2)),
          profit_margin: Number(profitMargin.toFixed(2)),
          profit_per_item: Number(profitPerItem.toFixed(2))
        }
      })
      
      setFinalProducts(processedProducts)
    } catch (error: any) {
      console.error('Error fetching final products:', error)
      setError(error.message || 'Failed to load final products. Please check your connection or permissions.')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('product_recipes')
        .select('id, name, total_price')
        .eq('is_active', true)
      
      if (error) throw error
      
      setRecipes(data || [])
    } catch (error: any) {
      console.error('Error fetching recipes:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('name')
      
      if (error) throw error
      
      if (data && data.length > 0) {
        setCategories(data.map((category: any) => category.name))
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleAddProduct = async (productData: FinalProduct) => {
    setError(null)
    try {
      // Validate required fields
      if (!productData.name || !productData.category || !productData.recipe_id) {
        throw new Error('Name, category, and recipe are required.')
      }

      // Prepare data for submission
      const dataToSubmit = {
        name: productData.name,
        category: productData.category,
        recipe_id: productData.recipe_id,
        is_active: productData.is_active ?? true,
        unit_price: productData.unit_selling_price
      }

      let result
      if (editingProduct?.id) {
        // Update existing product
        result = await supabase
          .from('final_products')
          .update(dataToSubmit)
          .eq('id', editingProduct.id)
          .select()
      } else {
        // Insert new product
        result = await supabase
          .from('final_products')
          .insert(dataToSubmit)
          .select()
      }

      if (result.error) throw result.error

      // Refresh products list
      fetchFinalProducts()
      
      // Close form
      setShowForm(false)
      setEditingProduct(null)
    } catch (error: any) {
      console.error('Error saving final product:', error)
      setError(error.message || 'Failed to save final product. Please check your input and try again.')
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this final product?')) {
      try {
        const { error } = await supabase
          .from('final_products')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        // Refresh products list
        fetchFinalProducts()
      } catch (error: any) {
        console.error('Error deleting final product:', error)
        setError(error.message || 'Failed to delete final product. Please try again.')
      }
    }
  }

  const handleEditProduct = (product: FinalProduct) => {
    setEditingProduct(product)
    setShowForm(true)
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Final Products</h2>
          <p className="text-gray-600 dark:text-gray-300">Manage your finished products catalog</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null)
            setShowForm(true)
          }}
          className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="h-5 w-5" />
          Add Final Product
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          placeholder="Search by name, recipe, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recipe
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recipe Cost
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Selling Price
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Markup %
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Profit Margin %
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Profit per Item
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
                  <td colSpan={10} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">Loading...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">No final products found.</td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{product.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{product.recipe_name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{product.category}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">£{product.recipe_cost.toFixed(2)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">£{product.unit_selling_price.toFixed(2)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{product.markup.toFixed(2)}%</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{product.profit_margin.toFixed(2)}%</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">£{product.profit_per_item.toFixed(2)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        product.is_active 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-x-3">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => product.id && handleDeleteProduct(product.id)}
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

      {/* Final Product Form Modal */}
      {showForm && (
        <FinalProductForm
          product={editingProduct}
          recipes={recipes}
          categories={categories}
          onClose={() => {
            setShowForm(false)
            setEditingProduct(null)
          }}
          onSubmit={handleAddProduct}
        />
      )}
    </div>
  )
}

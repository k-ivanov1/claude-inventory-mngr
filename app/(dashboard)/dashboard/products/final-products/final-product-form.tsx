'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { FinalProduct } from './page'

interface FinalProductFormProps {
  product?: FinalProduct | null
  recipes: any[]
  categories: string[]
  onClose: () => void
  onSubmit: (product: FinalProduct) => void
}

export function FinalProductForm({ 
  product, 
  recipes, 
  categories, 
  onClose, 
  onSubmit 
}: FinalProductFormProps) {
  const [formData, setFormData] = useState<FinalProduct>({
    name: product?.name || '',
    sku: product?.sku || '', // Added SKU field
    recipe_id: product?.recipe_id || '',
    recipe_name: product?.recipe_name || '',
    category: product?.category || (categories[0] || ''),
    unit_selling_price: product?.unit_selling_price || 0,
    recipe_cost: product?.recipe_cost || 0,
    markup: product?.markup || 0,
    profit_margin: product?.profit_margin || 0,
    profit_per_item: product?.profit_per_item || 0,
    is_active: product?.is_active ?? true
  })
  const [error, setError] = useState<string | null>(null)
  const [calculatedValues, setCalculatedValues] = useState({
    recipeCost: 0,
    markup: 0,
    profitMargin: 0,
    profitPerItem: 0
  })

  // Function to generate SKU
  const generateSKU = () => {
    if (!formData.category) {
      setError('Please select a category first to generate SKU')
      return
    }
    
    const prefix = formData.category.substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString().substring(9, 13)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    
    const sku = `${prefix}-${timestamp}${random}`
    setFormData({...formData, sku})
  }

  // Recalculate values when recipe or selling price changes
  useEffect(() => {
    const selectedRecipe = recipes.find(r => r.id === formData.recipe_id)
    const recipeCost = selectedRecipe?.total_price || 0
    const sellingPrice = formData.unit_selling_price

    const markup = recipeCost > 0 
      ? ((sellingPrice - recipeCost) / recipeCost) * 100 
      : 0
    const profitPerItem = sellingPrice - recipeCost
    const profitMargin = recipeCost > 0 
      ? ((sellingPrice - recipeCost) / sellingPrice) * 100 
      : 0

    setCalculatedValues({
      recipeCost,
      markup: Number(markup.toFixed(2)),
      profitMargin: Number(profitMargin.toFixed(2)),
      profitPerItem: Number(profitPerItem.toFixed(2))
    })

    // Update form data with calculated values
    setFormData(prev => ({
      ...prev,
      recipe_cost: recipeCost,
      markup: Number(markup.toFixed(2)),
      profit_margin: Number(profitMargin.toFixed(2)),
      profit_per_item: Number(profitPerItem.toFixed(2))
    }))
  }, [formData.recipe_id, formData.unit_selling_price, recipes])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checkboxInput = e.target as HTMLInputElement
      setFormData({ ...formData, [name]: checkboxInput.checked })
    } else if (type === 'number') {
      const numValue = parseFloat(value) || 0
      setFormData({ ...formData, [name]: numValue })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      // Validate required fields
      if (!formData.name || !formData.category || !formData.recipe_id) {
        throw new Error('Name, category, and recipe are required.')
      }

      // Submit the form data
      onSubmit(formData)
    } catch (err: any) {
      setError(err.message || 'Failed to save final product. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative mb-4" role="alert">
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

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {product ? 'Edit Final Product' : 'Add New Final Product'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Product Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            {/* SKU Field */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  SKU
                </label>
                <button 
                  type="button" 
                  onClick={generateSKU} 
                  className="text-xs text-indigo-600 dark:text-indigo-400"
                >
                  Generate SKU
                </button>
              </div>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Recipe Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Recipe
              </label>
              <select
                name="recipe_id"
                value={formData.recipe_id}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              >
                <option value="">Select a recipe</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name} - £{recipe.total_price?.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit Selling Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Selling Price (£)
              </label>
              <input
                type="number"
                name="unit_selling_price"
                value={formData.unit_selling_price}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
          </div>

          {/* Financial Insights */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Recipe Cost
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm sm:text-sm text-gray-900 dark:text-gray-100">
                £{calculatedValues.recipeCost.toFixed(2)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Markup %
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm sm:text-sm text-gray-900 dark:text-gray-100">
                {calculatedValues.markup.toFixed(2)}%
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Profit Margin %
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm sm:text-sm text-gray-900 dark:text-gray-100">
                {calculatedValues.profitMargin.toFixed(2)}%
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Profit per Item
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm sm:text-sm text-gray-900 dark:text-gray-100">
                £{calculatedValues.profitPerItem.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Active Status */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="is_active" className="font-medium text-gray-700 dark:text-gray-300">
                  Active
                </label>
                <p className="text-gray-500 dark:text-gray-400">
                  Inactive products won't appear in sales or production lists
                </p>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              {product ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

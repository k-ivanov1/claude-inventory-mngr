'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, Plus, Trash2 } from 'lucide-react'

interface RawMaterial {
  id: string
  name: string
  unit: string
  current_stock?: number
  unit_price?: number // Added unit price
}

interface RecipeItem {
  id?: string
  recipe_id?: string
  raw_material_id: string
  raw_material_name?: string
  quantity: number
  unit?: string
  unit_cost?: number
  total_cost?: number // Added total cost
}

interface Recipe {
  id?: string
  name: string
  description?: string
  items: RecipeItem[]
  total_price?: number // Added total price for the entire recipe
  is_active: boolean
}

interface RecipeFormProps {
  recipe?: Recipe | null
  onClose: () => void
  onSubmit: () => void
}

export function RecipeForm({ 
  recipe, 
  onClose, 
  onSubmit 
}: RecipeFormProps) {
  const [loading, setLoading] = useState(false)
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<Recipe>({
    name: '',
    description: '',
    items: [],
    is_active: true,
    total_price: 0
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    if (recipe) {
      setFormData({
        ...recipe,
        description: recipe.description || '',
      })
    }
    
    fetchRawMaterials()
  }, [recipe])

  const fetchRawMaterials = async () => {
    try {
      // Get raw materials with their current inventory levels and prices
      const { data: materialsData, error: materialsError } = await supabase
        .from('raw_materials')
        .select('id, name, unit')
        .eq('is_active', true)
        .order('name')
      
      if (materialsError) throw materialsError
      
      // Get inventory and pricing data
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select('item_id, current_stock, unit_price')
        .eq('item_type', 'raw_material')
      
      if (inventoryError) throw inventoryError
      
      // Combine data
      const materialsWithPricing = (materialsData || []).map(material => {
        const inventory = inventoryData?.find(inv => inv.item_id === material.id)
        return {
          ...material,
          current_stock: inventory?.current_stock || 0,
          unit_price: inventory?.unit_price || 0
        }
      })
      
      setRawMaterials(materialsWithPricing)
    } catch (error: any) {
      console.error('Error fetching raw materials:', error)
      setError('Failed to load raw materials. Please try again.')
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checkboxInput = e.target as HTMLInputElement
      setFormData({ ...formData, [name]: checkboxInput.checked })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const addRecipeItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { raw_material_id: '', quantity: 1 }]
    })
  }

  const removeRecipeItem = (index: number) => {
    const newItems = [...formData.items]
    newItems.splice(index, 1)
    
    // Recalculate total price
    const updatedTotalPrice = calculateTotalPrice(newItems)
    
    setFormData({ 
      ...formData, 
      items: newItems,
      total_price: updatedTotalPrice
    })
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items]
    
    if (field === 'raw_material_id') {
      const selectedMaterial = rawMaterials.find(material => material.id === value)
      
      // Update item with material details
      newItems[index] = {
        ...newItems[index],
        raw_material_id: value,
        raw_material_name: selectedMaterial?.name,
        unit: selectedMaterial?.unit,
        unit_cost: selectedMaterial?.unit_price || 0
      }
    } else if (field === 'quantity') {
      // Update quantity and calculate total cost
      newItems[index] = { 
        ...newItems[index], 
        [field]: value,
        total_cost: (newItems[index].unit_cost || 0) * value
      }
    }
    
    // Recalculate total recipe price
    const updatedTotalPrice = calculateTotalPrice(newItems)
    
    setFormData({ 
      ...formData, 
      items: newItems,
      total_price: updatedTotalPrice
    })
  }

  const calculateTotalPrice = (items: RecipeItem[]) => {
    return items.reduce((total, item) => 
      total + (item.unit_cost || 0) * (item.quantity || 0), 
      0
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.name) {
        throw new Error('Recipe name is required.');
      }

      if (formData.items.length === 0) {
        throw new Error('Recipe must have at least one ingredient.');
      }

      // Validate each item has a material and quantity
      const invalidItem = formData.items.find(item => !item.raw_material_id || item.quantity <= 0);
      if (invalidItem) {
        throw new Error('All ingredients must have a raw material and a positive quantity.');
      }

      // Prepare recipe data
      const recipeData = {
        name: formData.name,
        description: formData.description || null,
        is_active: formData.is_active,
        total_price: formData.total_price
      }

      let savedRecipeId

      if (recipe?.id) {
        // Update existing recipe
        const { data: updatedRecipe, error: updateError } = await supabase
          .from('product_recipes')
          .update(recipeData)
          .eq('id', recipe.id)
          .select()
        
        if (updateError) throw updateError
        
        savedRecipeId = recipe.id
        
        // Delete existing recipe items
        const { error: deleteError } = await supabase
          .from('recipe_items')
          .delete()
          .eq('recipe_id', recipe.id)
        
        if (deleteError) throw deleteError
      } else {
        // Insert new recipe
        const { data: newRecipe, error: insertError } = await supabase
          .from('product_recipes')
          .insert(recipeData)
          .select()
        
        if (insertError) throw insertError
        
        savedRecipeId = newRecipe[0].id
      }

      // Insert or update recipe items
      if (savedRecipeId) {
        const recipeItems = formData.items.map(item => ({
          recipe_id: savedRecipeId,
          raw_material_id: item.raw_material_id,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          total_cost: item.total_cost
        }))
        
        const { error: itemsError } = await supabase
          .from('recipe_items')
          .insert(recipeItems)
        
        if (itemsError) throw itemsError
      }

      // Call the onSubmit callback
      onSubmit()
    } catch (error: any) {
      console.error('Error saving recipe:', error)
      setError(error.message || 'Failed to save recipe. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
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
            {recipe ? 'Edit Recipe' : 'Create New Recipe'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Recipe Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Recipe Name
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Recipe Ingredients */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-medium text-gray-900 dark:text-white">Recipe Ingredients</h4>
              <button
                type="button"
                onClick={addRecipeItem}
                className="inline-flex items-center rounded border border-transparent bg-indigo-100 dark:bg-indigo-900 px-2.5 py-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Ingredient
              </button>
            </div>

            {formData.items.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-md">
                No ingredients added yet. Add raw materials to your recipe.
              </div>
            ) : (
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end border-b dark:border-gray-700 pb-3">
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Raw Material
                      </label>
                      <select
                        value={item.raw_material_id}
                        onChange={(e) => handleItemChange(index, 'raw_material_id', e.target.value)}
                        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                      >
                        <option value="">Select material</option>
                        {rawMaterials.map((material) => (
                          <option key={material.id} value={material.id}>
                            {material.name} ({material.unit}) - £{material.unit_price?.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Unit Price
                      </label>
                      <div className="block w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        £{item.unit_cost?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Total Cost
                      </label>
                      <div className="block w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        £{item.total_cost?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeRecipeItem(index)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total Price Section */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-medium text-gray-900 dark:text-white">Total Recipe Cost</h4>
              <div className="text-lg font-medium text-gray-900 dark:text-white">
                £{formData.total_price?.toFixed(2) || '0.00'}
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              This is the calculated cost based on the current prices of ingredients.
            </p>
          </div>

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
              <p className="text-gray-500 dark:text-gray-400">Inactive recipes won't be available for production</p>
            </div>
          </div>

          <div className="flex justify-end gap-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : recipe ? 'Update Recipe' : 'Create Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

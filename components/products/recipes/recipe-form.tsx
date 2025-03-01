'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, Plus, Trash2 } from 'lucide-react'

interface RawMaterial {
  id: string
  name: string
  unit: string
  current_stock?: number
  unit_cost?: number
}

interface FinalProduct {
  id: string
  name: string
  unit: string
}

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
  const [finalProducts, setFinalProducts] = useState<FinalProduct[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<Recipe>({
    name: '',
    description: '',
    final_product_id: '',
    yield_quantity: 1,
    is_active: true,
    items: []
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    if (recipe) {
      setFormData({
        ...recipe,
        // Set empty string to undefined for optional fields
        description: recipe.description || '',
      })
    }
    
    fetchRawMaterials()
    fetchFinalProducts()
  }, [recipe])

  const fetchRawMaterials = async () => {
    try {
      // Get raw materials with their current inventory levels
      const { data: materialsData, error: materialsError } = await supabase
        .from('raw_materials')
        .select('id, name, unit')
        .eq('is_active', true)
        .order('name')
      
      if (materialsError) throw materialsError
      
      // Get inventory data
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select('item_id, current_stock')
        .eq('item_type', 'raw_material')
      
      if (inventoryError) throw inventoryError
      
      // Combine data
      const materialsWithInventory = (materialsData || []).map(material => {
        const inventory = inventoryData?.find(inv => inv.item_id === material.id)
        return {
          ...material,
          current_stock: inventory?.current_stock || 0
        }
      })
      
      setRawMaterials(materialsWithInventory)
    } catch (error: any) {
      console.error('Error fetching raw materials:', error)
      setError('Failed to load raw materials. Please try again.')
    }
  }

  const fetchFinalProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('final_products')
        .select('id, name, unit')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      
      setFinalProducts(data || [])
    } catch (error: any) {
      console.error('Error fetching final products:', error)
      setError('Failed to load final products. Please try again.')
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checkboxInput = e.target as HTMLInputElement
      setFormData({ ...formData, [name]: checkboxInput.checked })
    } else if (type === 'number') {
      setFormData({ ...formData, [name]: parseFloat(value) || 0 })
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
    setFormData({ ...formData, items: newItems })
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items]
    
    if (field === 'raw_material_id') {
      const selectedMaterial = rawMaterials.find(material => material.id === value)
      newItems[index] = {
        ...newItems[index],
        raw_material_id: value,
        raw_material_name: selectedMaterial?.name,
        unit: selectedMaterial?.unit
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value }
    }
    
    setFormData({ ...formData, items: newItems })
  }

const calculateTotalCost = () => {
  // This would normally be calculated based on current raw material prices
  // For now, we'll return a placeholder value
  return formData.items.reduce((total, item) => {
    const material = rawMaterials.find(m => m.id === item.raw_material_id)
    // In a real app, you'd multiply by the actual unit cost from inventory
    return total + (item.quantity * (material?.unit_cost || 0))
  }, 0)
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  try {
    // Validate required fields
    if (!formData.name || !formData.final_product_id) {
      throw new Error('Recipe name and final product are required fields.');
    }

    if (formData.items.length === 0) {
      throw new Error('Recipe must have at least one ingredient.');
    }

    // Validate each item has a material and quantity
    const invalidItem = formData.items.find(item => !item.raw_material_id || item.quantity <= 0);
    if (invalidItem) {
      throw new Error('All ingredients must have a raw material and a positive quantity.');
    }

    if (recipe?.id) {
      // Update existing recipe
      // Since we can't use transactions directly, we'll perform operations sequentially
      
      // 1. Update recipe
      const { error: recipeError } = await supabase
        .from('product_recipes')
        .update({
          name: formData.name,
          description: formData.description || null,
          final_product_id: formData.final_product_id,
          yield_quantity: formData.yield_quantity,
          is_active: formData.is_active
        })
        .eq('id', recipe.id);
      
      if (recipeError) throw recipeError;
      
      // 2. Delete existing recipe items
      const { error: deleteError } = await supabase
        .from('recipe_items')
        .delete()
        .eq('recipe_id', recipe.id);
      
      if (deleteError) throw deleteError;
      
      // 3. Insert new recipe items
      const recipeItems = formData.items.map(item => ({
        recipe_id: recipe.id,
        raw_material_id: item.raw_material_id,
        quantity: item.quantity
      }));
      
      const { error: itemsError } = await supabase
        .from('recipe_items')
        .insert(recipeItems);
      
      if (itemsError) throw itemsError;
    } else {
      // Insert new recipe
      const { data: recipeData, error: recipeError } = await supabase
        .from('product_recipes')
        .insert({
          name: formData.name,
          description: formData.description || null,
          final_product_id: formData.final_product_id,
          yield_quantity: formData.yield_quantity,
          is_active: formData.is_active
        })
        .select();
      
      if (recipeError) throw recipeError;
      
      // Insert recipe items
      if (recipeData && recipeData.length > 0) {
        const recipeId = recipeData[0].id;
        
        const recipeItems = formData.items.map(item => ({
          recipe_id: recipeId,
          raw_material_id: item.raw_material_id,
          quantity: item.quantity
        }));
        
        const { error: itemsError } = await supabase
          .from('recipe_items')
          .insert(recipeItems);
        
        if (itemsError) throw itemsError;
      }
    }

    // Also update the final product to mark it as recipe-based
    const { error: updateProductError } = await supabase
      .from('final_products')
      .update({ is_recipe_based: true })
      .eq('id', formData.final_product_id);
    
    if (updateProductError) throw updateProductError;

    // Call the onSubmit callback (usually refreshes the list)
    onSubmit();
  } catch (error: any) {
    console.error('Error saving recipe:', error);
    setError(error.message || 'Failed to save recipe. Please try again.');
    setLoading(false);
  }
}

  const selectedProductUnit = finalProducts.find(p => p.id === formData.final_product_id)?.unit || 'unit';

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
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
          <h3 className="text-lg font-semibold">
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
              <label className="block text-sm font-medium text-gray-700">
                Recipe Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Final Product
              </label>
              <select
                name="final_product_id"
                value={formData.final_product_id}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              >
                <option value="">Select a product</option>
                {finalProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.unit})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Yield Quantity (number of {selectedProductUnit}s produced)
              </label>
              <input
                type="number"
                name="yield_quantity"
                value={formData.yield_quantity}
                onChange={handleChange}
                min="1"
                step="1"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Recipe Ingredients */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-medium text-gray-900">Recipe Ingredients</h4>
              <button
                type="button"
                onClick={addRecipeItem}
                className="inline-flex items-center rounded border border-transparent bg-indigo-100 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Ingredient
              </button>
            </div>

            {formData.items.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-md">
                No ingredients added yet. Add raw materials to your recipe.
              </div>
            ) : (
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end border-b pb-3">
                    <div className="col-span-6">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Raw Material
                      </label>
                      <select
                        value={item.raw_material_id}
                        onChange={(e) => handleItemChange(index, 'raw_material_id', e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        required
                      >
                        <option value="">Select material</option>
                        {rawMaterials.map((material) => (
                          <option key={material.id} value={material.id}>
                            {material.name} ({material.unit}) - {material.current_stock} in stock
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <div className="block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                        {item.unit || '-'}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeRecipeItem(index)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start">
            <div className="flex h-5 items-center">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="is_active" className="font-medium text-gray-700">
                Active
              </label>
              <p className="text-gray-500">Inactive recipes won't be available for production</p>
            </div>
          </div>

          <div className="flex justify-end gap-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
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

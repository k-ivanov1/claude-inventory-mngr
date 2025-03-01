'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, Plus } from 'lucide-react'

interface Supplier {
  id: string
  name: string
}

interface RawMaterial {
  id?: string
  name: string
  description?: string
  category?: string
  sku?: string
  unit: string
  reorder_point: number
  is_active: boolean
  supplier_id?: string
}

interface RawMaterialFormProps {
  material?: RawMaterial | null
  categories: string[]
  onClose: () => void
  onSubmit: () => void
}

export function RawMaterialForm({ 
  material, 
  categories, 
  onClose, 
  onSubmit 
}: RawMaterialFormProps) {
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [error, setError] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)
  
  const [formData, setFormData] = useState<RawMaterial>({
    name: '',
    description: '',
    category: '',
    sku: '',
    unit: 'kg',
    reorder_point: 5,
    is_active: true,
    supplier_id: undefined
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    if (material) {
      setFormData({
        ...material,
        // Set empty string to undefined for optional fields
        description: material.description || '',
        category: material.category || '',
        sku: material.sku || '',
      })
    }
    
    fetchSuppliers()
  }, [material])

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_approved', true)
        .order('name')
      
      if (error) throw error
      
      setSuppliers(data || [])
    } catch (error: any) {
      console.error('Error fetching suppliers:', error)
      setError('Failed to load suppliers. Please try again.')
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
      setFormData({ ...formData, [name]: parseInt(value) || 0 })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return
    
    // Simply add to the local categories list
    // In a real app, you might want to save this to a categories table
    
    // Check if category already exists
    if (categories.includes(newCategory.toLowerCase())) {
      setError('This category already exists')
      return
    }
    
    // Update formData with new category
    setFormData({
      ...formData,
      category: newCategory.trim().toLowerCase()
    })
    
    // Reset and close category input
    setNewCategory('')
    setShowAddCategory(false)
  }

  const generateSKU = () => {
    if (!formData.category) {
      setError('Please select a category first to generate SKU')
      return
    }
    
    // Generate a SKU based on category prefix and a timestamp
    const prefix = formData.category.substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString().substring(9, 13) // Get last 4 digits of timestamp
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    
    const sku = `${prefix}-${timestamp}${random}`
    setFormData({...formData, sku})
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.name || !formData.unit) {
        throw new Error('Name and unit are required fields.')
      }

      // Create data object to submit
      const materialData = {
        ...formData,
        // Convert empty strings to null for optional fields
        description: formData.description || null,
        category: formData.category || null,
        sku: formData.sku || null,
        supplier_id: formData.supplier_id || null,
      }

      let result
      if (material?.id) {
        // Update existing material
        result = await supabase
          .from('raw_materials')
          .update(materialData)
          .eq('id', material.id)
      } else {
        // Insert new material
        result = await supabase
          .from('raw_materials')
          .insert(materialData)
      }

      if (result.error) throw result.error

      // Call the onSubmit callback (usually refreshes the list)
      onSubmit()
    } catch (error: any) {
      console.error('Error saving raw material:', error)
      setError(error.message || 'Failed to save raw material. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
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

        <h3 className="text-lg font-semibold mb-4">
          {material ? 'Edit Raw Material' : 'Add New Raw Material'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
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
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <button
                type="button"
                onClick={() => setShowAddCategory(!showAddCategory)}
                className="text-xs text-indigo-600"
              >
                {showAddCategory ? 'Cancel' : 'Add New Category'}
              </button>
            </div>
            
            {showAddCategory ? (
              <div className="mt-1 flex space-x-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New category name"
                  className="block flex-grow rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Add
                </button>
              </div>
            ) : (
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                SKU
              </label>
              <button
                type="button"
                onClick={generateSKU}
                className="text-xs text-indigo-600"
              >
                Generate SKU
              </button>
            </div>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Unit
            </label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              required
            >
              <option value="kg">Kilogram (kg)</option>
              <option value="g">Gram (g)</option>
              <option value="l">Liter (l)</option>
              <option value="ml">Milliliter (ml)</option>
              <option value="pcs">Pieces (pcs)</option>
              <option value="box">Box</option>
              <option value="pack">Pack</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reorder Point
            </label>
            <input
              type="number"
              name="reorder_point"
              value={formData.reorder_point}
              onChange={handleChange}
              min="0"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Supplier
            </label>
            <select
              name="supplier_id"
              value={formData.supplier_id || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">No supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            />
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
              <p className="text-gray-500">Inactive materials won't appear in recipes and inventories</p>
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
              {loading ? 'Saving...' : material ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

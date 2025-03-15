'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Plus, Edit2, Trash2, Search, AlertTriangle, Filter, ChevronDown } from 'lucide-react'

// Inventory item interface to match the database schema
interface InventoryItem {
  id: string
  product_name: string
  sku: string
  category: string
  stock_level: number
  unit: string
  unit_price: number
  reorder_point: number
  supplier?: string
  last_updated?: string
  is_recipe_based?: boolean
  is_final_product?: boolean
}

// Manual Adjustment Modal Component
interface ManualAdjustmentModalProps {
  item: InventoryItem
  onClose: () => void
  onSubmit: (quantity: number, reason: string) => void
}

function ManualAdjustmentModal({ item, onClose, onSubmit }: ManualAdjustmentModalProps) {
  const [quantity, setQuantity] = useState(0)
  const [reason, setReason] = useState('')
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (quantity <= 0) {
      alert('Quantity must be a positive number')
      return
    }
    const finalQuantity = adjustmentType === 'remove' ? -quantity : quantity
    onSubmit(finalQuantity, reason)
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Manual Inventory Adjustment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adjustment Type</label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as 'add' | 'remove')}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="add">Add Stock</option>
              <option value="remove">Remove Stock</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              min="1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div className="flex justify-end gap-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
            >
              {adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Inventory Item Modal Component
interface InventoryItemModalProps {
  item?: InventoryItem | null
  categories: string[]
  onClose: () => void
  onSubmit: () => void
}

function InventoryItemModal({ item, categories, onClose, onSubmit }: InventoryItemModalProps) {
  const [formData, setFormData] = useState<InventoryItem>({
    id: item?.id || '',
    product_name: item?.product_name || '',
    sku: item?.sku || '',
    category: item?.category || (categories[0] || ''),
    stock_level: item?.stock_level || 0,
    unit: item?.unit || 'piece',
    unit_price: item?.unit_price || 0,
    reorder_point: item?.reorder_point || 5,
    supplier: item?.supplier || '',
    is_recipe_based: item?.is_recipe_based || false,
    is_final_product: item?.is_final_product || false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)

  const supabase = createClientComponentClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData({ ...formData, [name]: checked })
    } else if (type === 'number') {
      setFormData({ ...formData, [name]: parseFloat(value) || 0 })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const generateSKU = () => {
    if (!formData.category) {
      setError('Please select a category first to generate SKU')
      return
    }
    const prefix = formData.category.substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString().substring(9, 13)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const sku = `${prefix}-${timestamp}${random}`
    setFormData({ ...formData, sku })
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return
    if (categories.includes(newCategory.toLowerCase())) {
      setError('This category already exists')
      return
    }
    try {
      const { error } = await supabase
        .from('product_categories')
        .insert({ name: newCategory.trim().toLowerCase() })
      if (error) throw error
      setFormData(prev => ({ ...prev, category: newCategory.trim().toLowerCase() }))
      setNewCategory('')
      setShowAddCategory(false)
    } catch (error: any) {
      console.error('Error adding category:', error)
      setError(error.message || 'Failed to add category. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (!formData.product_name || !formData.category || !formData.unit) {
        throw new Error('Product name, category, and unit are required.')
      }
      if (item?.id) {
        const { error } = await supabase
          .from('inventory')
          .update({
            product_name: formData.product_name,
            sku: formData.sku,
            category: formData.category,
            stock_level: formData.stock_level,
            unit: formData.unit,
            unit_price: formData.unit_price,
            reorder_point: formData.reorder_point,
            supplier: formData.supplier,
            is_recipe_based: formData.is_recipe_based,
            is_final_product: formData.is_final_product
          })
          .eq('id', item.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert({
            product_name: formData.product_name,
            sku: formData.sku,
            category: formData.category,
            stock_level: formData.stock_level,
            unit: formData.unit,
            unit_price: formData.unit_price,
            reorder_point: formData.reorder_point,
            supplier: formData.supplier,
            is_recipe_based: formData.is_recipe_based,
            is_final_product: formData.is_final_product
          })
        if (error) throw error
      }
      onSubmit()
    } catch (error: any) {
      console.error('Error saving inventory item:', error)
      setError(error.message || 'Failed to save inventory item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <title>Close</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.03a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
              </svg>
            </span>
          </div>
        )}
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{item ? 'Edit Inventory Item' : 'Add New Inventory Item'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Name</label>
            <input
              type="text"
              name="product_name"
              value={formData.product_name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SKU</label>
              <button type="button" onClick={generateSKU} className="text-xs text-indigo-600 dark:text-indigo-400">
                Generate SKU
              </button>
            </div>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            /></div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <button type="button" onClick={() => setShowAddCategory(!showAddCategory)} className="text-xs text-indigo-600 dark:text-indigo-400">
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
                  className="block flex-grow rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Stock Level</label>
            <input
              type="number"
              name="stock_level"
              value={formData.stock_level}
              onChange={handleChange}
              min="0"
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="piece">Piece</option>
              <option value="kg">Kilogram (kg)</option>
              <option value="g">Gram (g)</option>
              <option value="l">Liter (l)</option>
              <option value="ml">Milliliter (ml)</option>
              <option value="box">Box</option>
              <option value="pack">Pack</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit Price (£)</label>
            <input
              type="number"
              name="unit_price"
              value={formData.unit_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reorder Point</label>
            <input
              type="number"
              name="reorder_point"
              value={formData.reorder_point}
              onChange={handleChange}
              min="0"
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier (Optional)</label>
            <input
              type="text"
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center">
              <input
                id="is_recipe_based"
                name="is_recipe_based"
                type="checkbox"
                checked={formData.is_recipe_based}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="is_recipe_based" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Recipe Based Item
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="is_final_product"
                name="is_final_product"
                type="checkbox"
                checked={formData.is_final_product}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="is_final_product" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Final Product
              </label>
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
              {loading ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [showItemTypeFilter, setShowItemTypeFilter] = useState(false)
  const [selectedItemType, setSelectedItemType] = useState<string>('all')

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchInventoryItems()
    fetchCategories()
  }, [])

  useEffect(() => {
    let result = inventory
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(item =>
        item.product_name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        (item.supplier && item.supplier.toLowerCase().includes(term))
      )
    }
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      result = result.filter(item => selectedCategories.includes(item.category))
    }
    
    // Apply item type filter
    if (selectedItemType !== 'all') {
      if (selectedItemType === 'raw') {
        result = result.filter(item => !item.is_recipe_based && !item.is_final_product)
      } else if (selectedItemType === 'recipe') {
        result = result.filter(item => item.is_recipe_based && !item.is_final_product)
      } else if (selectedItemType === 'final') {
        result = result.filter(item => item.is_final_product)
      }
    }
    
    setFilteredInventory(result)
  }, [searchTerm, inventory, selectedCategories, selectedItemType])

  const fetchInventoryItems = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('product_name', { ascending: true })
      if (error) throw error
      setInventory(data || [])
    } catch (error: any) {
      console.error('Error fetching inventory:', error)
      setError('Failed to load inventory. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      // First try to get from product_categories table
      const { data: categoryData, error: categoryError } = await supabase
        .from('product_categories')
        .select('name')
      
      if (!categoryError && categoryData && categoryData.length > 0) {
        setCategories(categoryData.map(c => c.name))
        return
      }
      
      // Fallback to getting unique categories from inventory
      const { data, error } = await supabase
        .from('inventory')
        .select('category')
        .not('category', 'is', null)
      if (error) throw error
      const uniqueCategories = Array.from(new Set(data?.map(item => item.category) || []))
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const toggleCategoryFilter = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      try {
        const { error } = await supabase
          .from('inventory')
          .delete()
          .eq('id', id)
        if (error) throw error
        fetchInventoryItems()
      } catch (error: any) {
        console.error('Error deleting inventory item:', error)
        setError('Failed to delete inventory item. Please try again.')
      }
    }
  }
  
  const handleManualAdjustment = async (item: InventoryItem) => {
    // Implement this function if you want to add manual inventory adjustment functionality
    setEditingItem(item)
    // This would typically show a modal for adjusting stock levels
  }

  const totalInventoryValue = filteredInventory.reduce(
    (total, item) => total + (item.stock_level * item.unit_price),
    0
  )
  const totalItems = filteredInventory.length
  const lowStockItems = filteredInventory.filter(item => item.stock_level <= item.reorder_point).length

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.03a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h2>
          <p className="text-gray-600 dark:text-gray-300">Track and manage your product inventory</p>
        </div>
        <div className="flex items-center gap-x-4">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Total Value: <span className="ml-2 text-indigo-600 dark:text-indigo-400">£{totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <button
            onClick={() => {
              setEditingItem(null)
              setShowAddForm(true)
            }}
            className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus className="h-5 w-5" />
            Add Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Items</dt>
                <dd className="flex items-baseline">
                  <span className="text-2xl font-semibold text-gray-900 dark:text-white">{totalItems}</span>
                </dd>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Low Stock Items</dt>
                <dd className="flex items-baseline">
                  <span className="text-2xl font-semibold text-red-600 dark:text-red-400">{lowStockItems}</span>
                </dd>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Final Products</dt>
                <dd className="flex items-baseline">
                  <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {filteredInventory.filter(item => item.is_final_product).length}
                  </span>
                </dd>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Raw Materials</dt>
                <dd className="flex items-baseline">
                  <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {filteredInventory.filter(item => !item.is_recipe_based && !item.is_final_product).length}
                  </span>
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Filter className="h-4 w-4 mr-2" />
            Categories
            <ChevronDown className="h-4 w-4 ml-2" />
          </button>
          {showCategoryFilter && (
            <div className="absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1" role="menu" aria-orientation="vertical">
                {categories.map((category) => (
                  <div key={category} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      id={`category-${category}`}
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategoryFilter(category)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
                    />
                    <label htmlFor={`category-${category}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowItemTypeFilter(!showItemTypeFilter)}
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Filter className="h-4 w-4 mr-2" />
            Item Type
            <ChevronDown className="h-4 w-4 ml-2" />
          </button>
          {showItemTypeFilter && (
            <div className="absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1" role="menu" aria-orientation="vertical">
                <div className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    id="type-all"
                    name="item-type"
                    checked={selectedItemType === 'all'}
                    onChange={() => setSelectedItemType('all')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mr-2"
                  />
                  <label htmlFor="type-all" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    All Items
                  </label>
                </div>
                <div className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    id="type-raw"
                    name="item-type"
                    checked={selectedItemType === 'raw'}
                    onChange={() => setSelectedItemType('raw')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mr-2"
                  />
                  <label htmlFor="type-raw" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Raw Materials
                  </label>
                </div>
                <div className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    id="type-recipe"
                    name="item-type"
                    checked={selectedItemType === 'recipe'}
                    onChange={() => setSelectedItemType('recipe')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mr-2"
                  />
                  <label htmlFor="type-recipe" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Recipe Based Items
                  </label>
                </div>
                <div className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    id="type-final"
                    name="item-type"
                    checked={selectedItemType === 'final'}
                    onChange={() => setSelectedItemType('final')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mr-2"
                  />
                  <label htmlFor="type-final" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Final Products
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unit Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reorder Point</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading inventory...
                  </td></tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.product_name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.sku}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.category}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                        item.stock_level <= item.reorder_point
                          ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : item.stock_level <= item.reorder_point * 1.5
                          ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      }`}>
                        {item.stock_level} {item.unit}
                        {item.stock_level <= item.reorder_point && (
                          <AlertTriangle className="ml-1 h-3 w-3" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">£{item.unit_price.toFixed(2)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.is_final_product
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                          : item.is_recipe_based
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {item.is_final_product 
                          ? 'Final Product' 
                          : item.is_recipe_based 
                            ? 'Recipe Based' 
                            : 'Raw Material'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.reorder_point}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.supplier || '-'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-x-3">
                        <button
                          onClick={() => {
                            setEditingItem(item)
                            setShowAddForm(true)
                          }}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
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

      {/* Add/Edit Inventory Item Modal */}
      {showAddForm && (
        <InventoryItemModal
          item={editingItem}
          categories={categories}
          onClose={() => {
            setShowAddForm(false)
            setEditingItem(null)
          }}
          onSubmit={() => {
            setShowAddForm(false)
            setEditingItem(null)
            fetchInventoryItems()
          }}
        />
      )}
    </div>
  )
}

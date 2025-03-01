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
}

// Optional: Manual Adjustment Modal Component for manual stock adjustments
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
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">Manual Inventory Adjustment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Adjustment Type</label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as 'add' | 'remove')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="add">Add Stock</option>
              <option value="remove">Remove Stock</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value))}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              min="1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div className="flex justify-end gap-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 border"
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

// Inventory Item Modal Component for adding/editing inventory items
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
    last_updated: item?.last_updated || ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)

  const supabase = createClientComponentClient()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'number') {
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
            supplier: formData.supplier
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
            supplier: formData.supplier
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
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <title>Close</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.03a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
              </svg>
            </span>
          </div>
        )}
        <h3 className="text-lg font-semibold mb-4">{item ? 'Edit Inventory Item' : 'Add New Inventory Item'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Product Name</label>
            <input
              type="text"
              name="product_name"
              value={formData.product_name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">SKU</label>
              <button type="button" onClick={generateSKU} className="text-xs text-indigo-600">
                Generate SKU
              </button>
            </div>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <button type="button" onClick={() => setShowAddCategory(!showAddCategory)} className="text-xs text-indigo-600">
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
                <button type="button" onClick={handleAddCategory} className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                  Add
                </button>
              </div>
            ) : (
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
            <label className="block text-sm font-medium text-gray-700">Stock Level</label>
            <input
              type="number"
              name="stock_level"
              value={formData.stock_level}
              onChange={handleChange}
              min="0"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Unit</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
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
            <label className="block text-sm font-medium text-gray-700">Unit Price (£)</label>
            <input
              type="number"
              name="unit_price"
              value={formData.unit_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reorder Point</label>
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
          <div className="pt-4 space-y-4 border-t">
            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input
                  id="is_recipe_based"
                  name="is_recipe_based"
                  type="checkbox"
                  checked={formData.is_recipe_based}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="is_recipe_based" className="font-medium text-gray-700">
                  Recipe-Based Product
                </label>
                <p className="text-gray-500">
                  {formData.is_recipe_based ? 'Product will be made using a recipe' : 'Product will be purchased finished'}
                </p>
              </div>
            </div>
            {formData.is_recipe_based ? (
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Recipe</label>
                <select
                  name="recipe_id"
                  value={formData.recipe_id || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  required
                >
                  <option value="">Select a recipe</option>
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Supplier</label>
                <select
                  name="supplier_id"
                  value={formData.supplier_id || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  required
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="pt-4 border-t">
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
                <label htmlFor="is_active" className="font-medium text-gray-700">Active</label>
                <p className="text-gray-500">Inactive products won't appear in sales or production</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              {product ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FinalProductsPage() {
  const [finalProducts, setFinalProducts] = useState<FinalProduct[]>([])
  const [filteredProducts, setFilteredProducts] = useState<FinalProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<FinalProduct | null>(null)
  const [categories, setCategories] = useState<string[]>(['tea', 'coffee', 'gear', 'packaging', 'books'])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchFinalProducts()
    fetchSuppliers()
    fetchCategories()
  }, [])

  useEffect(() => {
    const term = searchTerm.toLowerCase()
    const filtered = finalProducts.filter(product =>
      product.name.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term)
    )
    setFilteredProducts(filtered)
  }, [searchTerm, finalProducts])

  const fetchFinalProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('final_products')
        .select('*')
        .order('name')
      if (error) throw error
      setFinalProducts(data || [])
    } catch (error: any) {
      console.error('Error fetching final products:', error)
      setError(error.message || 'Failed to load final products. Please check your connection or permissions.')
    } finally {
      setLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_approved', true)
      if (error) throw error
      setSuppliers(data || [])
    } catch (error: any) {
      console.error('Error fetching suppliers:', error)
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
      if (!productData.name || !productData.category || !productData.unit) {
        throw new Error('Name, category, and unit are required fields.')
      }
      let result
      if (editingProduct?.id) {
        result = await supabase
          .from('final_products')
          .update({
            name: productData.name,
            sku: productData.sku,
            category: productData.category,
            unit: productData.unit,
            is_recipe_based: productData.is_recipe_based,
            recipe_id: productData.recipe_id,
            supplier_id: productData.supplier_id,
            unit_price: productData.unit_price,
            reorder_point: productData.reorder_point,
            is_active: productData.is_active
          })
          .eq('id', editingProduct.id)
          .select()
      } else {
        result = await supabase
          .from('final_products')
          .insert({
            name: productData.name,
            sku: productData.sku,
            category: productData.category,
            unit: productData.unit,
            is_recipe_based: productData.is_recipe_based,
            recipe_id: productData.recipe_id,
            supplier_id: productData.supplier_id,
            unit_price: productData.unit_price,
            reorder_point: productData.reorder_point,
            is_active: productData.is_active
          })
          .select()
      }
      if (result.error) throw result.error
      fetchFinalProducts()
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
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
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
          <h2 className="text-2xl font-bold">Final Products</h2>
          <p className="text-gray-600">Manage your finished products catalog</p>
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

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name, SKU, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipe Based</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Point</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-4 text-center text-sm text-gray-500">Loading...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-4 text-center text-sm text-gray-500">No final products found.</td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{product.sku}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{product.unit}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{product.is_recipe_based ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">£{product.unit_price.toFixed(2)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{product.reorder_point}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-x-3">
                        <button onClick={() => handleEditProduct(product)} className="text-indigo-600 hover:text-indigo-900">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => product.id && handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-900">
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

      {showForm && (
        <FinalProductFormModal
          product={editingProduct}
          categories={categories}
          suppliers={suppliers}
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

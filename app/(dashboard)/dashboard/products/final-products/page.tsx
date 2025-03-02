'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'

// Final Product interface to match database schema
interface FinalProduct {
  id?: string
  name: string
  sku: string
  category: string
  unit: string
  is_recipe_based: boolean
  recipe_id?: string
  supplier_id?: string
  unit_price: number
  reorder_point: number
  is_active: boolean
}

// Separate component for the Final Product Form Modal
interface FinalProductFormModalProps {
  product?: FinalProduct | null
  categories: string[]
  suppliers: any[]
  onClose: () => void
  onSubmit: (product: FinalProduct) => void
}

function FinalProductFormModal({
  product,
  categories,
  suppliers,
  onClose,
  onSubmit
}: FinalProductFormModalProps) {
  const [formData, setFormData] = useState<FinalProduct>({
    name: product?.name || '',
    sku: product?.sku || '',
    category: product?.category || (categories[0] || ''),
    unit: product?.unit || 'piece',
    is_recipe_based: product?.is_recipe_based || false,
    recipe_id: product?.recipe_id || undefined,
    supplier_id: product?.supplier_id || undefined,
    unit_price: product?.unit_price || 0,
    reorder_point: product?.reorder_point || 5,
    is_active: product?.is_active ?? true
  })

  const [recipes, setRecipes] = useState<any[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('product_recipes')
        .select('id, name')
        .eq('is_active', true)
      if (error) throw error
      setRecipes(data || [])
    } catch (error: any) {
      console.error('Error fetching recipes:', error)
      setError('Failed to load recipes. Some functionality may be limited.')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checkboxInput = e.target as HTMLInputElement
      setFormData({
        ...formData,
        [name]: checkboxInput.checked,
        ...(name === 'is_recipe_based' && checkboxInput.checked
          ? { supplier_id: undefined }
          : { recipe_id: undefined }
        )
      })
    } else if (type === 'number') {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0
      })
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
      setFormData(prev => ({
        ...prev,
        category: newCategory.trim().toLowerCase()
      }))
      setNewCategory('')
      setShowAddCategory(false)
    } catch (error: any) {
      console.error('Error adding category:', error)
      setError(error.message || 'Failed to add category. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!formData.name || !formData.category || !formData.unit) {
      setError('Name, category, and unit are required fields.')
      return
    }
    if (formData.is_recipe_based && !formData.recipe_id) {
      setError('Please select a recipe for this recipe-based product.')
      return
    }
    if (!formData.is_recipe_based && !formData.supplier_id) {
      setError('Please select a supplier for this purchased product.')
      return
    }
    onSubmit({
      ...formData,
      recipe_id: formData.is_recipe_based ? formData.recipe_id : undefined,
      supplier_id: !formData.is_recipe_based ? formData.supplier_id : undefined
    })
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
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
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
          {product ? 'Edit Final Product' : 'Add New Final Product'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SKU</label>
              <button type="button" onClick={generateSKU} className="text-xs text-indigo-600">
                Generate SKU
              </button>
            </div>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
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
                  className="block flex-grow rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit</label>
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
              required
            />
          </div>
          <div className="pt-4 space-y-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input
                  id="is_recipe_based"
                  name="is_recipe_based"
                  type="checkbox"
                  checked={formData.is_recipe_based}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="is_recipe_based" className="font-medium text-gray-700 dark:text-gray-300">
                  Recipe-Based Product
                </label>
                <p className="text-gray-500 dark:text-gray-400">
                  {formData.is_recipe_based ? 'Product will be made using a recipe' : 'Product will be purchased finished'}
                </p>
              </div>
            </div>
            {formData.is_recipe_based ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Recipe</label>
                <select
                  name="recipe_id"
                  value={formData.recipe_id || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                  required
                >
                  <option value="">Select a recipe</option>
                  {/* Assume that the recipes array is fetched similarly to the Inventory page */}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Supplier</label>
                <select
                  name="supplier_id"
                  value={formData.supplier_id || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
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
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="is_active" className="font-medium text-gray-700 dark:text-gray-300">Active</label>
                <p className="text-gray-500 dark:text-gray-400">Inactive products won't appear in sales or production</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Final Products</h2>
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

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 dark:text-gray-300" />
        </div>
        <input
          type="text"
          placeholder="Search by name, SKU, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Recipe Based</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unit Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Reorder Point</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-300">Loading...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-300">No final products found.</td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{product.sku}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{product.category}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{product.unit}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{product.is_recipe_based ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">£{product.unit_price.toFixed(2)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{product.reorder_point}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      } dark:${product.is_active ? 'bg-green-900 text-green-100' : 'bg-gray-700 text-gray-300'}`}>
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

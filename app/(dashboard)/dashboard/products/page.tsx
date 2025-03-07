'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search 
} from 'lucide-react'

// Product interface to match database schema
interface Product {
  id?: string
  name: string
  category: string
  product_type: string
  description?: string
  unit: string
  supplier_id?: string
}

export default function ManageProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<string[]>(['tea', 'coffee', 'gear', 'packaging', 'books'])
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  // Filter products whenever search term or products change
  useEffect(() => {
    const term = searchTerm.toLowerCase()
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term) ||
      product.product_type.toLowerCase().includes(term)
    )
    setFilteredProducts(filtered)
  }, [searchTerm, products])

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('product_recipes')
        .select('*')
        .order('name')
      
      if (error) throw error
      
      setProducts(data || [])
    } catch (error: any) {
      console.error('Error fetching products:', error)
      setError(error.message || 'Failed to load products. Please check your connection or permissions.')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('name')
      
      if (error) throw error
      
      if (data && data.length > 0) {
        setCategories(data.map(category => category.name))
      }
    } catch (error: any) {
      console.error('Error fetching categories:', error)
      // If fetching categories fails, keep default categories
    }
  }

  const handleAddProduct = async (productData: Product) => {
    setError(null)
    try {
      // Validate required fields
      if (!productData.name || !productData.category || !productData.product_type || !productData.unit) {
        throw new Error('Name, category, product type, and unit are required fields.')
      }

      let result
      if (editingProduct?.id) {
        // Update existing product
        result = await supabase
          .from('product_recipes')
          .update({
            name: productData.name,
            category: productData.category,
            product_type: productData.product_type,
            description: productData.description,
            unit: productData.unit,
            supplier_id: productData.supplier_id
          })
          .eq('id', editingProduct.id)
          .select()
      } else {
        // Insert new product
        result = await supabase
          .from('product_recipes')
          .insert({
            name: productData.name,
            category: productData.category,
            product_type: productData.product_type,
            description: productData.description,
            unit: productData.unit,
            supplier_id: productData.supplier_id
          })
          .select()
      }

      if (result.error) throw result.error

      // Refresh products list
      fetchProducts()
      
      // Close form
      setShowForm(false)
      setEditingProduct(null)
    } catch (error: any) {
      console.error('Error saving product:', error)
      setError(error.message || 'Failed to save product. Please check your input and try again.')
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const { error } = await supabase
          .from('product_recipes')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        // Refresh products list
        fetchProducts()
      } catch (error: any) {
        console.error('Error deleting product:', error)
        setError(error.message || 'Failed to delete product. Please try again.')
      }
    }
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product)
    setShowForm(true)
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
          <h2 className="text-2xl font-bold">Product Management</h2>
          <p className="text-gray-600">Add, edit, and manage your product catalog</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null)
            setShowForm(true)
          }}
          className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="h-5 w-5" />
          Add Product
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name, category, or type..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {/* Products Table */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.category}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.product_type}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.unit}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-x-3">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => product.id && handleDeleteProduct(product.id)}
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

      {/* Product Form Modal */}
      {showForm && (
        <ProductFormModal
          product={editingProduct}
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

// Separate component for Product Form Modal
interface ProductFormModalProps {
  product?: Product | null
  categories: string[]
  onClose: () => void
  onSubmit: (product: Product) => void
}

function ProductFormModal({ 
  product, 
  categories, 
  onClose, 
  onSubmit 
}: ProductFormModalProps) {
  const [formData, setFormData] = useState<Product>({
    name: product?.name || '',
    category: product?.category || (categories[0] || ''),
    product_type: product?.product_type || '',
    description: product?.description || '',
    unit: product?.unit || '',
  })

  const [newCategory, setNewCategory] = useState('')
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate required fields
    if (!formData.name || !formData.category || !formData.product_type || !formData.unit) {
      setError('Please fill in all required fields.')
      return
    }

    try {
      const submitData = {
        ...formData,
        id: product?.id
      }
      
      onSubmit(submitData)
    } catch (err: any) {
      setError(err.message || 'Failed to save product. Please try again.')
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return

    try {
      // Add new category to database
      const { data, error } = await supabase
        .from('product_categories')
        .insert({ name: newCategory.trim().toLowerCase() })
        .select()
      
      if (error) throw error
      
      // Update form's category to the new category
      setFormData(prev => ({
        ...prev,
        category: newCategory.trim().toLowerCase()
      }))
      
      // Reset and close category input
      setNewCategory('')
      setShowAddCategory(false)
    } catch (error: any) {
      console.error('Error adding category:', error)
      setError(error.message || 'Failed to add category. Please try again.')
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
          {product ? 'Edit Product' : 'Add New Product'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Product Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
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
            <label className="block text-sm font-medium text-gray-700">
              Product Type
            </label>
            <input
              type="text"
              value={formData.product_type}
              onChange={(e) => setFormData({...formData, product_type: e.target.value})}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Unit
            </label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData({...formData, unit: e.target.value})}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              placeholder="e.g., kg, pieces, liters"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              rows={3}
            />
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

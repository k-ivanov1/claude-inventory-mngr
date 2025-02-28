'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Plus, Edit2, Trash2, Tag } from 'lucide-react'
import { ProductRecipe } from '@/lib/types/product-sales'
import { ProductForm } from '@/components/products/product-form'

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductRecipe | undefined>()
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      // Load products with their ingredients
      const { data, error } = await supabase
        .from('product_recipes')
        .select('*')
        .order('name')
      
      if (error) throw error
      
      // For each product, get its ingredients
      const productsWithItems = await Promise.all(
        (data || []).map(async (product) => {
          const { data: items, error: itemsError } = await supabase
            .from('recipe_items')
            .select(`
              *,
              inventory(id, product_name, product_type, unit_price)
            `)
            .eq('recipe_id', product.id)
          
          if (itemsError) throw itemsError
          
          // Format items for display
          const formattedItems = (items || []).map(item => ({
            id: item.id,
            recipe_id: item.recipe_id,
            item_id: item.inventory.id,
            item_name: item.inventory.product_name,
            item_type: item.inventory.product_type,
            quantity: item.quantity,
            unit_price: item.inventory.unit_price,
            total_price: item.quantity * item.inventory.unit_price
          }))
          
          return {
            ...product,
            items: formattedItems,
            // Calculate total price
            price: formattedItems.reduce((sum, item) => sum + (item.total_price || 0), 0)
          }
        })
      )
      
      setProducts(productsWithItems)
    } catch (error) {
      console.error('Error loading products:', error)
      alert('Failed to load products. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product? This cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('product_recipes')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        // Reload products
        loadProducts()
      } catch (error) {
        console.error('Error deleting product:', error)
        alert('Failed to delete product. Please try again.')
      }
    }
  }

  const handleEditProduct = (product: ProductRecipe) => {
    setEditingProduct(product)
    setShowForm(true)
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-gray-600">Manage your product recipes and pricing</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(undefined)
            setShowForm(true)
          }}
          className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <Plus className="h-5 w-5" />
          New Product
        </button>
      </div>
    
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-gray-600">Manage your product recipes and pricing</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(undefined)
            setShowForm(true)
          }}
          className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <Plus className="h-5 w-5" />
          New Product
        </button>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredients</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-4 text-center text-sm text-gray-500">
                    No products found. Create your first product recipe.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.product_type}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="inline-flex items-center gap-x-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
                        <Tag className="h-3 w-3" />
                        {product.sku}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      <ul className="list-disc list-inside">
                        {product.items.map((item, index) => (
                          <li key={index}>
                            {item.quantity} x {item.item_name} ({item.item_type})
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      £{product.price?.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => product.id && handleDeleteProduct(product.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <ProductForm
          onClose={() => {
            setShowForm(false)
            setEditingProduct(undefined)
          }}
          onSuccess={loadProducts}
          editProduct={editingProduct}
        />
      )}
    </div>
  )
}

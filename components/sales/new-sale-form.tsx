'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Plus, Minus } from 'lucide-react'

interface SaleItem {
  product_id: string
  quantity: number
  unit_price: number
}

export function NewSaleForm({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<SaleItem[]>([{ product_id: '', quantity: 1, unit_price: 0 }])
  const [customerName, setCustomerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from('inventory')
        .select('id, product_name, unit_price')
        .order('product_name')
      
      if (data) setProducts(data)
    }

    fetchProducts()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)

      // Create sale record
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          customer_name: customerName,
          total_amount: totalAmount,
          status: 'pending'
        }])
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items
      if (sale) {
        const { error: itemsError } = await supabase
          .from('sales_items')
          .insert(
            items.map(item => ({
              sale_id: sale.id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price
            }))
          )

        if (itemsError) throw itemsError

        // Update inventory levels
        for (const item of items) {
          const { error: updateError } = await supabase.rpc('update_inventory_level', {
            p_product_id: item.product_id,
            p_quantity: item.quantity
          })

          if (updateError) throw updateError
        }
      }

      onClose()
      window.location.reload()
    } catch (error) {
      console.error('Error creating sale:', error)
      alert('Error creating sale. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    if (field === 'product_id') {
      const product = products.find(p => p.id === value)
      if (product) {
        newItems[index].unit_price = product.unit_price
      }
    }

    setItems(newItems)
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">New Sale</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Customer Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">Items</h4>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-x-1 text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>

            <div className="overflow-y-auto max-h-96">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-x-4 py-2">
                  <div className="flex-1">
                    <select
                      value={item.product_id}
                      onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.product_name} - £{product.unit_price.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32">
                    <div className="flex items-center gap-x-2">
                      <button
                        type="button"
                        onClick={() => updateItem(index, 'quantity', Math.max(1, item.quantity - 1))}
                        className="rounded-md border p-1"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                        className="block w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => updateItem(index, 'quantity', item.quantity + 1)}
                        className="rounded-md border p-1"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="w-32 text-right">
                    <p className="text-sm font-medium text-gray-900">
                      £{(item.quantity * item.unit_price).toFixed(2)}
                    </p>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center text-lg font-medium">
              <span>Total Amount:</span>
              <span>£{totalAmount.toFixed(2)}</span>
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
              {loading ? 'Creating...' : 'Create Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

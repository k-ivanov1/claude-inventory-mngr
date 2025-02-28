'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, Plus, Trash2 } from 'lucide-react'
import { OtherStock } from '@/lib/types/stock'

interface OtherStockFormProps {
  onClose: () => void
  onSuccess?: () => void
  editItem?: OtherStock
}

export function ReceiveOtherStockForm({ onClose, onSuccess, editItem }: OtherStockFormProps) {
  const [loading, setLoading] = useState(false)
  const [productTypes, setProductTypes] = useState<string[]>(['packaging', 'gear', 'books'])
  const [newType, setNewType] = useState('')
  const [showAddType, setShowAddType] = useState(false)
  const supabase = createClientComponentClient()
  
  const [formData, setFormData] = useState<OtherStock>({
    date: new Date().toISOString().split('T')[0],
    product_name: '',
    type: 'packaging',
    supplier: '',
    invoice_number: '',
    quantity: 0,
    price_per_unit: 0,
    is_damaged: false,
    is_accepted: true,
    checked_by: '',
  })

  useEffect(() => {
    if (editItem) {
      setFormData(editItem)
    }
    
    // Fetch product types from database
    fetchProductTypes()
  }, [editItem])

  const fetchProductTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('product_types')
        .select('name')
        .eq('category', 'other')
      
      if (error) throw error
      
      if (data && data.length > 0) {
        setProductTypes(data.map(type => type.name))
      }
    } catch (error) {
      console.error('Error fetching product types:', error)
    }
  }

  // Calculate total cost
  const totalCost = formData.quantity * formData.price_per_unit

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

  const handleAddType = async () => {
    if (!newType.trim()) return
    
    try {
      // Save to database
      const { error } = await supabase
        .from('product_types')
        .insert({ name: newType, category: 'other' })
      
      if (error) throw error
      
      // Update local state
      setProductTypes([...productTypes, newType])
      setNewType('')
      setShowAddType(false)
    } catch (error) {
      console.error('Error adding product type:', error)
      alert('Failed to add product type. Please try again.')
    }
  }

  const handleRemoveType = async (typeToRemove: string) => {
    if (confirm(`Are you sure you want to remove "${typeToRemove}" type?`)) {
      try {
        // Remove from database
        const { error } = await supabase
          .from('product_types')
          .delete()
          .eq('name', typeToRemove)
          .eq('category', 'other')
        
        if (error) throw error
        
        // Update local state
        setProductTypes(productTypes.filter(type => type !== typeToRemove))
        
        // If current form type is being removed, update to first available
        if (formData.type === typeToRemove && productTypes.length > 0) {
          const newTypes = productTypes.filter(type => type !== typeToRemove)
          setFormData({ ...formData, type: newTypes[0] || 'packaging' })
        }
      } catch (error) {
        console.error('Error removing product type:', error)
        alert('Failed to remove product type. Please try again.')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const dataToSubmit = {
        ...formData,
        total_cost: totalCost,
      }

      let result

      if (editItem?.id) {
        // Update existing item
        result = await supabase
          .from('stock_other')
          .update(dataToSubmit)
          .eq('id', editItem.id)
      } else {
        // Insert new item
        result = await supabase
          .from('stock_other')
          .insert(dataToSubmit)
      }

      if (result.error) {
        throw result.error
      }

      // Also update inventory table
      await updateInventory(dataToSubmit)

      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (error) {
      console.error('Error saving stock:', error)
      alert('Failed to save stock item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateInventory = async (stockItem: OtherStock) => {
    // First check if the product exists in inventory
    const { data: existingItem } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_name', stockItem.product_name)
      .eq('product_type', stockItem.type)
      .single()

    const stockValue = stockItem.quantity
    
    if (existingItem) {
      // If exists, update quantity
      // If editing, we need to adjust the stock change
      let quantityAdjustment = stockValue
      
      if (editItem?.id) {
        quantityAdjustment = stockValue - editItem.quantity
      }
      
      await supabase
        .from('inventory')
        .update({
          stock_level: existingItem.stock_level + quantityAdjustment,
          unit_price: stockItem.price_per_unit, // Update to most recent price
          last_updated: new Date().toISOString(),
        })
        .eq('id', existingItem.id)
    } else {
      // If doesn't exist, create new inventory item
      await supabase
        .from('inventory')
        .insert({
          product_name: stockItem.product_name,
          product_type: stockItem.type,
          category: 'other',
          supplier: stockItem.supplier,
          stock_level: stockValue,
          unit_price: stockItem.price_per_unit,
          reorder_point: 5, // Default reorder point
          sku: `${stockItem.type.substring(0, 3)}-${Date.now()}`, // Generate a simple SKU
        })
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">
            {editItem ? 'Edit Other Stock' : 'Receive Other Stock'}
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
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Product Type
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddType(true)}
                  className="text-xs text-indigo-600"
                >
                  Manage Types
                </button>
              </div>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              >
                {productTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              
              {showAddType && (
                <div className="mt-2 p-3 border rounded-md bg-gray-50">
                  <h4 className="text-sm font-medium mb-2">Manage Product Types</h4>
                  
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      placeholder="New type name"
                      className="block w-full rounded-md border border-gray-300 px-3 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddType}
                      className="inline-flex items-center rounded border border-transparent bg-indigo-600 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </button>
                  </div>
                  
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {productTypes.map(type => (
                      <div key={type} className="flex justify-between items-center text-sm">
                        <span>{type}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveType(type)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAddType(false)}
                      className="text-xs text-gray-500"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Name
              </label>
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
              <label className="block text-sm font-medium text-gray-700">
                Supplier
              </label>
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Invoice Number
              </label>
              <input
                type="text"
                name="invoice_number"
                value={formData.invoice_number}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0"
                step="1"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Price per Unit (£)
              </label>
              <input
                type="number"
                name="price_per_unit"
                value={formData.price_per_unit}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Checked By
              </label>
              <input
                type="text"
                name="checked_by"
                value={formData.checked_by}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>
          </div>

          {/* Calculated field */}
          <div className="pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total Purchase Cost (£)
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm sm:text-sm">
                £{totalCost.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Quality checks */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input
                  id="is_damaged"
                  name="is_damaged"
                  type="checkbox"
                  checked={formData.is_damaged}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="is_damaged" className="font-medium text-gray-700">
                  Product is damaged
                </label>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input
                  id="is_accepted"
                  name="is_accepted"
                  type="checkbox"
                  checked={formData.is_accepted}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="is_accepted" className="font-medium text-gray-700">
                  Product is accepted
                </label>
              </div>
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
              {loading ? 'Saving...' : editItem ? 'Update' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

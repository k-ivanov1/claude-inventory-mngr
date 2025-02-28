'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X } from 'lucide-react'
import { TeaCoffeeStock } from '@/lib/types/stock'

interface TeaCoffeeFormProps {
  onClose: () => void
  onSuccess?: () => void
  editItem?: TeaCoffeeStock
}

export function ReceiveTeaCoffeeForm({ onClose, onSuccess, editItem }: TeaCoffeeFormProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()
  
  const [formData, setFormData] = useState<TeaCoffeeStock>({
    date: new Date().toISOString().split('T')[0],
    product_name: '',
    type: 'tea',
    supplier: '',
    invoice_number: '',
    batch_number: '',
    best_before_date: '',
    quantity: 0,
    package_size: 0, // in grams
    price_per_unit: 0,
    is_damaged: false,
    labelling_matches_specifications: true,
    is_accepted: true,
    checked_by: '',
  })

  useEffect(() => {
    if (editItem) {
      setFormData(editItem)
    }
  }, [editItem])

  // Calculate derived values
  const totalKg = formData.quantity * (formData.package_size / 1000)
  const pricePerKg = formData.package_size > 0 
    ? formData.price_per_unit / (formData.package_size / 1000) 
    : 0
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const dataToSubmit = {
        ...formData,
        total_kg: totalKg,
        price_per_kg: pricePerKg,
        total_cost: totalCost,
      }

      let result

      if (editItem?.id) {
        // Update existing item
        result = await supabase
          .from('stock_tea_coffee')
          .update(dataToSubmit)
          .eq('id', editItem.id)
      } else {
        // Insert new item
        result = await supabase
          .from('stock_tea_coffee')
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
      console.error('Error saving tea/coffee stock:', error)
      alert('Failed to save stock item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateInventory = async (stockItem: TeaCoffeeStock) => {
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
          category: stockItem.type, // Use type as category
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
            {editItem ? 'Edit Tea/Coffee Stock' : 'Receive Tea/Coffee Stock'}
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
              <label className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              >
                <option value="tea">Tea</option>
                <option value="coffee">Coffee</option>
              </select>
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
                Batch Number
              </label>
              <input
                type="text"
                name="batch_number"
                value={formData.batch_number}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Best Before Date
              </label>
              <input
                type="date"
                name="best_before_date"
                value={formData.best_before_date}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quantity (Units)
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
                Package Size (grams)
              </label>
              <input
                type="number"
                name="package_size"
                value={formData.package_size}
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

          {/* Calculated fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total Received (kg)
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm sm:text-sm">
                {totalKg.toFixed(2)} kg
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Price per kg (£)
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 shadow-sm sm:text-sm">
                £{pricePerKg.toFixed(2)}
              </div>
            </div>

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
                  id="labelling_matches_specifications"
                  name="labelling_matches_specifications"
                  type="checkbox"
                  checked={formData.labelling_matches_specifications}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="labelling_matches_specifications" className="font-medium text-gray-700">
                  Labelling matches specifications
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

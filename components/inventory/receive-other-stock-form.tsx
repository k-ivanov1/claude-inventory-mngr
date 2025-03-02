'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, Plus } from 'lucide-react'
import { OtherStock } from '@/lib/types/stock'

interface OtherStockFormProps {
  onClose: () => void
  onSuccess?: () => void
  editItem?: OtherStock
}

export function ReceiveOtherStockForm({ onClose, onSuccess, editItem }: OtherStockFormProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

  // State for approved suppliers
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  // State for product types
  const [productTypes, setProductTypes] = useState<string[]>([])

  const [formData, setFormData] = useState<OtherStock>({
    date: new Date().toISOString().split('T')[0],
    product_name: '',
    type: '', // Using the correct property name from the interface
    supplier: '',
    invoice_number: '',
    batch_number: '',       // Now valid if OtherStock includes it
    best_before_date: '',   // Now valid if OtherStock includes it
    quantity: 0,
    price_per_unit: 0,
    package_size: 0,        // Add this missing required property
    is_damaged: false,
    is_accepted: true,
    checked_by: '',
    // Other StockBaseFields properties like id and created_at are optional
  })

  // Function to fetch approved suppliers
  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_approved', true)
        .order('name')
      
      if (error) throw error
      
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  // Function to fetch product types
  const fetchProductTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('product_types')
        .select('type')
        .order('type')
      
      if (error) throw error
      
      setProductTypes(data ? data.map((item: { type: string }) => item.type) : [])
    } catch (error) {
      console.error('Error fetching product types:', error)
    }
  }

  useEffect(() => {
    if (editItem) {
      setFormData(editItem)
    }
    fetchSuppliers()
    fetchProductTypes()
  }, [editItem])

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
        // Add any calculated fields here if needed
      }
      let result
      if (editItem?.id) {
        result = await supabase
          .from('stock_other')
          .update(dataToSubmit)
          .eq('id', editItem.id)
      } else {
        result = await supabase
          .from('stock_other')
          .insert(dataToSubmit)
      }
      if (result.error) {
        throw result.error
      }
      // Update inventory table if applicable
      await updateInventory(dataToSubmit)
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (error) {
      console.error('Error saving other stock:', error)
      alert('Failed to save stock item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateInventory = async (stockItem: OtherStock) => {
    const { data: existingItem } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_name', stockItem.product_name)
      .eq('product_type', stockItem.type)  // using type for product type
      .single()

    const stockValue = stockItem.quantity
    if (existingItem) {
      let quantityAdjustment = stockValue
      if (editItem?.id) {
        quantityAdjustment = stockValue - editItem.quantity
      }
      await supabase
        .from('inventory')
        .update({
          stock_level: existingItem.stock_level + quantityAdjustment,
          unit_price: stockItem.price_per_unit,
          last_updated: new Date().toISOString(),
        })
        .eq('id', existingItem.id)
    } else {
      await supabase
        .from('inventory')
        .insert({
          product_name: stockItem.product_name,
          product_type: stockItem.type,
          category: stockItem.type, // using type as category
          supplier: stockItem.supplier,
          stock_level: stockValue,
          unit_price: stockItem.price_per_unit,
          reorder_point: 5,
          sku: `${stockItem.type.substring(0, 3)}-${Date.now()}`,
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Field */}
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
            {/* Product Name Field */}
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
            {/* Product Type Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required
              >
                <option value="">Select a product type</option>
                {productTypes.map((type, idx) => (
                  <option key={idx} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            {/* Supplier Field as Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Supplier
              </label>
              <div className="flex items-center gap-2">
                <select
                  name="supplier"
                  value={formData.supplier}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.name}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => window.open('/dashboard/suppliers', '_blank')}
                  className="rounded-md bg-indigo-100 dark:bg-indigo-900 px-2 py-2 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800"
                  title="Add new supplier"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* Invoice Number Field */}
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
            {/* Batch Number Field */}
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
            {/* Best Before Date Field */}
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
            {/* Quantity Field */}
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
            {/* Package Size Field */}
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
            {/* Price per Unit Field */}
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
            {/* Checked By Field */}
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

          {/* Quality Checks */}
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
                <label
                  htmlFor="labelling_matches_specifications"
                  className="font-medium text-gray-700"
                >
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

          {/* Form Actions */}
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

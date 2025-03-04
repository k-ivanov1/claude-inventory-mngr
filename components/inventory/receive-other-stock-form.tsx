'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, CheckCircle, AlertTriangle } from 'lucide-react'
import { OtherStock } from '@/lib/types/stock'

interface RawMaterial {
  id: string
  name: string
  unit: string
  category: string
  stock_level?: number
}

interface ReceiveOtherStockFormProps {
  onClose: () => void
  onSuccess?: () => void
  editItem?: OtherStock
}

export function ReceiveOtherStockForm({ onClose, onSuccess, editItem }: ReceiveOtherStockFormProps) {
  const supabase = createClientComponentClient()

  // States for loading, submitting, and notifications
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // States for raw materials, suppliers, and product types
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState<string>('')
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [productTypes, setProductTypes] = useState<string[]>([])

  // Form data – note: while OtherStock may include extra fields,
  // our insert payload will only include columns present in stock_other.
  const [formData, setFormData] = useState<OtherStock>({
    date: new Date().toISOString().split('T')[0],
    product_name: '',
    type: '',
    supplier: '',
    invoice_number: '',
    batch_number: '',
    best_before_date: '',
    quantity: 0,
    price_per_unit: 0,
    package_size: 0,
    is_damaged: false,
    is_accepted: true,
    checked_by: '',
    labelling_matches_specifications: true,
  })

  // Fetch raw materials, suppliers and product types on mount
  useEffect(() => {
    fetchRawMaterials()
    fetchSuppliers()
    fetchProductTypes()
  }, [])

  // If editing an existing record, load its data into the form
  useEffect(() => {
    if (editItem) {
      setFormData({
        ...editItem,
        labelling_matches_specifications: editItem.labelling_matches_specifications ?? true,
      })
    }
  }, [editItem])

  const fetchRawMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('id, name, unit, category, stock_level')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      setRawMaterials(data || [])
    } catch (err: any) {
      console.error('Error fetching raw materials:', err)
      setError('Failed to load raw materials. Please try again.')
    }
  }

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_approved', true)
        .order('name')
      if (error) throw error
      setSuppliers(data || [])
    } catch (err: any) {
      console.error('Error fetching suppliers:', err)
      setError('Failed to load suppliers. Please try again.')
    }
  }

  const fetchProductTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('product_types')
        .select('name')
        .order('name')
      if (error) throw error
      if (data && data.length > 0) {
        setProductTypes(data.map((item: { name: string }) => item.name))
      } else {
        // Fallback default product type if none exists
        setProductTypes(['misc'])
      }
    } catch (err: any) {
      console.error('Error fetching product types:', err)
      setProductTypes(['misc'])
    }
  }

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const isChecked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: isChecked }))
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  // Optionally update the raw material's stock if one was selected
  const updateRawMaterial = async (rawMaterialId: string, quantity: number) => {
    try {
      const { data: rawMaterial, error } = await supabase
        .from('raw_materials')
        .select('stock_level')
        .eq('id', rawMaterialId)
        .single()
      if (error) throw error
      const newStockLevel = (rawMaterial?.stock_level || 0) + quantity
      const { error: updateError } = await supabase
        .from('raw_materials')
        .update({ stock_level: newStockLevel })
        .eq('id', rawMaterialId)
      if (updateError) throw updateError
    } catch (err: any) {
      console.error('Error updating raw material:', err)
      // Optionally setError here if needed
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Basic validations
      if (!formData.product_name) throw new Error('Please select a product.')
      if (!formData.type) throw new Error('Please select a product type.')
      if (!formData.supplier) throw new Error('Please select a supplier.')
      if (!formData.invoice_number) throw new Error('Invoice number is required.')
      if (formData.quantity <= 0) throw new Error('Quantity must be greater than zero.')

      // Build payload matching the stock_other table schema
      const dataToSubmit = {
        date: formData.date,
        product_name: formData.product_name,
        type: formData.type,
        supplier: formData.supplier,
        invoice_number: formData.invoice_number,
        quantity: formData.quantity,
        price_per_unit: formData.price_per_unit,
        is_damaged: formData.is_damaged,
        is_accepted: formData.is_accepted,
        checked_by: formData.checked_by,
        total_cost: formData.quantity * formData.price_per_unit,
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
      if (result.error) throw result.error

      // Update inventory (using the same key as in your Tea/Coffee form)
      await updateInventory({
        product_name: formData.product_name,
        type: formData.type,
        supplier: formData.supplier,
        quantity: formData.quantity,
        price_per_unit: formData.price_per_unit,
      })

      // If a raw material is selected, update its stock level
      if (selectedRawMaterialId) {
        await updateRawMaterial(selectedRawMaterialId, formData.quantity)
      }

      setSuccess('Stock received successfully')
      setTimeout(() => {
        if (onSuccess) onSuccess()
        onClose()
      }, 1500)
    } catch (err: any) {
      console.error('Error saving other stock:', err)
      setError(err.message || 'Failed to save stock item. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Update or insert into inventory based on the received stock
  // We now use the "category" column (as used in your Tea/Coffee form)
  const updateInventory = async (
    stockItem: Pick<OtherStock, 'product_name' | 'type' | 'supplier' | 'quantity' | 'price_per_unit'>
  ) => {
    try {
      const { data: existingItem, error: invError } = await supabase
        .from('inventory')
        .select('*')
        .eq('product_name', stockItem.product_name)
        .eq('category', stockItem.type)
        .single()

      const stockValue = stockItem.quantity

      if (existingItem) {
        let quantityAdjustment = stockValue
        if (editItem?.id) {
          quantityAdjustment = stockValue - editItem.quantity
        }
        const { error: updateError } = await supabase
          .from('inventory')
          .update({
            stock_level: existingItem.stock_level + quantityAdjustment,
            unit_price: stockItem.price_per_unit,
            last_updated: new Date().toISOString(),
          })
          .eq('id', existingItem.id)
        if (updateError) throw updateError
      } else {
        const sku = `${stockItem.type.substring(0, 3).toUpperCase()}-${Date.now()}`
        const { error: insertError } = await supabase
          .from('inventory')
          .insert({
            product_name: stockItem.product_name,
            category: stockItem.type,
            sku: sku,
            stock_level: stockValue,
            unit_price: stockItem.price_per_unit,
            supplier: stockItem.supplier,
            reorder_point: 5,
          })
        if (insertError) throw insertError
      }
    } catch (err) {
      console.error('Error updating inventory:', err)
      throw new Error('Failed to update inventory')
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto relative">
        {/* Success notification */}
        {success && (
          <div className="absolute top-4 right-4 bg-green-50 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-3 rounded shadow-lg z-50" role="alert">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span>{success}</span>
            </div>
          </div>
        )}
        {/* Error notification */}
        {error && (
          <div className="absolute top-4 right-4 bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded shadow-lg z-50" role="alert">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-4 text-red-700 dark:text-red-200">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editItem ? 'Edit Other Stock' : 'Receive Other Stock'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            {/* Product Type Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              >
                <option value="">Select a product type</option>
                {productTypes.map((type, idx) => (
                  <option key={idx} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {/* Product (Raw Material) Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product *
              </label>
              <select
                name="product_name"
                value={formData.product_name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              >
                <option value="">Select a product</option>
                {rawMaterials.map(material => (
                  <option key={material.id} value={material.name}>
                    {material.name} ({material.category})
                  </option>
                ))}
              </select>
            </div>
            {/* Supplier Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supplier *
              </label>
              <select
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              >
                <option value="">Select a supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.name}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            {/* Invoice Number Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                name="invoice_number"
                value={formData.invoice_number}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            {/* Quantity Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity (Units) *
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0"
                step="1"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            {/* Price per Unit Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price per Unit (£) *
              </label>
              <input
                type="number"
                name="price_per_unit"
                value={formData.price_per_unit}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            {/* Checked By Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Checked By *
              </label>
              <input
                type="text"
                name="checked_by"
                value={formData.checked_by}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
          </div>
          {/* Quality Checks */}
          <div className="space-y-4 pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-start">
              <div className="flex h-5 items-center">
                <input
                  id="is_damaged"
                  name="is_damaged"
                  type="checkbox"
                  checked={formData.is_damaged}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="is_damaged" className="font-medium text-gray-700 dark:text-gray-300">
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
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="is_accepted" className="font-medium text-gray-700 dark:text-gray-300">
                  Product is accepted
                </label>
              </div>
            </div>
          </div>
          {/* Form Actions */}
          <div className="flex justify-end gap-x-3 pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : editItem ? 'Update Stock' : 'Receive Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

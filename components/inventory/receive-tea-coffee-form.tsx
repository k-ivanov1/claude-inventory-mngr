'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, Plus } from 'lucide-react'
import { updateCostsForMaterial } from '@/lib/utils/raw-material-utils'

interface TeaCoffeeStockProps {
  onClose: () => void
  onSuccess: () => void
  editItem?: any
}

export function ReceiveTeaCoffeeForm({ 
  onClose, 
  onSuccess,
  editItem
}: TeaCoffeeStockProps) {
  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    product_name: '',
    supplier: '',
    invoice_number: '',
    quantity: '1',
    price_per_unit: '0',
    batch_number: '',
    best_before_date: '',
    type: 'raw_material',
    package_size: '250',
    is_damaged: false,
    labelling_matches_specifications: true,
    is_accepted: true,
    checked_by: ''
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    if (editItem) {
      // Format the date from ISO to YYYY-MM-DD for the date input
      const formattedDate = editItem.date 
        ? new Date(editItem.date).toISOString().split('T')[0]
        : ''
      
      // Format the best before date if it exists
      const formattedBBDate = editItem.best_before_date 
        ? new Date(editItem.best_before_date).toISOString().split('T')[0]
        : ''
      
      setFormData({
        date: formattedDate,
        product_name: editItem.product_name || '',
        supplier: editItem.supplier || '',
        invoice_number: editItem.invoice_number || '',
        quantity: editItem.quantity?.toString() || '1',
        price_per_unit: editItem.price_per_unit?.toString() || '0',
        batch_number: editItem.batch_number || '',
        best_before_date: formattedBBDate,
        type: editItem.type || 'raw_material',
        package_size: editItem.package_size?.toString() || '250',
        is_damaged: editItem.is_damaged || false,
        labelling_matches_specifications: editItem.labelling_matches_specifications ?? true,
        is_accepted: editItem.is_accepted ?? true,
        checked_by: editItem.checked_by || ''
      })
    }
    
    fetchSuppliers()
    fetchProducts()
  }, [editItem])

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name')
      
      if (error) throw error

      setSuppliers(data || [])
    } catch (err) {
      console.error('Error loading suppliers:', err)
      setError('Failed to load suppliers')
    }
  }

  const fetchProducts = async () => {
    try {
      // Fetch raw materials from the raw_materials table
      const { data, error } = await supabase
        .from('raw_materials')
        .select('id, name, unit, category')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error

      setProducts(data || [])
    } catch (err) {
      console.error('Error loading products:', err)
      setError('Failed to load products')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement
      setFormData({
        ...formData,
        [name]: target.checked
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const calculateTotalCost = () => {
    const quantity = parseFloat(formData.quantity) || 0
    const pricePerUnit = parseFloat(formData.price_per_unit) || 0
    return (quantity * pricePerUnit).toFixed(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.date || !formData.product_name || !formData.supplier) {
        throw new Error('Please complete all required fields')
      }

      // Find the selected product details
      const selectedProduct = products.find(p => p.name === formData.product_name)
      if (!selectedProduct && formData.type === 'raw_material') {
        throw new Error('Selected product not found in raw materials')
      }

      // Find supplier ID from supplier name
      const selectedSupplier = suppliers.find(s => s.name === formData.supplier)
      if (!selectedSupplier) {
        throw new Error('Selected supplier not found')
      }

      // Convert string values to numbers
      const quantity = parseFloat(formData.quantity)
      const pricePerUnit = parseFloat(formData.price_per_unit)
      const totalCost = quantity * pricePerUnit

      // Create stock receiving record
      const stockData = {
        date: formData.date,
        item_type: formData.type,
        item_id: selectedProduct?.id,
        supplier_id: selectedSupplier.id,
        batch_number: formData.batch_number,
        quantity: quantity,
        unit_price: pricePerUnit,
        total_cost: totalCost,
        invoice_number: formData.invoice_number,
        best_before_date: formData.best_before_date || null,
        is_accepted: formData.is_accepted,
        notes: formData.is_damaged ? 'Damaged on arrival' : '',
        checked_by: formData.checked_by
      }

      let result
      
      if (editItem?.id) {
        // Update existing record
        result = await supabase
          .from('stock_receiving')
          .update(stockData)
          .eq('id', editItem.id)
      } else {
        // Insert new record
        result = await supabase
          .from('stock_receiving')
          .insert(stockData)
      }

      if (result.error) throw result.error

      // Update inventory if stock is accepted
      if (formData.is_accepted) {
        // Check if item already exists in inventory
        const { data: existingItem } = await supabase
          .from('inventory')
          .select('*')
          .eq('product_name', formData.product_name)
          .maybeSingle()

        if (existingItem) {
          // Update existing inventory item
          await supabase
            .from('inventory')
            .update({
              stock_level: existingItem.stock_level + quantity,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingItem.id)
        } else {
          // Create new inventory item
          await supabase
            .from('inventory')
            .insert({
              product_name: formData.product_name,
              sku: selectedProduct?.sku || generateSKU(selectedProduct?.category || 'raw'),
              category: selectedProduct?.category || 'uncategorized',
              stock_level: quantity,
              unit: selectedProduct?.unit || 'kg',
              unit_price: pricePerUnit,
              reorder_point: 5, // Default reorder point
              is_recipe_based: false,
              is_final_product: false,
              last_updated: new Date().toISOString()
            })
        }

        // If it's a raw material, update recipe costs that use this material
        if (formData.type === 'raw_material' && selectedProduct?.id) {
          await updateCostsForMaterial(selectedProduct.id)
        }
      }

      // Call success callback
      onSuccess()

    } catch (err: any) {
      console.error('Error saving stock:', err)
      setError(err.message || 'An error occurred while saving the stock')
      setLoading(false)
    }
  }

  // Helper function to generate SKU
  const generateSKU = (category: string) => {
    const prefix = category.substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString().substring(9, 13)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    
    return `${prefix}-${timestamp}${random}`
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {editItem ? 'Edit Stock Entry' : 'Receive New Stock'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative dark:bg-red-900 dark:border-red-700 dark:text-red-100" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type*
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                required
              >
                <option value="raw_material">Raw Material</option>
                <option value="packaging">Packaging</option>
                <option value="gear">Gear/Equipment</option>
                <option value="books">Books</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Date*
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>

            {/* Product Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Product*
              </label>
              <select
                name="product_name"
                value={formData.product_name}
                onChange={handleInputChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                required
              >
                <option value="">Select a product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.name}>
                    {product.name} ({product.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Supplier*
              </label>
              <select
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                required
              >
                <option value="">Select a supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.name}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Invoice Number*
              </label>
              <input
                type="text"
                name="invoice_number"
                value={formData.invoice_number}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>

            {/* Batch Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Batch Number*
              </label>
              <input 
                type="text"
                name="batch_number"
                value={formData.batch_number}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>

            {/* Best Before Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Best Before Date
              </label>
              <input
                type="date"
                name="best_before_date"
                value={formData.best_before_date}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Quantity*
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>

            {/* Price Per Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price Per Unit (£)*
              </label>
              <input
                type="number"
                name="price_per_unit"
                value={formData.price_per_unit}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>

            {/* Total Cost (Calculated) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Cost (£)
              </label>
              <div className="mt-1 block w-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-md shadow-sm sm:text-sm dark:text-gray-300">
                £{calculateTotalCost()}
              </div>
            </div>

            {/* Package Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Package Size (g)
              </label>
              <input
                type="number"
                name="package_size"
                value={formData.package_size}
                onChange={handleInputChange}
                min="0"
                className="mt-1 block w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            {/* Checked By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Checked By*
              </label>
              <input
                type="text"
                name="checked_by"
                value={formData.checked_by}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="is_damaged"
                  name="is_damaged"
                  type="checkbox"
                  checked={formData.is_damaged}
                  onChange={handleInputChange}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-700 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="is_damaged" className="font-medium text-gray-700 dark:text-gray-300">
                  Damaged on Arrival
                </label>
                <p className="text-gray-500 dark:text-gray-400">Mark if the product arrived damaged</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="labelling_matches_specifications"
                  name="labelling_matches_specifications"
                  type="checkbox"
                  checked={formData.labelling_matches_specifications}
                  onChange={handleInputChange}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-700 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="labelling_matches_specifications" className="font-medium text-gray-700 dark:text-gray-300">
                  Labelling Matches Specifications
                </label>
                <p className="text-gray-500 dark:text-gray-400">Confirm that labelling complies with requirements</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="is_accepted"
                  name="is_accepted"
                  type="checkbox"
                  checked={formData.is_accepted}
                  onChange={handleInputChange}
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-700 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="is_accepted" className="font-medium text-gray-700 dark:text-gray-300">
                  Accept Stock
                </label>
                <p className="text-gray-500 dark:text-gray-400">Check to add this stock to your inventory</p>
              </div>
            </div>
          </div>

          {/* Submit and Cancel Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {loading ? 'Saving...' : editItem ? 'Update Stock' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

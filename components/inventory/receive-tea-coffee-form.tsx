'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X } from 'lucide-react'
import { TeaCoffeeStock } from '@/lib/types/stock'
import { updateCostsForMaterial } from '@/lib/utils/raw-material-utils'

interface ReceiveFormProps {
  onClose: () => void
  onSuccess: () => void
  editItem?: TeaCoffeeStock
}

export function ReceiveTeaCoffeeForm({ onClose, onSuccess, editItem }: ReceiveFormProps) {
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [finalProducts, setFinalProducts] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Default form data
  const initialFormData: TeaCoffeeStock = {
    date: new Date().toISOString().split('T')[0],
    type: 'raw_material',
    product_name: '',
    supplier: '',
    invoice_number: '',
    batch_number: '',
    best_before_date: '',
    quantity: 0,
    package_size: 0,
    price_per_unit: 0,
    is_damaged: false,
    labelling_matches_specifications: true,
    is_accepted: true,
    checked_by: ''
  }
  
  const [formData, setFormData] = useState<TeaCoffeeStock>(initialFormData)
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  
  const supabase = createClientComponentClient()
  
  // Load edit data if provided
  useEffect(() => {
    if (editItem) {
      setFormData(editItem)
    }
    
    loadRawMaterials()
    loadFinalProducts()
    loadSuppliers()
  }, [editItem])
  
  const loadRawMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name')
      
      if (error) throw error
      setRawMaterials(data || [])
    } catch (error) {
      console.error('Error loading raw materials:', error)
    }
  }
  
  const loadFinalProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('final_products')
        .select('*')
        .order('name')
      
      if (error) throw error
      setFinalProducts(data || [])
    } catch (error) {
      console.error('Error loading final products:', error)
    }
  }
  
  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name')
      
      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error loading suppliers:', error)
    }
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked
      })
    } else if (type === 'number') {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
    
    // Calculate derived values
    if (name === 'quantity' || name === 'price_per_unit' || name === 'package_size') {
      const quantity = name === 'quantity' ? parseFloat(value) || 0 : formData.quantity
      const pricePerUnit = name === 'price_per_unit' ? parseFloat(value) || 0 : formData.price_per_unit
      const packageSize = name === 'package_size' ? parseFloat(value) || 0 : formData.package_size
      
      // Calculate total cost
      const totalCost = quantity * pricePerUnit
      
      // Calculate total kg and price per kg for tea/coffee
      let totalKg = 0
      let pricePerKg = 0
      
      if (packageSize > 0) {
        totalKg = (quantity * packageSize) / 1000 // Convert g to kg
        pricePerKg = packageSize > 0 ? pricePerUnit / (packageSize / 1000) : 0
      }
      
      setFormData(prev => ({
        ...prev,
        total_cost: totalCost,
        total_kg: totalKg,
        price_per_kg: pricePerKg
      }))
    }
  }
  
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setFormData({
      ...formData,
      type: value as TeaCoffeeStock['type']
    })
  }
  
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value
    setSelectedItemId(selectedId)
    
    // Find the selected product name based on the type
    if (formData.type === 'raw_material') {
      const selectedMaterial = rawMaterials.find(m => m.id === selectedId)
      if (selectedMaterial) {
        setFormData({
          ...formData,
          product_name: selectedMaterial.name
        })
      }
    } else if (formData.type === 'final_product') {
      const selectedProduct = finalProducts.find(p => p.id === selectedId)
      if (selectedProduct) {
        setFormData({
          ...formData,
          product_name: selectedProduct.name
        })
      }
    }
  }
  
  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value
    setSelectedSupplierId(selectedId)
    
    const selectedSupplier = suppliers.find(s => s.id === selectedId)
    if (selectedSupplier) {
      setFormData({
        ...formData,
        supplier: selectedSupplier.name
      })
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      // Validate required fields
      if (!formData.date || !formData.product_name || !formData.supplier || !formData.invoice_number) {
        throw new Error('Please fill in all required fields')
      }
      
      if (formData.quantity <= 0) {
        throw new Error('Quantity must be greater than zero')
      }
      
      // Prepare data for submission to the stock_receiving table
      const stockData = {
        date: formData.date,
        item_type: formData.type,
        item_id: selectedItemId,
        supplier_id: selectedSupplierId,
        batch_number: formData.batch_number,
        quantity: formData.quantity,
        unit_price: formData.price_per_unit,
        total_cost: formData.total_cost,
        invoice_number: formData.invoice_number,
        best_before_date: formData.best_before_date || null,
        is_accepted: formData.is_accepted,
        checked_by: formData.checked_by,
        notes: ''
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

      // Update costs for this material (if it's a raw material)
      if (formData.type === 'raw_material' && selectedItemId) {
        console.log('Updating costs for material:', selectedItemId)
        await updateCostsForMaterial(selectedItemId)
      }
      
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error saving stock:', error)
      setError(error.message || 'Failed to save stock. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-6 overflow-y-auto max-h-[90vh]">
        {/* Form Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editItem ? 'Edit Stock Item' : 'Receive New Stock'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative mb-4" role="alert">
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Date*
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

            {/* Item Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Item Type*
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleTypeChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              >
                <option value="raw_material">Raw Material</option>
                <option value="final_product">Final Product</option>
                <option value="tea">Tea</option>
                <option value="coffee">Coffee</option>
              </select>
            </div>

            {/* Product */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {formData.type === 'raw_material' ? 'Raw Material*' : 'Product*'}
              </label>
              <select
                name="product"
                value={selectedItemId}
                onChange={handleProductChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              >
                <option value="">Select {formData.type === 'raw_material' ? 'Raw Material' : 'Product'}</option>
                {formData.type === 'raw_material' && rawMaterials.map(material => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
                {(formData.type === 'final_product' || formData.type === 'tea' || formData.type === 'coffee') && finalProducts.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
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
                value={selectedSupplierId}
                onChange={handleSupplierChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
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
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            {/* Batch Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Batch Number
              </label>
              <input
                type="text"
                name="batch_number"
                value={formData.batch_number}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Quantity and Price Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Quantity*
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

            {/* Package Size (g) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Package Size (g)
              </label>
              <input
                type="number"
                name="package_size"
                value={formData.package_size}
                onChange={handleChange}
                min="0"
                step="1"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Price per Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price per Unit (£)*
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
            
            {/* Total Cost (calculated) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Cost (£)
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm sm:text-sm text-gray-900 dark:text-gray-100">
                £{(formData.total_cost || 0).toFixed(2)}
              </div>
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
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Total kg (for tea/coffee) */}
            {(formData.type === 'tea' || formData.type === 'coffee') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total kg
                </label>
                <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm sm:text-sm text-gray-900 dark:text-gray-100">
                  {(formData.total_kg || 0).toFixed(2)} kg
                </div>
              </div>
            )}

            {/* Price per kg (for tea/coffee) */}
            {(formData.type === 'tea' || formData.type === 'coffee') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Price per kg (£)
                </label>
                <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm sm:text-sm text-gray-900 dark:text-gray-100">
                  £{(formData.price_per_kg || 0).toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Quality & Acceptance Section */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              {/* Checked By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Checked By*
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

              {/* Checkboxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Is Damaged */}
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
                      Damaged
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">
                      Check if the shipment arrived damaged
                    </p>
                  </div>
                </div>

                {/* Labelling Matches Specifications */}
                <div className="flex items-start">
                  <div className="flex h-5 items-center">
                    <input
                      id="labelling_matches_specifications"
                      name="labelling_matches_specifications"
                      type="checkbox"
                      checked={formData.labelling_matches_specifications}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="labelling_matches_specifications" className="font-medium text-gray-700 dark:text-gray-300">
                      Labelling Matches Specifications
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">
                      Check if the product labelling is correct
                    </p>
                  </div>
                </div>

                {/* Is Accepted */}
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
                      Accept Stock
                    </label>
                    <p className="text-gray-500 dark:text-gray-400">
                      Check to add this stock to inventory
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400"
              disabled={loading}
            >
              {loading ? 'Saving...' : (editItem ? 'Update Stock' : 'Add Stock')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

              

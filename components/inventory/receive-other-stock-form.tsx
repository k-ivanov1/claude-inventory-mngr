'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X } from 'lucide-react'
import { OtherStock } from '@/lib/types/stock'

interface RawMaterial {
  id: string
  name: string
  unit: string
  category: string
  stock_level?: number
}

interface OtherStockFormProps {
  onClose: () => void
  onSuccess?: () => void
  editItem?: OtherStock
}

export function ReceiveOtherStockForm({ 
  onClose, 
  onSuccess, 
  editItem 
}: OtherStockFormProps) {
  const supabase = createClientComponentClient()
  
  // Loading state for the form submission
  const [loading, setLoading] = useState(false)
  
  // Raw materials & selected raw material
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState<string>('')

  // Approved suppliers
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])

  // Product types
  const [productTypes, setProductTypes] = useState<string[]>([])

  // Form data (batch_number & package_size removed from UI but defaulted in submission)
  const [formData, setFormData] = useState<OtherStock>({
    date: new Date().toISOString().split('T')[0],
    product_name: '',
    type: '', 
    supplier: '',
    invoice_number: '',
    batch_number: '', // Not displayed, default to empty
    best_before_date: '',
    quantity: 0,
    price_per_unit: 0,
    package_size: 0,  // Not displayed, default to 0
    is_damaged: false,
    is_accepted: true,
    checked_by: '',
    labelling_matches_specifications: true
  })

  useEffect(() => {
    if (editItem) {
      // If editing, populate form
      setFormData({
        ...editItem,
        labelling_matches_specifications: editItem.labelling_matches_specifications ?? true
      })
    }
    // Fetch data for the dropdowns
    fetchRawMaterials()
    fetchSuppliers()
    fetchProductTypes()
  }, [editItem])

  // Fetch raw materials (exclude tea/coffee if desired)
  const fetchRawMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('id, name, unit, category, stock_level')
        .eq('is_active', true)
        // .not('category', 'in', '(tea,coffee)') // Uncomment if you want to exclude tea/coffee
        .order('name')
      if (error) throw error
      setRawMaterials(data || [])
    } catch (error: any) {
      console.error('Error fetching raw materials:', error)
      alert('Failed to load raw materials. Please try again.')
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
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

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
      // Fallback product types
      setProductTypes(['packaging', 'gear', 'books', 'misc'])
    }
  }

  // Common input change handler
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  // Update the raw material stock after receiving items
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
    } catch (error) {
      console.error('Error updating raw material:', error)
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const dataToSubmit = {
  date: formData.date,
  product_name: formData.product_name,
  type: formData.type,
  supplier: formData.supplier,
  invoice_number: formData.invoice_number,
  batch_number: formData.batch_number,           // Added
  best_before_date: formData.best_before_date,     // Added
  quantity: formData.quantity,
  price_per_unit: formData.price_per_unit,
  package_size: formData.package_size,             // Added
  is_damaged: formData.is_damaged,
  is_accepted: formData.is_accepted,
  checked_by: formData.checked_by,
  labelling_matches_specifications: formData.labelling_matches_specifications, // Added
  total_cost: formData.quantity * formData.price_per_unit,
}


      let result
      if (editItem?.id) {
        // Update existing stock item
        result = await supabase
          .from('stock_other')
          .update(dataToSubmit)
          .eq('id', editItem.id)
      } else {
        // Insert new stock item
        result = await supabase
          .from('stock_other')
          .insert(dataToSubmit)
      }

      if (result.error) throw result.error

      // Update inventory table with the new stock quantity
      await updateInventory(dataToSubmit)

      // Update raw material's stock level if a raw material was selected
      if (selectedRawMaterialId) {
        await updateRawMaterial(selectedRawMaterialId, formData.quantity)
      }

      if (onSuccess) onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error saving other stock:', error)
      alert('Failed to save stock item. Please try again.')
    } finally {
      setLoading(false)
    }
  } // End handleSubmit function

  // Update or insert into inventory
  const updateInventory = async (stockItem: OtherStock) => {
    const { data: existingItem } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_name', stockItem.product_name)
      .eq('product_type', stockItem.type)
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
          category: stockItem.type,
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm 
                  focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 
                  text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            {/* Product Type Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Product Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm 
                  focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 
                  text-gray-900 dark:text-gray-100"
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

            {/* Raw Material Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Raw Material
              </label>
              <select
                name="raw_material_id"
                value={selectedRawMaterialId}
                onChange={(e) => {
                  const matId = e.target.value;
                  setSelectedRawMaterialId(matId);
                  const selectedMaterial = rawMaterials.find(m => m.id === matId);
                  if (selectedMaterial) {
                    setFormData(prev => ({
                      ...prev,
                      product_name: selectedMaterial.name,
                      type: selectedMaterial.category
                    }));
                  }
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm 
                  focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 
                  text-gray-900 dark:text-gray-100"
              >
                <option value="">Select a raw material</option>
                {rawMaterials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name} ({material.category}) - {material.unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Supplier
              </label>
              <select
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm 
                  focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 
                  text-gray-900 dark:text-gray-100"
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

            {/* Invoice Number Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Invoice Number
              </label>
              <input
                type="text"
                name="invoice_number"
                value={formData.invoice_number}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm 
                  focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 
                  text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            {/* Quantity Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Quantity (Units)
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="0"
                step="1"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm 
                  focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 
                  text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            {/* Price per Unit Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price per Unit (£)
              </label>
              <input
                type="number"
                name="price_per_unit"
                value={formData.price_per_unit}
                onChange={handleChange}
                min="0"
                step="any"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm 
                  focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 
                  text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            {/* Checked By Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Checked By
              </label>
              <input
                type="text"
                name="checked_by"
                value={formData.checked_by}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm 
                  focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 
                  text-gray-900 dark:text-gray-100"
                required
              />
            </div>
          </div>

          {/* Quality Checks */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                  id="labelling_matches_specifications"
                  name="labelling_matches_specifications"
                  type="checkbox"
                  checked={formData.labelling_matches_specifications}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label
                  htmlFor="labelling_matches_specifications"
                  className="font-medium text-gray-700 dark:text-gray-300">
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
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
              </div>
              <div className="ml-3 text-sm">
                <label 
                  htmlFor="is_accepted" 
                  className="font-medium text-gray-700 dark:text-gray-300"
                >
                  Product is accepted
                </label>
              </div>
            </div>
          </div>

          {/* Calculated Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Quantity
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm sm:text-sm text-gray-900 dark:text-gray-100">
                {formData.quantity} units
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Unit Price
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm sm:text-sm text-gray-900 dark:text-gray-100">
                £{formData.price_per_unit.toFixed(2)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Purchase Cost
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 
                bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm sm:text-sm text-gray-900 dark:text-gray-100">
                £{(formData.quantity * formData.price_per_unit).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm font-semibold 
                text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 
                dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold 
                text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : editItem ? 'Update Stock' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

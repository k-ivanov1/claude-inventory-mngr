'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, Plus } from 'lucide-react'
import { OtherStock } from '@/lib/types/stock'

interface RawMaterial {
  id: string
  name: string
  unit: string
  category: string
}

interface OtherStockFormProps {
  onClose: () => void
  onSuccess?: () => void
  editItem?: OtherStock
}

export function ReceiveOtherStockForm({ onClose, onSuccess, editItem }: OtherStockFormProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

  // State for raw materials, search, and selected raw material ID
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState<string>('')

  // State for approved suppliers
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])

  // State for product types
  const [productTypes, setProductTypes] = useState<string[]>([])

  // Note: Although OtherStock type includes batch_number and package_size,
  // these fields are not needed in the UI. We set them to default values.
  const [formData, setFormData] = useState<OtherStock>({
    date: new Date().toISOString().split('T')[0],
    product_name: '',
    type: '', 
    supplier: '',
    invoice_number: '',
    batch_number: '', // will be overridden as ""
    best_before_date: '',
    quantity: 0,
    price_per_unit: 0,
    package_size: 0,  // will be overridden as 0
    is_damaged: false,
    is_accepted: true,
    checked_by: '',
    labelling_matches_specifications: true
  })

  useEffect(() => {
    if (editItem) {
      setFormData({
        ...editItem,
        labelling_matches_specifications: editItem.labelling_matches_specifications ?? true
      })
    }
    fetchRawMaterials()
    fetchSuppliers()
    fetchProductTypes()
  }, [editItem])

  const fetchRawMaterials = async () => {
    try {
      // Fetch raw materials excluding tea and coffee
      const { data, error } = await supabase
        .from('raw_materials')
        .select('id, name, unit, category, stock_level')
        .not('category', 'in', '(tea,coffee)')
        .eq('is_active', true)
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

  // Filter raw materials based on search term
  const filteredRawMaterials = rawMaterials.filter(material => 
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Override batch_number and package_size as these fields are not required
      const dataToSubmit = {
        ...formData,
        batch_number: "",
        package_size: 0,
        total_cost: formData.quantity * formData.price_per_unit
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

      // Update raw material's stock level if a raw material was selected
      if (selectedRawMaterialId) {
        await updateRawMaterial(selectedRawMaterialId, formData.quantity)
      }
      
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (error: any) {
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

  const updateRawMaterial = async (rawMaterialId: string, quantity: number) => {
    try {
      const { data: rawMaterial, error } = await supabase
         .from('raw_materials')
         .select('stock_level')
         .eq('id', rawMaterialId)
         .single();
      if (error) throw error;
      const newStockLevel = (rawMaterial.stock_level || 0) + quantity;
      const { error: updateError } = await supabase
         .from('raw_materials')
         .update({ stock_level: newStockLevel })
         .eq('id', rawMaterialId);
      if (updateError) throw updateError;
    } catch (error) {
      console.error("Error updating raw material", error);
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
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

            {/* Raw Material Selection Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Raw Material
              </label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  placeholder="Search raw materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                {searchTerm && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredRawMaterials.length > 0 ? (
                      filteredRawMaterials.map((material) => (
                        <div 
                          key={material.id} 
                          onClick={() => {
                            setFormData({
                              ...formData, 
                              product_name: material.name,
                              type: material.category
                            });
                            setSelectedRawMaterialId(material.id);
                            setSearchTerm('');
                          }}
                          className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          {material.name} ({material.category}) - {material.unit}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500 dark:text-gray-400">
                        No raw materials found
                      </div>
                    )}
                  </div>
                )}
              </div>
              {formData.product_name && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Selected: {formData.product_name}
                </div>
              )}
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
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            {/* Best Before Date Field */}
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
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                step="0.01"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
              <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm sm:text-sm text-gray-900 dark:text-gray-100">
                {formData.quantity} units
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Unit Price
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm sm:text-sm text-gray-900 dark:text-gray-100">
                £{formData.price_per_unit.toFixed(2)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Purchase Cost
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 shadow-sm sm:text-sm text-gray-900 dark:text-gray-100">
                £{(formData.quantity * formData.price_per_unit).toFixed(2)}
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
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
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

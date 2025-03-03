'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, Plus, AlertTriangle, CheckCircle } from 'lucide-react'

// Raw material interface
interface RawMaterial {
  id: string
  name: string
  unit: string
  category: string
}

// Type interface for product types
interface ProductType {
  id?: string
  name: string
}

// Tea/Coffee specific fields
interface TeaCoffeeStock {
  id?: string
  date: string
  product_name: string
  raw_material_id: string
  type: string
  supplier: string
  invoice_number: string
  batch_number: string
  best_before_date: string
  quantity: number
  price_per_unit: number
  package_size: number // in kg
  is_damaged: boolean
  is_accepted: boolean
  checked_by: string
  labelling_matches_specifications: boolean
  total_kg?: number // Calculated field
  price_per_kg?: number // Calculated field
  total_cost?: number // Calculated field
}

interface ReceiveTeaCoffeeFormProps {
  onClose: () => void
  onSuccess?: () => void
  editItem?: TeaCoffeeStock
}

export function ReceiveTeaCoffeeForm({ 
  onClose, 
  onSuccess, 
  editItem 
}: ReceiveTeaCoffeeFormProps) {
  // State
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // State for product types management
  const [productTypes, setProductTypes] = useState<ProductType[]>([])
  const [isManagingTypes, setIsManagingTypes] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null)
  const [editingTypeName, setEditingTypeName] = useState('')

  // State for approved suppliers
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  
  const [formData, setFormData] = useState<TeaCoffeeStock>({
    date: new Date().toISOString().split('T')[0],
    product_name: '',
    raw_material_id: '',
    type: 'tea',
    supplier: '',
    invoice_number: '',
    batch_number: '',
    best_before_date: '',
    quantity: 0,
    price_per_unit: 0,
    package_size: 0, // in kg
    is_damaged: false,
    is_accepted: true,
    checked_by: '',
    labelling_matches_specifications: true
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (editItem) {
      // If editing, convert package_size from grams to kg if necessary
      setFormData({
        ...editItem,
        labelling_matches_specifications: editItem.labelling_matches_specifications ?? true
      })
    }
  }, [editItem])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchRawMaterials(),
        fetchProductTypes(),
        fetchSuppliers()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchRawMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('id, name, unit, category')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      
      setRawMaterials(data || [])
    } catch (error: any) {
      console.error('Error fetching raw materials:', error)
      throw error
    }
  }

  const fetchProductTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('product_types')
        .select('id, name')
        .order('name')
      
      if (error) throw error
      
      if (data && data.length > 0) {
        setProductTypes(data)
      } else {
        // Default product types if none exists
        setProductTypes([
          { id: '1', name: 'tea' },
          { id: '2', name: 'coffee' }
        ])
      }
    } catch (error: any) {
      console.error('Error fetching product types:', error)
      // Fallback to default types
      setProductTypes([
        { id: '1', name: 'tea' },
        { id: '2', name: 'coffee' }
      ])
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
    } catch (error: any) {
      console.error('Error fetching suppliers:', error)
      throw error
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
    
    // When raw_material_id changes, update the product_name
    if (name === 'raw_material_id') {
      const selectedMaterial = rawMaterials.find(material => material.id === value)
      if (selectedMaterial) {
        setFormData(prev => ({ 
          ...prev, 
          [name]: value,
          product_name: selectedMaterial.name
        }))
      }
    }
  }

  // Type management functions
  const handleAddType = async () => {
    if (!newTypeName.trim()) {
      setError('Type name cannot be empty')
      return
    }

    if (productTypes.some(type => type.name.toLowerCase() === newTypeName.toLowerCase())) {
      setError('This type already exists')
      return
    }

    try {
      const { data, error } = await supabase
        .from('product_types')
        .insert({ name: newTypeName.trim() })
        .select()
      
      if (error) throw error
      
      // If successful, update product types
      await fetchProductTypes()
      setNewTypeName('')
      setSuccess('Type added successfully')
      
      // Auto-select the new type
      if (data && data[0]) {
        setFormData(prev => ({ ...prev, type: data[0].name }))
      }
    } catch (error: any) {
      console.error('Error adding product type:', error)
      setError('Failed to add product type: ' + error.message)
    }
  }

  const handleEditType = async () => {
    if (!editingTypeName.trim() || !editingTypeId) {
      setError('Type name cannot be empty')
      return
    }

    if (productTypes.some(type => 
      type.id !== editingTypeId && 
      type.name.toLowerCase() === editingTypeName.toLowerCase()
    )) {
      setError('This type name already exists')
      return
    }

    try {
      const { error } = await supabase
        .from('product_types')
        .update({ name: editingTypeName.trim() })
        .eq('id', editingTypeId)
      
      if (error) throw error
      
      // If successful, update product types
      await fetchProductTypes()
      
      // Reset editing state
      setEditingTypeId(null)
      setEditingTypeName('')
      setSuccess('Type updated successfully')
      
      // If the current form type was the edited one, update it
      if (formData.type === productTypes.find(t => t.id === editingTypeId)?.name) {
        setFormData(prev => ({ ...prev, type: editingTypeName.trim() }))
      }
    } catch (error: any) {
      console.error('Error updating product type:', error)
      setError('Failed to update product type: ' + error.message)
    }
  }

  const handleDeleteType = async (typeId: string) => {
    const typeToDelete = productTypes.find(t => t.id === typeId)
    if (!typeToDelete) return
    
    if (formData.type === typeToDelete.name) {
      setError('Cannot delete a type that is currently selected')
      return
    }
    
    try {
      // Check if type is in use
      const { count, error: countError } = await supabase
        .from('stock_tea_coffee')
        .select('id', { count: 'exact', head: true })
        .eq('type', typeToDelete.name)
      
      if (countError) throw countError
      
      if (count && count > 0) {
        setError(`Cannot delete type "${typeToDelete.name}" as it is used by ${count} items`)
        return
      }
      
      const { error } = await supabase
        .from('product_types')
        .delete()
        .eq('id', typeId)
      
      if (error) throw error
      
      // If successful, update product types
      await fetchProductTypes()
      setSuccess('Type deleted successfully')
    } catch (error: any) {
      console.error('Error deleting product type:', error)
      setError('Failed to delete product type: ' + error.message)
    }
  }

  // Filter raw materials based on search term
  const filteredRawMaterials = rawMaterials.filter(material => 
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calculate derived values
  const totalKg = formData.quantity * formData.package_size
  const pricePerKg = formData.package_size > 0 
    ? formData.price_per_unit / formData.package_size
    : 0
  const totalCost = formData.quantity * formData.price_per_unit

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    
    try {
      // Validate required fields
      if (!formData.raw_material_id || !formData.product_name) {
        throw new Error('Please select a product')
      }
      
      if (!formData.type) {
        throw new Error('Please select a product type')
      }
      
      if (!formData.supplier) {
        throw new Error('Please select a supplier')
      }

      if (!formData.batch_number) {
        throw new Error('Batch number is required')
      }
      
      if (formData.quantity <= 0) {
        throw new Error('Quantity must be greater than zero')
      }
      
      if (formData.package_size <= 0) {
        throw new Error('Package size must be greater than zero')
      }
      
      // Prepare data for submission
      const dataToSubmit = {
        ...formData,
        total_kg: totalKg,
        price_per_kg: pricePerKg,
        total_cost: totalCost
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
      
      if (result.error) throw result.error
      
      // Update inventory table
      await updateInventory(formData)
      
      // Show success message
      setSuccess('Stock received successfully')
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        }
        onClose()
      }, 1500)
    } catch (error: any) {
      console.error('Error saving stock:', error)
      setError(error.message || 'Failed to save stock. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateInventory = async (stockItem: TeaCoffeeStock) => {
    try {
      // Check if item exists in inventory
      const { data: existingItem } = await supabase
        .from('inventory')
        .select('*')
        .eq('product_name', stockItem.product_name)
        .eq('category', stockItem.type)
        .single()
      
      const stockValue = stockItem.quantity
      
      if (existingItem) {
        // Calculate quantity adjustment
        let quantityAdjustment = stockValue
        if (editItem?.id) {
          quantityAdjustment = stockValue - (editItem.quantity || 0)
        }
        
        // Update existing inventory item
        await supabase
          .from('inventory')
          .update({
            stock_level: existingItem.stock_level + quantityAdjustment,
            unit_price: stockItem.price_per_unit,
            last_updated: new Date().toISOString(),
          })
          .eq('id', existingItem.id)
      } else {
        // Generate SKU
        const prefix = stockItem.type.substring(0, 3).toUpperCase()
        const timestamp = Date.now().toString().substring(9, 13)
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        const sku = `${prefix}-${timestamp}${random}`
        
        // Create new inventory item
        await supabase
          .from('inventory')
          .insert({
            product_name: stockItem.product_name,
            category: stockItem.type,
            sku: sku,
            stock_level: stockValue,
            unit_price: stockItem.price_per_unit,
            supplier: stockItem.supplier,
            reorder_point: 5, // Default reorder point
            unit: 'kg', // Default unit
          })
      }
    } catch (error) {
      console.error('Error updating inventory:', error)
      throw new Error('Failed to update inventory')
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center p-4 z-50">
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
              <button 
                onClick={() => setError(null)}
                className="ml-4 text-red-700 dark:text-red-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editItem ? 'Edit Tea/Coffee Stock' : 'Receive Tea/Coffee Stock'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
          >
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

            {/* Product Type Field with Management */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Type *
                </label>
                <button
                  type="button"
                  onClick={() => setIsManagingTypes(!isManagingTypes)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                >
                  {isManagingTypes ? 'Done' : 'Manage Types'}
                </button>
              </div>
              
              {isManagingTypes ? (
                <div className="mt-2 p-3 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <h4 className="text-sm font-medium mb-2 text-gray-900 dark:text-white">Manage Product Types</h4>
                  
                  {/* Add new type */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="New type name"
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                  
                  {/* List of types */}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {productTypes.map(type => (
                      <div key={type.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                        {editingTypeId === type.id ? (
                          <div className="flex items-center flex-grow">
                            <input
                              type="text"
                              value={editingTypeName}
                              onChange={(e) => setEditingTypeName(e.target.value)}
                              className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                            <button
                              type="button"
                              onClick={handleEditType}
                              className="ml-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTypeId(null)
                                setEditingTypeName('')
                              }}
                              className="ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm text-gray-700 dark:text-gray-200">{type.name}</span>
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTypeId(type.id || null)
                                  setEditingTypeName(type.name)
                                }}
                                className="mr-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => type.id && handleDeleteType(type.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="">Select a type</option>
                  {productTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name.charAt(0).toUpperCase() + type.name.slice(1)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Raw Material Selection Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Product *
              </label>
              <div className="mt-1 relative">
                <div className="flex gap-4">
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search raw materials..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 pl-10 pr-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <select
                    name="raw_material_id"
                    value={formData.raw_material_id}
                    onChange={handleChange}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  >
                    <option value="">Select a product</option>
                    {filteredRawMaterials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name} ({material.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {formData.product_name && (
                <div className="mt-2 text-sm text-indigo-600 dark:text-indigo-400">
                  Selected: {formData.product_name}
                </div>
              )}
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
                {suppliers.map((supplier) => (
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

            {/* Batch Number Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Batch Number *
              </label>
              <input
                type="text"
                name="batch_number"
                value={formData.batch_number}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            {/* Best Before Date Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Best Before Date *
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

            {/* Package Size Field - now in kg */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Package Size (kg) *
              </label>
              <input
                type="number"
                name="package_size"
                value={formData.package_size}
                onChange={handleChange}
                min="0.001"
                step="0.001"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Enter package size in kilograms (e.g., 0.5 for 500g)</p>
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

          {/* Calculated Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Received (kg)
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 shadow-sm sm:text-sm text-gray-700 dark:text-gray-300">
                {totalKg.toFixed(3)} kg
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Price per kg (£)
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 shadow-sm sm:text-sm text-gray-700 dark:text-gray-300">
                £{pricePerKg.toFixed(2)}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Total Purchase Cost (£)
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 shadow-sm sm:text-sm text-gray-700 dark:text-gray-300">
                £{totalCost.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Quality Checks */}
          <div className="space-y-4 pt-4 mt-2 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">Quality Checks</h4>
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
                <p className="text-gray-500 dark:text-gray-400">Check if there's visible damage to the packaging or product</p>
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
                  className="font-medium text-gray-700 dark:text-gray-300"
                >
                  Labelling matches specifications
                </label>
                <p className="text-gray-500 dark:text-gray-400">Confirm the product labelling is accurate and complete</p>
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
                <p className="text-gray-500 dark:text-gray-400">Uncheck if the product doesn't meet quality standards and will be returned</p>
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

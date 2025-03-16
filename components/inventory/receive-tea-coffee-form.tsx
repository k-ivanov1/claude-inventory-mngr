'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, Plus, AlertTriangle, CheckCircle } from 'lucide-react'
import { TeaCoffeeStock } from '@/lib/types/stock'

interface RawMaterial {
  id: string
  name: string
  unit: string
  category: string
}

interface ReceiveTeaCoffeeFormProps {
  onClose: () => void
  onSuccess?: () => void
  editItem?: TeaCoffeeStock
}

export function ReceiveTeaCoffeeForm({ onClose, onSuccess, editItem }: ReceiveTeaCoffeeFormProps) {
  // State
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [userOrganizationId, setUserOrganizationId] = useState<string | null>(null)

  // State for approved suppliers
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])

  // Form data with type hardcoded; batch_number, best_before_date and package_size are optional.
  // Note: package_size is now in KG.
  const [formData, setFormData] = useState<TeaCoffeeStock & { selectedRawMaterialId: string, selectedSupplierId: string }>({
    date: new Date().toISOString().split('T')[0],
    product_name: '',
    type: 'tea', // Hardcoded value; this is required in the DB
    supplier: '',
    invoice_number: '',
    batch_number: '',
    best_before_date: '',
    quantity: 0,
    price_per_unit: 0,
    package_size: 0, // Now in KG
    is_damaged: false,
    is_accepted: true,
    checked_by: '',
    labelling_matches_specifications: true,
    selectedRawMaterialId: '', // Added for UUID reference
    selectedSupplierId: '' // Added for UUID reference
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchData()
    getUserOrganization()
  }, [])

  useEffect(() => {
    if (editItem) {
      setFormData({
        ...editItem,
        labelling_matches_specifications: editItem.labelling_matches_specifications ?? true,
        selectedRawMaterialId: '', // Will be set separately
        selectedSupplierId: '' // Will be set separately
      })

      // Try to find the raw material ID for this product name
      const matchingMaterial = rawMaterials.find(m => m.name === editItem.product_name)
      if (matchingMaterial) {
        setFormData(prev => ({
          ...prev,
          selectedRawMaterialId: matchingMaterial.id
        }))
      }

      // Try to find the supplier ID for this supplier name
      const matchingSupplier = suppliers.find(s => s.name === editItem.supplier)
      if (matchingSupplier) {
        setFormData(prev => ({
          ...prev,
          selectedSupplierId: matchingSupplier.id
        }))
      }
    }
  }, [editItem, rawMaterials, suppliers])

  const getUserOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        console.log("Current user:", user);
        
        // Check if we can get organization from user metadata
        if (user.app_metadata && user.app_metadata.organization_id) {
          setUserOrganizationId(user.app_metadata.organization_id);
          return;
        }
        
        // Try to get from user table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single();
          
        if (!userError && userData && userData.organization_id) {
          setUserOrganizationId(userData.organization_id);
          return;
        }
        
        // Fallback to user ID as organization ID if nothing else works
        setUserOrganizationId(user.id);
      }
    } catch (error) {
      console.error('Error getting user organization:', error);
      // Don't set organization ID to null - this will cause RLS issues
      // Instead, set a debugging value that will be obvious if it shows up in your DB
      setUserOrganizationId('fallback-org-id');
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchRawMaterials(),
        fetchSuppliers()
      ])
    } catch (err) {
      console.error('Error fetching data:', err)
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
    } catch (err: any) {
      console.error('Error fetching raw materials:', err)
      throw err
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
      throw err
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    
    if (name === 'selectedRawMaterialId') {
      // When raw material changes, update both the ID and the product name
      const selectedMaterial = rawMaterials.find(m => m.id === value)
      setFormData({ 
        ...formData, 
        selectedRawMaterialId: value,
        product_name: selectedMaterial ? selectedMaterial.name : ''
      })
    } else if (name === 'selectedSupplierId') {
      // When supplier changes, update both the ID and the supplier name
      const selectedSupplier = suppliers.find(s => s.id === value)
      setFormData({ 
        ...formData, 
        selectedSupplierId: value,
        supplier: selectedSupplier ? selectedSupplier.name : ''
      })
    } else if (type === 'checkbox') {
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

  // Calculated fields (package_size is in KG)
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
      // Basic validations
      if (!formData.selectedRawMaterialId) throw new Error('Please select a product.')
      if (!formData.selectedSupplierId) throw new Error('Please select a supplier.')
      if (!formData.invoice_number) throw new Error('Invoice number is required.')
      if (formData.quantity <= 0) throw new Error('Quantity must be greater than zero.')
      
      // Format date for Supabase
      const formattedDate = formData.date ? new Date(formData.date).toISOString().split('T')[0] : null
      const formattedBestBefore = formData.best_before_date ? new Date(formData.best_before_date).toISOString().split('T')[0] : null
      
      // Prepare data for stock_receiving table - omitting organization_id initially
      const stockData = {
        date: formattedDate,
        item_type: formData.type || 'tea',
        item_id: formData.selectedRawMaterialId,
        supplier_id: formData.selectedSupplierId,
        batch_number: formData.batch_number || null,
        quantity: formData.quantity,
        unit_price: formData.price_per_unit,
        total_cost: totalCost,
        invoice_number: formData.invoice_number,
        best_before_date: formattedBestBefore,
        is_accepted: formData.is_accepted,
        notes: formData.labelling_matches_specifications ? "Labelling matches specifications" : "Labelling issues noted",
        checked_by: formData.checked_by
      }
      
      // Log what we're about to insert for debugging
      console.log("Inserting stock data:", stockData);
      
      // For backward compatibility, also update the stock_tea_coffee table if it exists
      const teaCoffeeData = {
        date: formattedDate,
        product_name: formData.product_name,
        type: formData.type || 'tea',
        supplier: formData.supplier,
        invoice_number: formData.invoice_number,
        batch_number: formData.batch_number || null,
        best_before_date: formattedBestBefore,
        quantity: formData.quantity,
        price_per_unit: formData.price_per_unit,
        package_size: formData.package_size || null,
        is_damaged: formData.is_damaged,
        is_accepted: formData.is_accepted,
        checked_by: formData.checked_by,
        total_kg: totalKg,
        price_per_kg: pricePerKg,
        total_cost: totalCost
      }
      
      let stockReceivingResult;
      let stockTeaCoffeeResult;
      
      if (editItem?.id) {
        // Get the old quantity before updating
        const { data: oldStockData } = await supabase
          .from('stock_receiving')
          .select('quantity')
          .eq('id', editItem.id)
          .single()
        
        // Update the stock records
        stockReceivingResult = await supabase
          .from('stock_receiving')
          .update(stockData)
          .eq('id', editItem.id)
          .select()
        
        // Also try to update tea/coffee table for backward compatibility
        try {
          stockTeaCoffeeResult = await supabase
            .from('stock_tea_coffee')
            .update(teaCoffeeData)
            .eq('id', editItem.id)
        } catch (error) {
          console.error('Error updating stock_tea_coffee (may be expected if table doesn\'t exist):', error)
        }
        
        if (stockReceivingResult.error) throw stockReceivingResult.error
        
        // Calculate the difference in quantity for inventory adjustment
        const oldQuantity = oldStockData?.quantity || 0
        const quantityDifference = formData.quantity - oldQuantity
        
        // Only update inventory if the difference isn't zero and the item is accepted
        if (quantityDifference !== 0 && formData.is_accepted) {
          await updateInventory(formData, quantityDifference)
        }
        
        // Try to update the organization ID separately
        if (stockReceivingResult.data && stockReceivingResult.data[0] && userOrganizationId) {
          try {
            await supabase
              .from('stock_receiving')
              .update({ organization_id: userOrganizationId })
              .eq('id', stockReceivingResult.data[0].id);
          } catch (orgError) {
            console.error("Error updating organization ID:", orgError);
            // Non-critical error, continue
          }
        }
        
      } else {
        // Insert new stock record
        stockReceivingResult = await supabase
          .from('stock_receiving')
          .insert(stockData)
          .select()
        
        if (stockReceivingResult.error) {
          console.error('Error in stock_receiving insert:', stockReceivingResult.error);
          throw stockReceivingResult.error;
        }
        
        // Try to update the organization ID separately
        if (stockReceivingResult.data && stockReceivingResult.data[0] && userOrganizationId) {
          try {
            await supabase
              .from('stock_receiving')
              .update({ organization_id: userOrganizationId })
              .eq('id', stockReceivingResult.data[0].id);
          } catch (orgError) {
            console.error("Error updating organization ID:", orgError);
            // Non-critical error, continue
          }
        }
        
        // Also try to insert into tea/coffee table for backward compatibility
        try {
          stockTeaCoffeeResult = await supabase
            .from('stock_tea_coffee')
            .insert(teaCoffeeData)
        } catch (error) {
          console.error('Error inserting stock_tea_coffee (may be expected if table doesn\'t exist):', error)
        }
        
        // Only update inventory if the item is accepted
        if (formData.is_accepted) {
          await updateInventory(formData)
        }
      }
      
      setSuccess('Stock received successfully')
      setTimeout(() => {
        if (onSuccess) onSuccess()
        onClose()
      }, 1500)
    } catch (err: any) {
      console.error('Error saving stock:', err)
      setError(err.message || 'Failed to save stock. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const updateInventory = async (stockItem: TeaCoffeeStock & { selectedRawMaterialId: string }, quantityDifference?: number) => {
    try {
      const quantityToAdd = quantityDifference !== undefined ? quantityDifference : stockItem.quantity;
      
      // Skip inventory update if quantity is zero
      if (quantityToAdd === 0) return;
      
      // First, check if this product exists in inventory
      const { data: existingInventory, error: inventoryQueryError } = await supabase
        .from('inventory')
        .select('*')
        .eq('product_name', stockItem.product_name)
        .maybeSingle()
      
      if (inventoryQueryError) throw inventoryQueryError
      
      // Get the raw material record to ensure we have the correct unit
      const { data: rawMaterialData, error: rawMaterialError } = await supabase
        .from('raw_materials')
        .select('unit, category')
        .eq('id', stockItem.selectedRawMaterialId)
        .maybeSingle()
      
      if (rawMaterialError) throw rawMaterialError
      
      // Determine the unit to use - prioritize raw material unit, fallback to kg
      const unit = rawMaterialData?.unit || 'kg'
      // Determine the category - prioritize raw material category, fallback to type
      const category = rawMaterialData?.category || stockItem.type
      
      if (existingInventory) {
        // Update existing inventory record
        const { error: updateError } = await supabase
          .from('inventory')
          .update({
            stock_level: existingInventory.stock_level + quantityToAdd,
            unit_price: stockItem.price_per_unit, // Update unit price with latest
            last_updated: new Date().toISOString()
          })
          .eq('id', existingInventory.id)
        
        if (updateError) throw updateError
        
        // Also create an inventory movement record
        await createInventoryMovement(
          existingInventory.id, 
          stockItem.product_name, 
          'receive', 
          quantityToAdd, 
          stockItem.id || '',
          stockItem.checked_by
        )
      } else {
        // Create new inventory record
        const prefix = (category || 'mat').substring(0, 3).toUpperCase()
        const timestamp = Date.now().toString().substring(9, 13)
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
        const sku = `${prefix}-${timestamp}${random}`
        
        const { data: newInventory, error: insertError } = await supabase
          .from('inventory')
          .insert({
            product_name: stockItem.product_name,
            sku: sku,
            category: category,
            stock_level: quantityToAdd,
            unit: unit,
            unit_price: stockItem.price_per_unit,
            reorder_point: 5, // Default value
            is_recipe_based: false,
            is_final_product: false,
            last_updated: new Date().toISOString()
          })
          .select()
        
        if (insertError) throw insertError
        
        // Create inventory movement record for new inventory
        if (newInventory && newInventory.length > 0) {
          await createInventoryMovement(
            newInventory[0].id, 
            stockItem.product_name, 
            'receive', 
            quantityToAdd, 
            stockItem.id || '',
            stockItem.checked_by
          )
        }
      }
    } catch (err) {
      console.error('Error updating inventory:', err)
      throw new Error('Failed to update inventory')
    }
  }
  
  // Function to create inventory movement record
  const createInventoryMovement = async (
    inventoryId: string, 
    productName: string, 
    movementType: string, 
    quantity: number, 
    referenceId: string,
    createdBy: string
  ) => {
    try {
      await supabase
        .from('inventory_movements')
        .insert({
          inventory_id: inventoryId,
          movement_type: movementType,
          quantity: quantity,
          reference_id: referenceId,
          reference_type: 'stock_receipt',
          notes: `Stock receipt for ${productName}`,
          created_by: createdBy
        })
    } catch (error) {
      console.error('Error creating inventory movement:', error)
      // We'll just log this error but not throw, as it's not critical to the main operation
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
              <button onClick={() => setError(null)} className="ml-4 text-red-700 dark:text-red-200">
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
            {/* (Type field removed from UI; value remains in formData and will default to "tea") */}

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
                    name="selectedRawMaterialId"
                    value={formData.selectedRawMaterialId}
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
                name="selectedSupplierId"
                value={formData.selectedSupplierId}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              >
                <option value="">Select a supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
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

            {/* Batch Number Field (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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

            {/* Best Before Date Field (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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

            {/* Package Size Field (in KG; optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Package Size (KG)
              </label>
              <input
                type="number"
                name="package_size"
                value={formData.package_size}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Enter package size in KG</p>
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
                Price per KG (£)
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 shadow-sm sm:text-sm text-gray-700 dark:text-gray-300">
                {formData.package_size > 0 ? `£${pricePerKg.toFixed(2)}` : 'N/A'}
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
                <label htmlFor="labelling_matches_specifications" className="font-medium text-gray-700 dark:text-gray-300">
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

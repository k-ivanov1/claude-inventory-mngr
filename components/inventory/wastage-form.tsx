'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X } from 'lucide-react'

// Inventory item interface
interface InventoryItem {
  id: string
  product_name: string
  category: string
  stock_level: number
  unit: string
}

// Wastage interface
interface Wastage {
  id?: string
  date: string
  product_id: string
  product_name?: string
  category?: string
  quantity: number
  unit?: string
  reason: string
  recorded_by: string
  notes?: string
  created_at?: string
}

interface WastageFormProps {
  item?: Wastage | null
  onClose: () => void
  onSuccess: () => void
}

export function WastageForm({ item, onClose, onSuccess }: WastageFormProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<Wastage>({
    date: new Date().toISOString().split('T')[0],
    product_id: '',
    quantity: 1,
    reason: '',
    recorded_by: '',
    notes: ''
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchInventoryItems()
    
    if (item) {
      setFormData({
        ...item,
        date: item.date || new Date().toISOString().split('T')[0],
        notes: item.notes || ''
      })
    }
  }, [item])

  const fetchInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, product_name, category, stock_level, unit')
        .order('product_name')
      
      if (error) throw error
      
      setInventoryItems(data || [])
    } catch (error: any) {
      console.error('Error fetching inventory items:', error)
      setError('Failed to load inventory items. Please try again.')
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    
    if (type === 'number') {
      setFormData({ ...formData, [name]: parseFloat(value) || 0 })
    } else {
      setFormData({ ...formData, [name]: value })
    }
    
    // When product_id changes, update the selected item
    if (name === 'product_id') {
      const selected = inventoryItems.find(item => item.id === value) || null
      setSelectedItem(selected)
    }
  }

  const validateForm = (): boolean => {
    // Reset error
    setError(null)
    
    // Required fields
    if (!formData.product_id) {
      setError('Please select a product')
      return false
    }
    
    if (!formData.reason) {
      setError('Please provide a reason for wastage')
      return false
    }
    
    if (!formData.recorded_by) {
      setError('Please provide who recorded this wastage')
      return false
    }
    
    // Validate quantity
    if (formData.quantity <= 0) {
      setError('Quantity must be greater than zero')
      return false
    }
    
    // Check if we have enough stock
    if (selectedItem && formData.quantity > selectedItem.stock_level) {
      setError(`Not enough stock available. Current stock: ${selectedItem.stock_level} ${selectedItem.unit}`)
      return false
    }
    
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    try {
      // 1. Add wastage record
      const wastageData = {
        date: formData.date,
        product_id: formData.product_id,
        quantity: formData.quantity,
        reason: formData.reason,
        recorded_by: formData.recorded_by,
        notes: formData.notes || null
      }
      
      const { error: wastageError } = await supabase
        .from('wastage')
        .insert(wastageData)
      
      if (wastageError) throw wastageError
      
      // 2. Update inventory stock level (reduce by wastage quantity)
      const { error: inventoryError } = await supabase
        .from('inventory')
        .update({
          stock_level: selectedItem!.stock_level - formData.quantity
        })
        .eq('id', formData.product_id)
      
      if (inventoryError) throw inventoryError
      
      // Success
      onSuccess()
    } catch (error: any) {
      console.error('Error recording wastage:', error)
      setError(error.message || 'Failed to record wastage. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <title>Close</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.03a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
              </svg>
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Record Wastage
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border dark:border-gray-600 border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Product
            </label>
            <select
              name="product_id"
              value={formData.product_id}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border dark:border-gray-600 border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="">Select a product</option>
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.product_name} - {item.stock_level} {item.unit} available
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Quantity
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="1"
                step="1"
                className="block w-full flex-1 rounded-l-md border dark:border-gray-600 border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outlinetype="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="1"
                step="1"
                className="block w-full flex-1 rounded-l-md border dark:border-gray-600 border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
              <span className="inline-flex items-center rounded-r-md border border-l-0 dark:border-gray-600 border-gray-300 bg-gray-50 dark:bg-gray-600 px-3 py-2 text-gray-500 dark:text-gray-300 sm:text-sm">
                {selectedItem?.unit || 'units'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Reason
            </label>
            <select
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border dark:border-gray-600 border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="">Select a reason</option>
              <option value="Expired">Expired</option>
              <option value="Damaged">Damaged</option>
              <option value="Quality issue">Quality issue</option>
              <option value="Spillage">Spillage</option>
              <option value="Production loss">Production loss</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Recorded By
            </label>
            <input
              type="text"
              name="recorded_by"
              value={formData.recorded_by}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border dark:border-gray-600 border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="mt-1 block w-full rounded-md border dark:border-gray-600 border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex justify-end gap-x-3 pt-4">
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
              {loading ? 'Recording...' : 'Record Wastage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  AlertTriangle
} from 'lucide-react'

// Inventory item interface
interface InventoryItem {
  id: string
  item_type: 'raw_material' | 'final_product'
  item_id: string
  name: string
  category: string
  sku?: string
  current_stock: number
  unit: string
  unit_price: number
  reorder_point: number
  last_updated?: string
}

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showManualAdjustment, setShowManualAdjustment] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchInventoryItems()
  }, [])

  // Filter items whenever search term or items change
  useEffect(() => {
    const term = searchTerm.toLowerCase()
    const filtered = inventoryItems.filter(item => 
      item.name.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term) ||
      item.sku?.toLowerCase().includes(term)
    )
    setFilteredItems(filtered)
  }, [searchTerm, inventoryItems])

  const fetchInventoryItems = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch inventory with full details for raw materials and final products
      const { data, error } = await supabase
        .rpc('get_inventory_with_details')
      
      if (error) throw error
      
      setInventoryItems(data || [])
    } catch (error: any) {
      console.error('Error fetching inventory:', error)
      setError(error.message || 'Failed to load inventory. Please check your connection or permissions.')
    } finally {
      setLoading(false)
    }
  }

  const handleManualAdjustment = async (quantity: number, reason: string) => {
    if (!selectedItem) return

    try {
      const { error } = await supabase
        .rpc('manual_inventory_adjustment', {
          p_item_type: selectedItem.item_type,
          p_item_id: selectedItem.item_id,
          p_quantity_change: quantity,
          p_reason: reason
        })
      
      if (error) throw error

      // Refresh inventory
      fetchInventoryItems()
      
      // Close modal
      setShowManualAdjustment(false)
      setSelectedItem(null)
    } catch (error: any) {
      console.error('Error adjusting inventory:', error)
      setError(error.message || 'Failed to adjust inventory. Please try again.')
    }
  }

  // Total inventory value calculation
  const totalInventoryValue = filteredItems.reduce(
    (total, item) => total + (item.current_stock * item.unit_price), 
    0
  )

  return (
    <div className="space-y-8">
      {/* Error Notification */}
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory Management</h2>
          <p className="text-gray-600">Track stock levels for raw materials and final products</p>
        </div>
        <div className="flex items-center gap-x-4">
          <div className="text-sm font-medium text-gray-700">
            Total Inventory Value: 
            <span className="ml-2 text-indigo-600">
              £{totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name, category, or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {/* Inventory Table */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Level
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reorder Point
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-4 text-center text-sm text-gray-500">
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.category}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.sku || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.item_type === 'raw_material' ? 'Raw Material' : 'Final Product'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                        item.current_stock <= item.reorder_point
                          ? 'bg-red-50 text-red-700'
                          : item.current_stock <= item.reorder_point * 1.5
                          ? 'bg-yellow-50 text-yellow-700'
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {item.current_stock} {item.unit}
                        {item.current_stock <= item.reorder_point && (
                          <AlertTriangle className="ml-1 h-3 w-3" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.unit}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      £{item.unit_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.reorder_point}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.last_updated 
                        ? new Date(item.last_updated).toLocaleDateString() 
                        : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedItem(item)
                          setShowManualAdjustment(true)
                        }}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Adjustment Modal */}
      {showManualAdjustment && selectedItem && (
        <ManualAdjustmentModal
          item={selectedItem}
          onClose={() => {
            setShowManualAdjustment(false)
            setSelectedItem(null)
          }}
          onSubmit={handleManualAdjustment}
        />
      )}
    </div>
  )
}

// Manual Adjustment Modal Component
interface ManualAdjustmentModalProps {
  item: InventoryItem
  onClose: () => void
  onSubmit: (quantity: number, reason: string) => void
}

function ManualAdjustmentModal({ 
  item, 
  onClose, 
  onSubmit 
}: ManualAdjustmentModalProps) {
  const [quantity, setQuantity] = useState(0)
  const [reason, setReason] = useState('')
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate input
    if (quantity <= 0) {
      alert('Quantity must be a positive number')
      return
    }

    if (!reason.trim()) {
      alert('Please provide a reason for the adjustment')
      return
    }

    // Submit with correct sign based on adjustment type
    const finalQuantity = adjustmentType === 'add' ? quantity : -quantity
    onSubmit(finalQuantity, reason)
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-4">
          Manual Inventory Adjustment
        </h3>

        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700">Current Item</h4>
          <p className="text-sm text-gray-900">{item.name}</p>
          <p className="text-sm text-gray-500">
            Current Stock: {item.current_stock} {item.unit}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Adjustment Type
            </label>
            <div className="mt-1 flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  id="add-adjustment"
                  name="adjustment-type"
                  type="radio"
                  value="add"
                  checked={adjustmentType === 'add'}
                  onChange={() => setAdjustmentType('add')}
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label 
                  htmlFor="add-adjustment" 
                  className="ml-2 block text-sm text-gray-700"
                >
                  Add Stock
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="remove-adjustment"
                  name="adjustment-type"
                  type="radio"
                  value="remove"
                  checked={adjustmentType === 'remove'}
                  onChange={() => setAdjustmentType('remove')}
                  className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label 
                  htmlFor="remove-adjustment" 
                  className="ml-2 block text-sm text-gray-700"
                >
                  Remove Stock
                </label>
              </div>
            </div>
          </div>

          <div>
            <label 
              htmlFor="quantity" 
              className="block text-sm font-medium text-gray-700"
            >
              Quantity
            </label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label 
              htmlFor="reason" 
              className="block text-sm font-medium text-gray-700"
            >
              Reason for Adjustment
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              placeholder="Explain the reason for this inventory adjustment"
              required
            />
          </div>

          <div className="flex justify-end gap-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              {adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InventoryPage

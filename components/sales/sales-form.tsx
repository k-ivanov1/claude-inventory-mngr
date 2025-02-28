'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { X, Plus, Trash2, RefreshCw } from 'lucide-react'
import { SalesOrder, SalesItem, DeliveryMethod } from '@/lib/types/product-sales'

interface SalesFormProps {
  onClose: () => void
  onSuccess?: () => void
  editSale?: SalesOrder
}

export function SalesForm({ onClose, onSuccess, editSale }: SalesFormProps) {
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([])
  const [newDeliveryMethod, setNewDeliveryMethod] = useState('')
  const [showAddDeliveryMethod, setShowAddDeliveryMethod] = useState(false)
  const [generatingOrderNumber, setGeneratingOrderNumber] = useState(false)
  const supabase = createClientComponentClient()
  
  const [formData, setFormData] = useState<SalesOrder>({
    date: new Date().toISOString().split('T')[0],
    order_number: '',
    customer_name: '',
    batch_number: '',
    best_before_date: '',
    production_date: '',
    delivery_method: 'DPD',
    labelling_matches_specs: true,
    checked_by: '',
    status: 'pending',
    items: []
  })

  // Calculate total amount
  const totalAmount = formData.items.reduce((sum, item) => {
    const itemTotal = (item.quantity || 0) * (item.price_per_unit || 0)
    return sum + itemTotal
  }, 0)

  useEffect(() => {
    if (editSale) {
      setFormData(editSale)
    } else {
      generateOrderNumber()
    }
    
    fetchProducts()
    fetchDeliveryMethods()
  }, [editSale])

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('product_recipes')
        .select('*')
        .order('name')
      
      if (error) throw error
      
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      alert('Failed to load products. Please try again.')
    }
  }

  const fetchDeliveryMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_methods')
        .select('*')
        .order('name')
      
      if (error) throw error
      
      setDeliveryMethods(data || [])
    } catch (error) {
      console.error('Error fetching delivery methods:', error)
      // Default delivery methods if fetch fails
      setDeliveryMethods([
        { name: 'DPD' },
        { name: 'Evri' },
        { name: 'Yodel' }
      ])
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checkboxInput = e.target as HTMLInputElement
      setFormData({ ...formData, [name]: checkboxInput.checked })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 1, price_per_unit: 0 }]
    })
  }

  const handleRemoveItem = (index: number) => {
    const newItems = [...formData.items]
    newItems.splice(index, 1)
    setFormData({ ...formData, items: newItems })
  }

  const handleItemChange = (index: number, field: keyof SalesItem, value: any) => {
    const newItems = [...formData.items]
    
    if (field === 'product_id') {
      const selectedProduct = products.find(product => product.id === value)
      newItems[index] = {
        ...newItems[index],
        product_id: value,
        product_name: selectedProduct?.name,
        price_per_unit: selectedProduct?.price || 0
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value }
    }
    
    // Calculate total price for this item
    if (field === 'quantity' || field === 'price_per_unit' || field === 'product_id') {
      const quantity = field === 'quantity' ? value : newItems[index].quantity
      const price = field === 'price_per_unit' ? value : newItems[index].price_per_unit
      newItems[index].total_price = quantity * price
    }
    
    setFormData({ ...formData, items: newItems })
  }

  const handleAddDeliveryMethod = async () => {
    if (!newDeliveryMethod.trim()) return
    
    try {
      // Save to database
      const { data, error } = await supabase
        .from('delivery_methods')
        .insert({ name: newDeliveryMethod })
        .select()
      
      if (error) throw error
      
      // Update local state
      if (data) {
        setDeliveryMethods([...deliveryMethods, data[0]])
      }
      setNewDeliveryMethod('')
      setShowAddDeliveryMethod(false)
    } catch (error) {
      console.error('Error adding delivery method:', error)
      alert('Failed to add delivery method. Please try again.')
    }
  }

  const handleRemoveDeliveryMethod = async (id: string) => {
    if (confirm(`Are you sure you want to remove this delivery method?`)) {
      try {
        // Remove from database
        const { error } = await supabase
          .from('delivery_methods')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        // Update local state
        setDeliveryMethods(deliveryMethods.filter(method => method.id !== id))
        
        // If current form method is being removed, update to first available
        const deletedMethod = deliveryMethods.find(method => method.id === id)
        if (formData.delivery_method === deletedMethod?.name && deliveryMethods.length > 0) {
          const newMethods = deliveryMethods.filter(method => method.id !== id)
          setFormData({ ...formData, delivery_method: newMethods[0]?.name || 'DPD' })
        }
      } catch (error) {
        console.error('Error removing delivery method:', error)
        alert('Failed to remove delivery method. Please try again.')
      }
    }
  }

  const generateOrderNumber = () => {
    setGeneratingOrderNumber(true)
    
    // Create order number based on date and random number
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const randomNum = Math.floor(Math.random() * 9000) + 1000
    
    const orderNumber = `ORD-${dateStr}-${randomNum}`
    setFormData({ ...formData, order_number: orderNumber })
    
    setGeneratingOrderNumber(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // If no order number, generate one
      if (!formData.order_number) {
        generateOrderNumber()
      }
      
      // Add the calculated total amount
      const dataToSubmit = {
        ...formData,
        total_amount: totalAmount
      }
      
      let saleId

      if (editSale?.id) {
        // Update existing sale
        const { data, error } = await supabase
          .from('sales_orders')
          .update({
            date: dataToSubmit.date,
            order_number: dataToSubmit.order_number,
            customer_name: dataToSubmit.customer_name,
            batch_number: dataToSubmit.batch_number,
            best_before_date: dataToSubmit.best_before_date,
            production_date: dataToSubmit.production_date,
            delivery_method: dataToSubmit.delivery_method,
            labelling_matches_specs: dataToSubmit.labelling_matches_specs,
            checked_by: dataToSubmit.checked_by,
            total_amount: dataToSubmit.total_amount,
            status: dataToSubmit.status
          })
          .eq('id', editSale.id)
          .select()
        
        if (error) throw error
        
        saleId = editSale.id
        
        // Delete existing sales items
        const { error: deleteError } = await supabase
          .from('sales_items')
          .delete()
          .eq('sale_id', saleId)
        
        if (deleteError) throw deleteError
      } else {
        // Insert new sale
        const { data, error } = await supabase
          .from('sales_orders')
          .insert({
            date: dataToSubmit.date,
            order_number: dataToSubmit.order_number,
            customer_name: dataToSubmit.customer_name,
            batch_number: dataToSubmit.batch_number,
            best_before_date: dataToSubmit.best_before_date,
            production_date: dataToSubmit.production_date,
            delivery_method: dataToSubmit.delivery_method,
            labelling_matches_specs: dataToSubmit.labelling_matches_specs,
            checked_by: dataToSubmit.checked_by,
            total_amount: dataToSubmit.total_amount,
            status: dataToSubmit.status
          })
          .select()
        
        if (error) throw error
        
        saleId = data[0].id
      }

      // Insert sales items
      if (dataToSubmit.items.length > 0) {
        const salesItems = dataToSubmit.items.map(item => ({
          sale_id: saleId,
          product_id: item.product_id,
          quantity: item.quantity,
          price_per_unit: item.price_per_unit,
          total_price: item.quantity * item.price_per_unit
        }))
        
        const { error: itemsError } = await supabase
          .from('sales_items')
          .insert(salesItems)
        
        if (itemsError) throw itemsError
      }

      if (onSuccess) {
        onSuccess()
      }
      onClose()
    } catch (error) {
      console.error('Error saving sale:', error)
      alert('Failed to save sale. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">
            {editSale ? 'Edit Sale' : 'Create New Sale'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Details Section */}
          <div>
            <h4 className="text-base font-medium text-gray-900 mb-4">Order Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Order Number
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    name="order_number"
                    value={formData.order_number}
                    onChange={handleChange}
                    className="block w-full flex-1 rounded-none rounded-l-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={generateOrderNumber}
                    className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 py-2 text-gray-500 sm:text-sm"
                  >
                    <RefreshCw className={`h-4 w-4 ${generatingOrderNumber ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Customer Name
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>

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

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Delivery Method
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddDeliveryMethod(true)}
                    className="text-xs text-indigo-600"
                  >
                    Manage Methods
                  </button>
                </div>
                <select
                  name="delivery_method"
                  value={formData.delivery_method}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  required
                >
                  {deliveryMethods.map(method => (
                    <option key={method.id || method.name} value={method.name}>{method.name}</option>
                  ))}
                </select>
                
                {showAddDeliveryMethod && (
                  <div className="mt-2 p-3 border rounded-md bg-gray-50">
                    <h4 className="text-sm font-medium mb-2">Manage Delivery Methods</h4>
                    
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newDeliveryMethod}
                        onChange={(e) => setNewDeliveryMethod(e.target.value)}
                        placeholder="New method name"
                        className="block w-full rounded-md border border-gray-300 px-3 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddDeliveryMethod}
                        className="inline-flex items-center rounded border border-transparent bg-indigo-600 px-2 py-1 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </button>
                    </div>
                    
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {deliveryMethods.map(method => (
                        <div key={method.id || method.name} className="flex justify-between items-center text-sm">
                          <span>{method.name}</span>
                          {method.id && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDeliveryMethod(method.id!)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowAddDeliveryMethod(false)}
                        className="text-xs text-gray-500"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Production Details Section */}
          <div className="pt-4 border-t">
            <h4 className="text-base font-medium text-gray-900 mb-4">Production Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                />
              </div>

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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Production Date
                </label>
                <input
                  type="date"
                  name="production_date"
                  value={formData.production_date}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
              </div>

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
                />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="labelling_matches_specs"
                    name="labelling_matches_specs"
                    type="checkbox"
                    checked={formData.labelling_matches_specs}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="labelling_matches_specs" className="font-medium text-gray-700">
                    Labelling matches specifications
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-medium text-gray-900">Products</h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center rounded border border-transparent bg-indigo-100 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Product
              </button>
            </div>

            {formData.items.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-md">
                No products added yet. Add products to this sale.
              </div>
            ) : (
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-4 items-end border-b pb-3">
                    <div className="col-span-5">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Product
                      </label>
                      <select
                        value={item.product_id}
                        onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        required
                      >
                        <option value="">Select a product</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.product_type}) - £{product.price?.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Price Per Unit
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price_per_unit}
                        onChange={(e) => handleItemChange(index, 'price_per_unit', parseFloat(e.target.value) || 0)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Total
                      </label>
                      <div className="block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                        £{item.total_price?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Status and Total */}
          <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total Amount
              </label>
              <div className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-right text-lg font-medium text-gray-900">
                £{totalAmount.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-x-3 pt-4 border-t">
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
              {loading ? 'Saving...' : editSale ? 'Update Sale' : 'Create Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

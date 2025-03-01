'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ReceiveTeaCoffeeForm } from '@/components/inventory/receive-tea-coffee-form'
import { ReceiveOtherStockForm } from '@/components/inventory/receive-other-stock-form'
import { TabsRoot as Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TeaCoffeeStock, OtherStock } from '@/lib/types/stock'
import { Search } from 'lucide-react'

export default function ReceiveStockPage() {
  const [activeTab, setActiveTab] = useState('tea-coffee')
  const [showTeaCoffeeForm, setShowTeaCoffeeForm] = useState(false)
  const [showOtherForm, setShowOtherForm] = useState(false)
  const [teaCoffeeStocks, setTeaCoffeeStocks] = useState<TeaCoffeeStock[]>([])
  const [otherStocks, setOtherStocks] = useState<OtherStock[]>([])
  const [editingTeaCoffee, setEditingTeaCoffee] = useState<TeaCoffeeStock | undefined>()
  const [editingOther, setEditingOther] = useState<OtherStock | undefined>()
  const [loading, setLoading] = useState(true)

  const supabase = createClientComponentClient()

  useEffect(() => {
    loadStockData()
  }, [])

  const loadStockData = async () => {
    setLoading(true)
    try {
      // Load tea/coffee stock
      const { data: teaCoffeeData, error: teaCoffeeError } = await supabase
        .from('stock_tea_coffee')
        .select('*')
        .order('date', { ascending: false })
        .limit(50)
      
      if (teaCoffeeError) throw teaCoffeeError
      
      // Load other stock
      const { data: otherData, error: otherError } = await supabase
        .from('stock_other')
        .select('*')
        .order('date', { ascending: false })
        .limit(50)
      
      if (otherError) throw otherError
      
      setTeaCoffeeStocks(teaCoffeeData || [])
      setOtherStocks(otherData || [])
    } catch (error) {
      console.error('Error loading stock data:', error)
      alert('Failed to load stock data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTeaCoffee = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        const { error } = await supabase
          .from('stock_tea_coffee')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        // Reload data
        loadStockData()
      } catch (error) {
        console.error('Error deleting stock:', error)
        alert('Failed to delete stock item. Please try again.')
      }
    }
  }

  const handleDeleteOther = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        const { error } = await supabase
          .from('stock_other')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        // Reload data
        loadStockData()
      } catch (error) {
        console.error('Error deleting stock:', error)
        alert('Failed to delete stock item. Please try again.')
      }
    }
  }

  const handleEditTeaCoffee = (item: TeaCoffeeStock) => {
    setEditingTeaCoffee(item)
    setShowTeaCoffeeForm(true)
  }

  const handleEditOther = (item: OtherStock) => {
    setEditingOther(item)
    setShowOtherForm(true)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Stock Receiving</h2>
          <p className="text-gray-600">Manage incoming stock and inventory</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tea-coffee">Tea & Coffee</TabsTrigger>
          <TabsTrigger value="other">Other Products</TabsTrigger>
        </TabsList>

        <div className="flex justify-end my-4">
          {activeTab === 'tea-coffee' ? (
            <button
              onClick={() => {
                setEditingTeaCoffee(undefined)
                setShowTeaCoffeeForm(true)
              }}
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Add Tea/Coffee Stock
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingOther(undefined)
                setShowOtherForm(true)
              }}
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Add Other Stock
            </button>
          )}
        </div>

        <TabsContent value="tea-coffee">
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best Before</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Kg</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/Unit</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-4 text-center text-sm text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : teaCoffeeStocks.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-4 text-center text-sm text-gray-500">
                        No tea/coffee stock records found.
                      </td>
                    </tr>
                  ) : (
                    teaCoffeeStocks.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{formatDate(item.date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                          <div className="text-sm text-gray-500">{item.type}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.supplier}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.batch_number}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{formatDate(item.best_before_date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.package_size}g</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.total_kg?.toFixed(2)}kg</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">£{item.price_per_unit?.toFixed(2)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">£{item.total_cost?.toFixed(2)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.is_accepted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.is_accepted ? 'Accepted' : 'Rejected'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditTeaCoffee(item)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => item.id && handleDeleteTeaCoffee(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="other">
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price/Unit</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-4 text-center text-sm text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : otherStocks.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-4 text-center text-sm text-gray-500">
                        No other stock records found.
                      </td>
                    </tr>
                  ) : (
                    otherStocks.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{formatDate(item.date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.product_name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.type}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.supplier}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.invoice_number}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">£{item.price_per_unit?.toFixed(2)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">£{item.total_cost?.toFixed(2)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.is_accepted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.is_accepted ? 'Accepted' : 'Rejected'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditOther(item)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => item.id && handleDeleteOther(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Tea/Coffee Form Modal */}
      {showTeaCoffeeForm && (
        <ReceiveTeaCoffeeForm
          onClose={() => {
            setShowTeaCoffeeForm(false)
            setEditingTeaCoffee(undefined)
          }}
          onSuccess={loadStockData}
          editItem={editingTeaCoffee}
        />
      )}

      {/* Other Stock Form Modal */}
      {showOtherForm && (
        <ReceiveOtherStockForm
          onClose={() => {
            setShowOtherForm(false)
            setEditingOther(undefined)
          }}
          onSuccess={loadStockData}
          editItem={editingOther}
        />
      )}
    </div>
  )
}

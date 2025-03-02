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
  const [searchTerm, setSearchTerm] = useState('')

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

  // Filter function for both tea/coffee and other stocks
  const filterStocks = (stocks: any[]) => {
    const term = searchTerm.toLowerCase()
    return stocks.filter(item => 
      item.product_name.toLowerCase().includes(term) ||
      item.supplier.toLowerCase().includes(term) ||
      item.batch_number.toLowerCase().includes(term)
    )
  }

  const filteredTeaCoffeeStocks = filterStocks(teaCoffeeStocks)
  const filteredOtherStocks = filterStocks(otherStocks)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Receiving</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Manage incoming stock and inventory
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          placeholder="Search by product, supplier, or batch number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100"
        />
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
          <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {['Date', 'Product', 'Supplier', 'Batch', 'Best Before', 'Qty', 'Package', 'Total Kg', 'Price/Unit', 'Total Cost', 'Status', 'Actions'].map((header) => (
                      <th 
                        key={header} 
                        scope="col" 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredTeaCoffeeStocks.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No tea/coffee stock records found.
                      </td>
                    </tr>
                  ) : (
                    filteredTeaCoffeeStocks.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(item.date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{item.product_name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{item.type}</div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.supplier}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.batch_number}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(item.best_before_date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.quantity}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.package_size}g</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.total_kg?.toFixed(2)}kg</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">£{item.price_per_unit?.toFixed(2)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">£{item.total_cost?.toFixed(2)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.is_accepted 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          }`}>
                            {item.is_accepted ? 'Accepted' : 'Rejected'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditTeaCoffee(item)}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => item.id && handleDeleteTeaCoffee(item.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
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
          <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {['Date', 'Product', 'Type', 'Supplier', 'Invoice', 'Qty', 'Price/Unit', 'Total Cost', 'Status', 'Actions'].map((header) => (
                      <th 
                        key={header} 
                        scope="col" 
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredOtherStocks.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        No other stock records found.
                      </td>
                    </tr>
                  ) : (
                    filteredOtherStocks.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(item.date)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.product_name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.type}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.supplier}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.invoice_number}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.quantity}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">£{item.price_per_unit?.toFixed(2)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">£{item.total_cost?.toFixed(2)}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            item.is_accepted 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          }`}>
                            {item.is_accepted ? 'Accepted' : 'Rejected'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditOther(item)}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => item.id && handleDeleteOther(item.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
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

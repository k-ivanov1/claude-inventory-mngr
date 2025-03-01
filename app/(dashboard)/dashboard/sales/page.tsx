'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { SalesOrder } from '@/lib/types/product-sales'
import { SalesForm } from '@/components/sales/sales-form'
import { Eye, Download, Plus, Tag, Calendar, Truck } from 'lucide-react'
import Link from 'next/link'

export default function SalesPage() {
  const [sales, setSales] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadSales()
  }, [])

  const loadSales = async () => {
    setLoading(true)
    try {
      // Load sales with their items
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          items:sales_items(
            *,
            product:product_recipes(name, product_type, sku)
          )
        `)
        .order('date', { ascending: false })
      
      if (error) throw error
      
      setSales(data || [])
    } catch (error) {
      console.error('Error loading sales:', error)
      alert('Failed to load sales. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredSales = filterStatus === 'all' 
    ? sales 
    : sales.filter(sale => sale.status === filterStatus)

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
          <h2 className="text-2xl font-bold">Sales Management</h2>
          <p className="text-gray-600">Manage your sales orders and deliveries</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <Plus className="h-5 w-5" />
          New Sale
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-x-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-gray-300 text-sm px-3 py-2"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-sm text-gray-500">
                    No sales found.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{sale.order_number}</div>
                      <div className="inline-flex items-center gap-x-1 mt-1 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
                        <Tag className="h-3 w-3" />
                        {sale.batch_number || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.customer_name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-x-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        <Calendar className="h-3 w-3" />
                        {formatDate(sale.date)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      <ul className="list-disc list-inside">
                        {sale.items?.map((item, index) => (
                          <li key={index} className="truncate max-w-xs">
                            {item.quantity} x {item.product?.name}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      £{sale.total_amount?.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-x-1 rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                        <Truck className="h-3 w-3" />
                        {sale.delivery_method}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${sale.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                          sale.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                          sale.status === 'shipped' ? 'bg-blue-100 text-blue-800' : 
                          sale.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}`}
                      >
                        {sale.status?.charAt(0).toUpperCase() + sale.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <Link
                          href={`/dashboard/sales/${sale.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <SalesForm
          onClose={() => setShowForm(false)}
          onSuccess={loadSales}
        />
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Eye, Download } from 'lucide-react'
import Link from 'next/link'

interface SaleItem {
  id: string
  product_id: string
  quantity: number
  unit_price: number
  product_name: string
}

interface Sale {
  id: string
  order_number: string
  customer_name: string
  total_amount: number
  status: string
  created_at: string
  items: SaleItem[]
}

export function SalesList({ sales }: { sales: Sale[] }) {
  const [filterStatus, setFilterStatus] = useState('all')

  const filteredSales = filterStatus === 'all' 
    ? sales 
    : sales.filter(sale => sale.status === filterStatus)

  return (
    <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
      <div className="px-4 py-5 sm:p-6">
        {/* Filters */}
        <div className="mb-6 flex items-center gap-x-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Sales Table */}
        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Order Details
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Customer
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Amount
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                        <div className="font-medium text-gray-900">{sale.order_number}</div>
                        <div className="text-gray-500">
                          {format(new Date(sale.created_at), 'MMM d, yyyy')}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {sale.customer_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                          sale.status === 'completed'
                            ? 'bg-green-50 text-green-700'
                            : sale.status === 'pending'
                            ? 'bg-yellow-50 text-yellow-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        £{sale.total_amount.toFixed(2)}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                        <div className="flex items-center justify-end gap-x-2">
                          <Link
                            href={`/dashboard/sales/${sale.id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button className="text-gray-600 hover:text-gray-900">
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import InventoryList from './inventory-list'
import RawMaterialsList from './raw-materials-list'
import DateRangeSelector from './date-range-selector'

export default function ProductsInventoryPage() {
  const [activeView, setActiveView] = useState<'inventory' | 'raw-materials'>('inventory')
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)), // Default to last 30 days
    end: new Date()
  })

  const handleDateRangeChange = (newRange: { start: Date; end: Date }) => {
    setDateRange(newRange)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {activeView === 'inventory' ? 'Inventory Management' : 'Raw Materials'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {activeView === 'inventory' 
              ? 'Track and manage your product inventory' 
              : 'Manage raw materials and supplies'}
          </p>
        </div>
        
        <DateRangeSelector 
          dateRange={dateRange} 
          onChange={handleDateRangeChange} 
        />
      </div>

      {/* View Toggle */}
      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveView('inventory')}
          className={`pb-4 px-1 border-b-2 font-medium text-sm ${
            activeView === 'inventory'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          All Inventory
        </button>
        <button
          onClick={() => setActiveView('raw-materials')}
          className={`pb-4 px-1 border-b-2 font-medium text-sm ${
            activeView === 'raw-materials'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          Raw Materials
        </button>
      </div>

      {/* Active View */}
      <div>
        {activeView === 'inventory' ? (
          <InventoryList dateRange={dateRange} />
        ) : (
          <RawMaterialsList dateRange={dateRange} />
        )}
      </div>
    </div>
  )
}

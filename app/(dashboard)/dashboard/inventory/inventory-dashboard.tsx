'use client'

import { useState } from 'react'
import InventoryPage from './inventory-content'
import RawMaterialsView from './raw-materials-view'

export default function InventoryDashboard() {
  const [activeView, setActiveView] = useState<'all' | 'raw'>('all')

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveView('all')}
          className={`pb-4 px-1 border-b-2 font-medium text-sm ${
            activeView === 'all'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          All Inventory
        </button>
        <button
          onClick={() => setActiveView('raw')}
          className={`pb-4 px-1 border-b-2 font-medium text-sm ${
            activeView === 'raw'
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
          }`}
        >
          Raw Materials
        </button>
      </div>

      {/* Active View */}
      <div>
        {activeView === 'all' ? <InventoryPage /> : <RawMaterialsView />}
      </div>
    </div>
  )
}

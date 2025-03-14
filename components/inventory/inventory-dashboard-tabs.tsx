'use client'

import { useState } from 'react'
import { useBatchInventoryIntegration } from '@/lib/hooks/use-batch-inventory-integration'
import { InventoryMovementsComponent } from '@/components/inventory/inventory-movements'
import { BatchTraceabilityComponent } from '@/components/traceability/batch-traceability'

// Tab types
type TabType = 'inventory' | 'movements' | 'traceability'

export default function InventoryDashboardTabs({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>('inventory')
  
  // This hook ensures inventory is updated when batches are created
  useBatchInventoryIntegration()

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'inventory'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'movements'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Inventory Movements
          </button>
          <button
            onClick={() => setActiveTab('traceability')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'traceability'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Batch Traceability
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'inventory' && (
          <div>{children}</div>
        )}
        {activeTab === 'movements' && (
          <InventoryMovementsComponent />
        )}
        {activeTab === 'traceability' && (
          <BatchTraceabilityComponent />
        )}
      </div>
    </div>
  )
}

'use client'

import InventoryPage from './inventory-content'
import InventoryDashboardTabs from '@/components/inventory/inventory-dashboard-tabs'

export default function InventoryPageWrapper() {
  return (
    <InventoryDashboardTabs>
      <InventoryPage />
    </InventoryDashboardTabs>
  )
}

'use client'

import InventoryDashboard from './inventory-dashboard'
import InventoryDashboardTabs from '@/components/inventory/inventory-dashboard-tabs'

export default function InventoryPageWrapper() {
  return (
    <InventoryDashboardTabs>
      <InventoryDashboard />
    </InventoryDashboardTabs>
  )
}

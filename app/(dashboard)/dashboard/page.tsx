import { DashboardHeader } from '@/components/dashboard/header'
import { DashboardCards } from '@/components/dashboard/cards'
import { RecentSales } from '@/components/dashboard/recent-sales'
import { InventoryLevels } from '@/components/dashboard/inventory-levels'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()

  // Fetch dashboard data
  const { data: salesData } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: inventoryData } = await supabase
    .from('inventory')
    .select('*')
    .order('stock_level', { ascending: true })
    .limit(10)

  return (
    <div className="space-y-8">
      <DashboardHeader />
      <DashboardCards />
      
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <RecentSales data={salesData} />
        <InventoryLevels data={inventoryData} />
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { SalesChart } from '@/components/reports/sales-chart'
import { InventoryReport } from '@/components/reports/inventory-report'
import { TopProducts } from '@/components/reports/top-products'

export default async function ReportsPage() {
  const supabase = createClient()

  // Fetch sales data
  const { data: salesData } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: true })

  // Fetch inventory data
  const { data: inventoryData } = await supabase
    .from('inventory')
    .select('*')
    .order('stock_level', { ascending: true })

  // Fetch product sales data
  const { data: productSalesData } = await supabase
    .from('sales_items')
    .select(`
      *,
      product:inventory(product_name)
    `)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Analytics & Reports</h2>
        <p className="text-gray-600">View your business performance metrics</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <SalesChart data={salesData || []} />
        <TopProducts data={productSalesData || []} />
      </div>

      <InventoryReport data={inventoryData || []} />
    </div>
  )
}

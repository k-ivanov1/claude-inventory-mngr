import { createClient } from '@/lib/supabase/server'
import { SalesList } from '@/components/sales/sales-list'
import { NewSaleButton } from '@/components/sales/new-sale-button'

export default async function SalesPage() {
  const supabase = createClient()
  
  const { data: sales } = await supabase
    .from('sales')
    .select(`
      *,
      items:sales_items(*)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sales Management</h2>
          <p className="text-gray-600">View and manage your sales orders</p>
        </div>
        <NewSaleButton />
      </div>

      <SalesList sales={sales || []} />
    </div>
  )
}

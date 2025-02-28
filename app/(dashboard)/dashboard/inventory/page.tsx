import { createClient } from '@/lib/supabase/server'
import { InventoryList } from '@/components/inventory/inventory-list'
import { AddInventoryForm } from '@/components/inventory/add-inventory-form'

export default async function InventoryPage() {
  const supabase = createClient()
  
  const { data: inventory } = await supabase
    .from('inventory')
    .select('*')
    .order('product_name', { ascending: true })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Inventory Management</h2>
        <AddInventoryForm />
      </div>

      <InventoryList inventory={inventory || []} />
    </div>
  )
}

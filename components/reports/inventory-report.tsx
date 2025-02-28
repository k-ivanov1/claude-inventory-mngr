'use client'

interface InventoryItem {
  id: string
  product_name: string
  stock_level: number
  reorder_point: number
  unit_price: number
  category: string
}

export function InventoryReport({ data }: { data: InventoryItem[] }) {
  // Calculate inventory metrics
  const totalItems = data.reduce((sum, item) => sum + item.stock_level, 0)
  const totalValue = data.reduce((sum, item) => sum + (item.stock_level * item.unit_price), 0)
  const lowStockItems = data.filter(item => item.stock_level <= item.reorder_point)

  // Group by category
  const categoryValue = data.reduce((acc, item) => {
    const category = item.category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = 0
    }
    acc[category] += item.stock_level * item.unit_price
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <h4 className="text-sm font-medium text-gray-500">Total Stock Items</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{totalItems}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h4 className="text-sm font-medium text-gray-500">Total Stock Value</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">£{totalValue.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h4 className="text-sm font-medium text-gray-500">Low Stock Items</h4>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{lowStockItems.length}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="rounded-lg bg-white shadow">
        <div className="p-6">
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            Stock Value by Category
          </h3>
          <div className="mt-6">
            <div className="space-y-4">
              {Object.entries(categoryValue).map(([category, value]) => (
                <div key={category} className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{category}</span>
                      <span className="ml-3 text-sm text-gray-500">£{value.toFixed(2)}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {((value / totalValue) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-indigo-600"
                      style={{ width: `${(value / totalValue) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Items Table */}
      {lowStockItems.length > 0 && (
        <div className="rounded-lg bg-white shadow">
          <div className="p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
              Low Stock Items
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Product Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Current Stock
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Reorder Point
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lowStockItems.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                        {item.product_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.stock_level}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.reorder_point}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {item.category || 'Uncategorized'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { format } from 'date-fns'

export function RecentSales({ data }: { data: any[] }) {
  return (
    <div className="rounded-lg bg-white shadow">
      <div className="p-6">
        <h3 className="text-base font-semibold leading-6 text-gray-900">
          Recent Sales
        </h3>
        <div className="mt-6 flow-root">
          <div className="-my-5 divide-y divide-gray-200">
            {data?.map((sale) => (
              <div key={sale.id} className="py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Order #{sale.order_number}
                    </p>
                    <p className="text-sm text-gray-500">{sale.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      £{sale.total_amount}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(sale.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    {sale.items?.map((item: any) => item.product_name).join(', ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

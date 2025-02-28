'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ProductSale {
  product: {
    product_name: string
  }
  quantity: number
  unit_price: number
}

export function TopProducts({ data }: { data: ProductSale[] }) {
  const chartData = useMemo(() => {
    // Group sales by product and calculate total revenue
    const productSales = data.reduce((acc, sale) => {
      const productName = sale.product.product_name
      if (!acc[productName]) {
        acc[productName] = {
          name: productName,
          quantity: 0,
          revenue: 0
        }
      }
      acc[productName].quantity += sale.quantity
      acc[productName].revenue += sale.quantity * sale.unit_price
      return acc
    }, {} as Record<string, { name: string; quantity: number; revenue: number }>)

    // Convert to array and sort by revenue
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10) // Top 10 products
  }, [data])

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
        Top 10 Products by Revenue
      </h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{
              top: 5,
              right: 30,
              left: 100,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(value) => `£${value}`} />
            <YAxis 
              type="category" 
              dataKey="name"
              width={90}
              tickFormatter={(value) => 
                value.length > 15 ? `${value.substring(0, 15)}...` : value
              }
            />
            <Tooltip
              formatter={(value: number) => [`£${value.toFixed(2)}`, 'Revenue']}
            />
            <Bar dataKey="revenue" fill="#4f46e5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

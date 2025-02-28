'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, parseISO, subDays } from 'date-fns'

interface Sale {
  created_at: string
  total_amount: number
}

export function SalesChart({ data }: { data: Sale[] }) {
  const chartData = useMemo(() => {
    const today = new Date()
    const dates = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(today, 29 - i)
      return format(date, 'yyyy-MM-dd')
    })

    // Group sales by date
    const salesByDate = data.reduce((acc, sale) => {
      const date = format(parseISO(sale.created_at), 'yyyy-MM-dd')
      acc[date] = (acc[date] || 0) + sale.total_amount
      return acc
    }, {} as Record<string, number>)

    // Create chart data with all dates
    return dates.map(date => ({
      date,
      amount: salesByDate[date] || 0
    }))
  }, [data])

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
        Sales Trend (Last 30 Days)
      </h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 5,
              right: 10,
              left: 10,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(date) => format(parseISO(date), 'MMM d')}
            />
            <YAxis
              tickFormatter={(value) => `£${value}`}
            />
            <Tooltip
              labelFormatter={(date) => format(parseISO(date as string), 'MMM d, yyyy')}
              formatter={(value: number) => [`£${value.toFixed(2)}`, 'Sales']}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

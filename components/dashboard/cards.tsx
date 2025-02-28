'use client'

import {
  TrendingUp,
  Users,
  Package,
  AlertTriangle
} from 'lucide-react'

const stats = [
  {
    name: 'Total Revenue',
    value: '£12,345',
    change: '+12.3%',
    changeType: 'positive',
    icon: TrendingUp,
  },
  {
    name: 'Active Customers',
    value: '2,342',
    change: '+3.2%',
    changeType: 'positive',
    icon: Users,
  },
  {
    name: 'Products in Stock',
    value: '432',
    change: '-2.1%',
    changeType: 'negative',
    icon: Package,
  },
  {
    name: 'Low Stock Alerts',
    value: '5',
    change: '+2',
    changeType: 'negative',
    icon: AlertTriangle,
  },
]

export function DashboardCards() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6"
        >
          <dt>
            <div className="absolute rounded-md bg-indigo-500 p-3">
              <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-500">
              {stat.name}
            </p>
          </dt>
          <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
            <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            <p
              className={`ml-2 flex items-baseline text-sm font-semibold ${
                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {stat.change}
            </p>
          </dd>
        </div>
      ))}
    </div>
  )
}

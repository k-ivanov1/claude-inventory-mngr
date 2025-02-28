'use client'

import { useState } from 'react'

export function NotificationSettings() {
  const [settings, setSettings] = useState({
    email: {
      lowStock: true,
      sales: true,
      reports: false,
    },
    push: {
      lowStock: true,
      sales: false,
      reports: false,
    },
  })

  const handleChange = (type: 'email' | 'push', setting: string, value: boolean) => {
    setSettings({
      ...settings,
      [type]: {
        ...settings[type],
        [setting]: value,
      },
    })
  }

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Notification Settings</h3>
        <div className="mt-6 space-y-6">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
            <div className="mt-4 space-y-4">
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="email-low-stock"
                    name="email-low-stock"
                    type="checkbox"
                    checked={settings.email.lowStock}
                    onChange={(e) => handleChange('email', 'lowStock', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="email-low-stock" className="font-medium text-gray-700">
                    Low Stock Alerts
                  </label>
                  <p className="text-gray-500">Get notified when items are running low.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="email-sales"
                    name="email-sales"
                    type="checkbox"
                    checked={settings.email.sales}
                    onChange={(e) => handleChange('email', 'sales', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="email-sales" className="font-medium text-gray-700">
                    Sales Notifications
                  </label>
                  <p className="text-gray-500">Get notified when a new sale is made.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="email-reports"
                    name="email-reports"
                    type="checkbox"
                    checked={settings.email.reports}
                    onChange={(e) => handleChange('email', 'reports', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="email-reports" className="font-medium text-gray-700">
                    Weekly Reports
                  </label>
                  <p className="text-gray-500">Receive weekly sales and inventory reports.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
            <div className="mt-4 space-y-4">
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="push-low-stock"
                    name="push-low-stock"
                    type="checkbox"
                    checked={settings.push.lowStock}
                    onChange={(e) => handleChange('push', 'lowStock', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="push-low-stock" className="font-medium text-gray-700">
                    Low Stock Alerts
                  </label>
                  <p className="text-gray-500">Get push notifications when items are running low.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="push-sales"
                    name="push-sales"
                    type="checkbox"
                    checked={settings.push.sales}
                    onChange={(e) => handleChange('push', 'sales', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="push-sales" className="font-medium text-gray-700">
                    Sales Notifications
                  </label>
                  <p className="text-gray-500">Get push notifications for new sales.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex h-5 items-center">
                  <input
                    id="push-reports"
                    name="push-reports"
                    type="checkbox"
                    checked={settings.push.reports}
                    onChange={(e) => handleChange('push', 'reports', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="push-reports" className="font-medium text-gray-700">
                    Reports Ready
                  </label>
                  <p className="text-gray-500">Get notified when new reports are available.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )

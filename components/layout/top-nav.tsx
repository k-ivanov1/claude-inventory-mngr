'use client'

import { User } from '@supabase/supabase-js'
import { Bell, Menu } from 'lucide-react'

export function TopNav({ user }: { user: User }) {
  return (
    <div className="sticky top-0 z-40 border-b bg-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-x-4">
          <button type="button" className="lg:hidden -m-2.5 p-2.5 text-gray-700">
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <div className="flex items-center gap-x-4">
          <button type="button" className="-m-2.5 p-2.5 text-gray-500 hover:text-gray-900">
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" />
          </button>

          {/* Profile dropdown */}
          <div className="relative">
            <div className="flex items-center gap-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600">
                    {user.email?.[0].toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-700">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

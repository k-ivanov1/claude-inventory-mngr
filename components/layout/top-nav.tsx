'use client'

import { User } from '@supabase/supabase-js'
import { Bell, Menu, ChevronRight, Sun, Moon } from 'lucide-react'
import { useSidebar } from '@/contexts/sidebar-context'
import { useTheme } from '@/contexts/theme-context'

export function TopNav({ user }: { user: User }) {
  const { toggle, isOpen } = useSidebar()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="sticky top-0 z-40 border-b bg-white dark:bg-gray-800 dark:border-gray-700">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-x-4">
          <button 
            type="button" 
            className="lg:hidden -m-2.5 p-2.5 text-gray-700 dark:text-gray-300"
            onClick={toggle}
          >
            <span className="sr-only">
              {isOpen ? 'Close sidebar' : 'Open sidebar'}
            </span>
            {isOpen ? (
              <ChevronRight className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
        <div className="flex items-center gap-x-4">
          {/* Theme toggle button */}
          <button 
            onClick={toggleTheme} 
            type="button" 
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
          
          {/* Notification button */}
          <button 
            type="button" 
            className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <span className="sr-only">View notifications</span>
            <Bell className="h-5 w-5" />
          </button>

          {/* Profile dropdown */}
          <div className="relative">
            <div className="flex items-center gap-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {user.email?.[0].toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="text-sm hidden sm:block">
                <p className="font-medium text-gray-700 dark:text-gray-300">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/theme-context'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div
      className="relative flex items-center bg-gray-300 dark:bg-gray-600 rounded-full w-24 h-10 p-1 cursor-pointer select-none"
      onClick={toggleTheme}
    >
      <div
        className={`absolute bg-white rounded-full w-8 h-8 transition-transform duration-300 ${
          theme === 'light' ? 'translate-x-1' : 'translate-x-14'
        }`}
      ></div>
      <div className="flex flex-1 justify-around items-center relative z-10">
        <div className={`flex items-center gap-1 text-xs ${theme === 'light' ? 'text-gray-900' : 'text-gray-500'}`}>
          <Sun className="h-4 w-4" />
          <span>Light</span>
        </div>
        <div className={`flex items-center gap-1 text-xs ${theme === 'dark' ? 'text-gray-900' : 'text-gray-500'}`}>
          <Moon className="h-4 w-4" />
          <span>Dark</span>
        </div>
      </div>
    </div>
  )
}

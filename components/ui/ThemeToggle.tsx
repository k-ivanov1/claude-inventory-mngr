'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/theme-context'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div
      className="relative flex items-center bg-gray-300 dark:bg-gray-600 rounded-full w-28 h-12 p-1 cursor-pointer select-none"
      onClick={toggleTheme}
    >
      <div
        className={`absolute bg-white rounded-full w-10 h-10 transition-transform duration-300 ${
          theme === 'dark' ? 'translate-x-[16px]' : 'translate-x-0'
        }`}
      />
      <div className="flex flex-1 justify-around items-center relative z-10">
        <Sun className={`h-6 w-6 ${theme === 'light' ? 'text-gray-900' : 'text-gray-500'}`} />
        <Moon className={`h-6 w-6 ${theme === 'dark' ? 'text-gray-900' : 'text-gray-500'}`} />
      </div>
    </div>
  )
}

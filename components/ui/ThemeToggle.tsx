'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/theme-context'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle Theme"
      className="relative flex items-center w-32 h-10 bg-gray-200 dark:bg-gray-800 rounded-full p-1 focus:outline-none shadow-md transition-colors duration-500"
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-r from-indigo-500 to-purple-500 opacity-30" />

      {/* Slider circle */}
      <div
        className="absolute top-1/2 transform -translate-y-1/2 h-6 w-6 bg-white dark:bg-gray-900 rounded-full shadow-md transition-all duration-300"
        style={{ left: theme === 'light' ? '0.25rem' : '6.25rem' }}
      />

      {/* Icons */}
      <div className="relative z-10 flex w-full items-center justify-between px-2">
        <Sun
          className={`h-5 w-5 transition-colors duration-300 ${
            theme === 'light' ? 'text-yellow-500' : 'text-gray-400'
          }`}
        />
        <Moon
          className={`h-5 w-5 transition-colors duration-300 ${
            theme === 'dark' ? 'text-indigo-500' : 'text-gray-400'
          }`}
        />
      </div>
    </button>
  )
}

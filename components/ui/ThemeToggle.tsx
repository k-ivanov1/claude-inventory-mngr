'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/contexts/theme-context'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle Theme"
      className="relative flex items-center w-40 h-12 bg-gray-200 dark:bg-gray-800 rounded-full p-1 focus:outline-none shadow-xl transition-colors duration-500"
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-r from-indigo-500 to-purple-500 opacity-30" />
      
      {/* Content container */}
      <div className="flex items-center justify-between w-full relative z-10 px-3">
        {/* Sun Icon */}
        <Sun
          className={`h-6 w-6 transition-colors duration-300 ${
            theme === 'light' ? 'text-yellow-500' : 'text-gray-400'
          }`}
        />
        {/* Slider container */}
        <div className="relative flex-1 mx-3">
          <div
            className={`absolute h-8 w-8 bg-white dark:bg-gray-900 rounded-full shadow-lg transform transition-transform duration-300 ${
              theme === 'light' ? 'translate-x-0' : 'translate-x-32'
            }`}
          />
        </div>
        {/* Moon Icon */}
        <Moon
          className={`h-6 w-6 transition-colors duration-300 ${
            theme === 'dark' ? 'text-indigo-500' : 'text-gray-400'
          }`}
        />
      </div>
    </button>
  )
}

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextProps {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  
  useEffect(() => {
    // Check for stored preference or system preference
    const storedTheme = localStorage.getItem('theme') as Theme | null
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    
    if (storedTheme) {
      setTheme(storedTheme)
    } else if (systemPrefersDark) {
      setTheme('dark')
    }
  }, [])
  
  useEffect(() => {
    // Apply theme to document and update background color
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.body.style.backgroundColor = 'rgb(17, 24, 39)' // dark mode background (e.g., bg-gray-900)
    } else {
      document.documentElement.classList.remove('dark')
      document.body.style.backgroundColor = 'rgb(249, 250, 251)' // light mode background (e.g., bg-gray-50)
    }
    
    // Store user preference
    localStorage.setItem('theme', theme)
  }, [theme])
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

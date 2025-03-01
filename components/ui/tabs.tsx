'use client'

import React, { useState, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

type TabsContextType = {
  activeValue: string
  setActiveValue: (value: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

export const TabsRoot = ({ 
  value, 
  onValueChange, 
  children, 
  className = '' 
}: { 
  value: string 
  onValueChange: (value: string) => void 
  children: React.ReactNode 
  className?: string 
}) => {
  const [activeValue, setActiveValue] = useState(value)
  
  React.useEffect(() => {
    setActiveValue(value)
  }, [value])
  
  const handleSetActiveValue = (newValue: string) => {
    setActiveValue(newValue)
    onValueChange(newValue)
  }
  
  return (
    <TabsContext.Provider value={{ activeValue, setActiveValue: handleSetActiveValue }}>
      <div className={`${className}`} data-state={activeValue}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 ${className}`}>
      {children}
    </div>
  )
}

export function TabsTrigger({ 
  value, 
  children, 
  className = '' 
}: { 
  value: string
  children: React.ReactNode
  className?: string 
}) {
  const context = useContext(TabsContext)
  
  if (!context) {
    throw new Error("TabsTrigger must be used within a Tabs component")
  }
  
  const { activeValue, setActiveValue } = context
  const isActive = activeValue === value
  
  return (
    <button
      type="button"
      role="tab"
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive 
          ? "bg-white text-gray-950 shadow-sm" 
          : "text-gray-500 hover:text-gray-900",
        className
      )}
      onClick={() => setActiveValue(value)}
      data-state={isActive ? "active" : "inactive"}
    >
      {children}
    </button>
  )
}

export function TabsContent({ 
  value, 
  children, 
  className = '' 
}: { 
  value: string
  children: React.ReactNode
  className?: string 
}) {
  const context = useContext(TabsContext)
  
  if (!context) {
    throw new Error("TabsContent must be used within a Tabs component")
  }
  
  const { activeValue } = context
  const isActive = activeValue === value
  
  if (!isActive) return null
  
  return (
    <div
      role="tabpanel"
      className={cn(
        "mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2",
        className
      )}
      data-state={isActive ? "active" : "inactive"}
    >
      {children}
    </div>
  )
}

export const Tabs = TabsRoot

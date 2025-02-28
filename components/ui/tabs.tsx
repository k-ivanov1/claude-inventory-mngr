"use client"

import React from "react"

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({ 
  value, 
  onValueChange, 
  children, 
  className = "" 
}) => {
  return (
    <div className={`tabs ${className}`} data-state={value}>
      {children}
    </div>
  )
}

export const TabsList: React.FC<TabsListProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 ${className}`}>
      {children}
    </div>
  )
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ 
  value, 
  children, 
  className = "" 
}) => {
  const context = React.useContext(TabsContext)
  
  if (!context) {
    throw new Error("TabsTrigger must be used within a Tabs component")
  }
  
  const { activeValue, setActiveValue } = context
  const isActive = activeValue === value
  
  return (
    <button
      type="button"
      role="tab"
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive 
          ? "bg-white text-gray-950 shadow-sm" 
          : "text-gray-500 hover:text-gray-900"
      } ${className}`}
      onClick={() => setActiveValue(value)}
      data-state={isActive ? "active" : "inactive"}
    >
      {children}
    </button>
  )
}

export const TabsContent: React.FC<TabsContentProps> = ({ 
  value, 
  children, 
  className = "" 
}) => {
  const context = React.useContext(TabsContext)
  
  if (!context) {
    throw new Error("TabsContent must be used within a Tabs component")
  }
  
  const { activeValue } = context
  const isActive = activeValue === value
  
  if (!isActive) return null
  
  return (
    <div
      role="tabpanel"
      className={`mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${className}`}
      data-state={isActive ? "active" : "inactive"}
    >
      {children}
    </div>
  )
}

// Create a context for the tabs component
interface TabsContextType {
  activeValue: string
  setActiveValue: (value: string) => void
}

const TabsContext = React.createContext<TabsContextType | null>(null)

// Update the Tabs component to provide the context
export const TabsRoot: React.FC<TabsProps> = ({
  value,
  onValueChange,
  children,
  className = "",
}) => {
  const [activeValue, setActiveValue] = React.useState(value)
  
  React.useEffect(() => {
    setActiveValue(value)
  }, [value])
  
  const handleSetActiveValue = (newValue: string) => {
    setActiveValue(newValue)
    onValueChange(newValue)
  }
  
  return (
    <TabsContext.Provider value={{ activeValue, setActiveValue: handleSetActiveValue }}>
      <div className={`tabs ${className}`} data-state={activeValue}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

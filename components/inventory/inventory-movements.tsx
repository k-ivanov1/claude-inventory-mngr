'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Search, Calendar, ArrowUp, ArrowDown, Filter, ChevronDown } from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'

interface InventoryMovement {
  id: string
  inventory_id: string
  product_name: string
  category: string
  movement_type: string
  quantity: number
  reference_id?: string
  reference_type?: string
  notes?: string
  created_by?: string
  created_at: string
  unit?: string
}

export function InventoryMovementsComponent() {
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [filteredMovements, setFilteredMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: subDays(new Date(), 30).toISOString().split('T')[0], // Last 30 days
    to: new Date().toISOString().split('T')[0] // Today
  })
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])

  const supabase = createClientComponentClient()

  // Movement types with nice display names and colors
  const movementTypeInfo: Record<string, { label: string, color: string, bgColor: string, darkBgColor: string }> = {
    'receive': { 
      label: 'Received', 
      color: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-50',
      darkBgColor: 'dark:bg-green-900/30'
    },
    'manufacturing_consume': { 
      label: 'Manufacturing (Used)', 
      color: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-50',
      darkBgColor: 'dark:bg-amber-900/30'
    },
    'manufacturing_produce': { 
      label: 'Manufacturing (Produced)', 
      color: 'text-blue-700 dark:text-blue-400',
      bgColor: 'bg-blue-50',
      darkBgColor: 'dark:bg-blue-900/30'
    },
    'manual_adjustment': { 
      label: 'Manual Adjustment', 
      color: 'text-purple-700 dark:text-purple-400',
      bgColor: 'bg-purple-50',
      darkBgColor: 'dark:bg-purple-900/30'
    },
    'wastage': { 
      label: 'Wastage', 
      color: 'text-red-700 dark:text-red-400',
      bgColor: 'bg-red-50',
      darkBgColor: 'dark:bg-red-900/30'
    },
    'sale': { 
      label: 'Sale', 
      color: 'text-indigo-700 dark:text-indigo-400',
      bgColor: 'bg-indigo-50',
      darkBgColor: 'dark:bg-indigo-900/30'
    }
  }

  useEffect(() => {
    fetchMovements()
  }, [dateRange])

  useEffect(() => {
    let result = movements

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(movement => 
        movement.product_name?.toLowerCase().includes(term) ||
        movement.notes?.toLowerCase().includes(term) ||
        movement.created_by?.toLowerCase().includes(term)
      )
    }

    // Apply movement type filter
    if (selectedTypes.length > 0) {
      result = result.filter(movement => selectedTypes.includes(movement.movement_type))
    }

    setFilteredMovements(result)
  }, [searchTerm, movements, selectedTypes])

  const fetchMovements = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch inventory movements with product details
      const { data, error } = await supabase
        .from('inventory_movements')
        .select(`
          *,
          inventory:inventory_id (
            product_name,
            category,
            unit
          )
        `)
        .gte('created_at', `${dateRange.from}T00:00:00`)
        .lte('created_at', `${dateRange.to}T23:59:59`)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Format the data for display
      const formattedMovements = (data || []).map(movement => ({
        ...movement,
        product_name: movement.inventory?.product_name || 'Unknown Product',
        category: movement.inventory?.category || 'Unknown',
        unit: movement.inventory?.unit || 'piece'
      }))

      setMovements(formattedMovements)
      setFilteredMovements(formattedMovements)
    } catch (error: any) {
      console.error('Error fetching inventory movements:', error)
      setError(error.message || 'Failed to load inventory movements')
    } finally {
      setLoading(false)
    }
  }

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy HH:mm')
    } catch (e) {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Inventory Movements</h2>
        <button
          onClick={fetchMovements}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search by product, notes, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          <span className="text-gray-500 dark:text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
            className="rounded-md border border-gray-300 dark:border-gray-600 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Movement Type Filter */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTypeFilter(!showTypeFilter)}
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Filter className="h-4 w-4 mr-2" />
            Movement Types
            <ChevronDown className="h-4 w-4 ml-2" />
          </button>
          {showTypeFilter && (
            <div className="absolute right-0 z-10 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1" role="menu" aria-orientation="vertical">
                {Object.entries(movementTypeInfo).map(([type, info]) => (
                  <div key={type} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      id={`type-${type}`}
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleTypeFilter(type)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
                    />
                    <label htmlFor={`type-${type}`} className={`ml-2 block text-sm ${info.color}`}>
                      {info.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Movements List */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded" role="alert">
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="px-4 py-5 sm:p-6 text-center">
            <div className="animate-pulse text-gray-600 dark:text-gray-400">Loading inventory movements...</div>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="px-4 py-5 sm:p-6 text-center text-gray-500 dark:text-gray-400">
            No inventory movements found for the selected criteria.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredMovements.map((movement) => {
              const typeInfo = movementTypeInfo[movement.movement_type] || { 
                label: movement.movement_type, 
                color: 'text-gray-700 dark:text-gray-300',
                bgColor: 'bg-gray-50',
                darkBgColor: 'dark:bg-gray-700'
              };
              
              return (
                <li key={movement.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{movement.product_name}</div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.bgColor} ${typeInfo.darkBgColor} ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className={`inline-flex items-center ${movement.quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {movement.quantity > 0 ? (
                          <ArrowUp className="mr-1 h-4 w-4" />
                        ) : (
                          <ArrowDown className="mr-1 h-4 w-4" />
                        )}
                        <span className="font-medium">{Math.abs(movement.quantity)}</span>
                        <span className="ml-1">{movement.unit}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        {movement.notes && (
                          <span className="truncate">{movement.notes}</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                      <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                      <span>{formatDate(movement.created_at)}</span>
                      {movement.created_by && (
                        <span className="ml-2 text-xs">by {movement.created_by}</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

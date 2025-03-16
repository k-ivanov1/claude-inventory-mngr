'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Edit2, 
  Trash2, 
  Search, 
  AlertTriangle, 
  Plus, 
  ArrowUpDown,
  Filter,
  ChevronDown,
  ShoppingBag,
  Package,
  Boxes
} from 'lucide-react'

// Inventory item interface
interface InventoryItem {
  id: string
  product_name: string
  sku: string
  category: string
  stock_level: number
  unit: string
  unit_price: number
  reorder_point: number
  supplier?: string
  supplier_name?: string
  last_updated?: string
  is_recipe_based?: boolean
  is_final_product?: boolean
}

// Unit conversion interface
interface UnitConversion {
  id: string
  material_id: string
  base_unit: string
  conversion_unit: string
  conversion_rate: number
}

interface InventoryListProps {
  dateRange: {
    start: Date
    end: Date
  }
}

export default function InventoryList({ dateRange }: InventoryListProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<keyof InventoryItem>('product_name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [unitConversions, setUnitConversions] = useState<Record<string, UnitConversion>>({})
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const [selectedItemType, setSelectedItemType] = useState<string>('all')

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchInventoryItems()
    fetchCategories()
    fetchSuppliers()
    fetchUnitConversions()
  }, [dateRange])

  useEffect(() => {
    filterInventory()
  }, [searchTerm, inventory, selectedCategories, sortField, sortDirection, selectedItemType])

  const fetchInventoryItems = async () => {
    setLoading(true)
    setError(null)
    try {
      // Convert dates to ISO strings for the database query
      const startDate = dateRange.start.toISOString()
      const endDate = dateRange.end.toISOString()

      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .gte('last_updated', startDate)
        .lte('last_updated', endDate)
        .order('product_name', { ascending: true })

      if (error) throw error

      // Fetch supplier names
      const itemsWithSupplierNames = await Promise.all((data || []).map(async (item) => {
        if (item.supplier) {
          const { data: supplierData } = await supabase
            .from('suppliers')
            .select('name')
            .eq('id', item.supplier)
            .single()

          if (supplierData) {
            return {
              ...item,
              supplier_name: supplierData.name
            }
          }
        }
        return item
      }))

      setInventory(itemsWithSupplierNames)
      filterInventory(itemsWithSupplierNames)
    } catch (error: any) {
      console.error('Error fetching inventory:', error)
      setError('Failed to load inventory. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('category')
        .not('category', 'is', null)
      
      if (error) throw error
      
      const uniqueCategories = Array.from(new Set(data?.map(item => item.category) || []))
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name')
      
      if (error) throw error
      setSuppliers(data || [])
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  // Fetch unit conversions to display alternative units
  const fetchUnitConversions = async () => {
    try {
      const { data, error } = await supabase
        .from('material_unit_conversions')
        .select('*')
      
      if (error) throw error
      
      // Create a lookup object by material_id
      const conversionsMap: Record<string, UnitConversion> = {}
      if (data) {
        for (const conversion of data) {
          conversionsMap[conversion.material_id] = conversion
        }
      }
      
      setUnitConversions(conversionsMap)
    } catch (error) {
      console.error('Error fetching unit conversions:', error)
    }
  }

  const filterInventory = (items = inventory) => {
    let result = [...items]
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(item => 
        item.product_name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        (item.supplier_name && item.supplier_name.toLowerCase().includes(term)) ||
        (item.supplier && item.supplier.toLowerCase().includes(term)) ||
        item.category.toLowerCase().includes(term)
      )
    }
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      result = result.filter(item => selectedCategories.includes(item.category))
    }
    
    // Apply item type filter
    if (selectedItemType !== 'all') {
      if (selectedItemType === 'raw') {
        result = result.filter(item => !item.is_recipe_based && !item.is_final_product)
      } else if (selectedItemType === 'recipe') {
        result = result.filter(item => item.is_recipe_based && !item.is_final_product)
      } else if (selectedItemType === 'final') {
        result = result.filter(item => item.is_final_product)
      }
    }
    
    // Apply sorting
    result.sort((a, b) => {
      const valueA = a[sortField]
      const valueB = b[sortField]
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc'
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA)
      }
      
      // For numerical values
      return sortDirection === 'asc'
        ? (valueA as number) - (valueB as number)
        : (valueB as number) - (valueA as number)
    })
    
    setFilteredInventory(result)
  }

  const toggleSort = (field: keyof InventoryItem) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const toggleCategoryFilter = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleDeleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      try {
        const { error } = await supabase
          .from('inventory')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        fetchInventoryItems()
      } catch (error: any) {
        console.error('Error deleting inventory item:', error)
        setError('Failed to delete inventory item. Please try again.')
      }
    }
  }

  // Function to display alternative unit for an item if available
  const getAltUnitDisplay = (item: InventoryItem) => {
    // Check if we have a unit conversion for this item's material ID
    // For now, we'll look up by product name since we don't have direct material_id in inventory
    const conversion = Object.values(unitConversions).find(conv => {
      // This is a simplification - in a real app, you'd have a more reliable way to match
      return convMatchesMaterial(conv, item.product_name)
    })
    
    if (conversion) {
      // Calculate and display the alternate unit
      const altUnitValue = item.stock_level * conversion.conversion_rate
      return `(${altUnitValue.toFixed(2)} ${conversion.conversion_unit})`
    }
    
    return null
  }
  
  // Helper function to match conversion to a material - would be better with direct IDs
  const convMatchesMaterial = (conversion: UnitConversion, productName: string) => {
    // For now, let's just match by checking if product name includes conversion material_id
    // This is a hack - ideally you'd have proper ID matching
    return conversion.material_id.includes(productName) || productName.includes(conversion.material_id)
  }

  // Calculate inventory metrics
  const totalItems = filteredInventory.length
  const totalValue = filteredInventory.reduce(
    (sum, item) => sum + (item.stock_level * item.unit_price), 0
  )
  const lowStockItems = filteredInventory.filter(
    item => item.stock_level <= item.reorder_point
  ).length
  const finalProducts = filteredInventory.filter(
    item => item.is_final_product
  ).length

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.03a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <Boxes className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Items
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      {totalItems}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Low Stock Items
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-red-600 dark:text-red-400">
                      {lowStockItems}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Final Products
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      {finalProducts}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <ShoppingBag className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Value
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      £{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        
        {/* Category Filter */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Filter className="h-4 w-4 mr-2" />
            Categories
            <ChevronDown className="h-4 w-4 ml-2" />
          </button>
          
          {showCategoryFilter && (
            <div className="absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1" role="menu" aria-orientation="vertical">
                {categories.map((category) => (
                  <div key={category} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      id={`category-${category}`}
                      checked={selectedCategories.includes(category)}
                      onChange={() => toggleCategoryFilter(category)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
                    />
                    <label htmlFor={`category-${category}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Item Type Filter */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTypeFilter(!showTypeFilter)}
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Filter className="h-4 w-4 mr-2" />
            Item Type
            <ChevronDown className="h-4 w-4 ml-2" />
          </button>
          
          {showTypeFilter && (
            <div className="absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1" role="menu" aria-orientation="vertical">
                <div className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    id="type-all"
                    name="item-type"
                    checked={selectedItemType === 'all'}
                    onChange={() => setSelectedItemType('all')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mr-2"
                  />
                  <label htmlFor="type-all" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    All Items
                  </label>
                </div>
                <div className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    id="type-raw"
                    name="item-type"
                    checked={selectedItemType === 'raw'}
                    onChange={() => setSelectedItemType('raw')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mr-2"
                  />
                  <label htmlFor="type-raw" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Raw Materials
                  </label>
                </div>
                <div className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    id="type-recipe"
                    name="item-type"
                    checked={selectedItemType === 'recipe'}
                    onChange={() => setSelectedItemType('recipe')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mr-2"
                  />
                  <label htmlFor="type-recipe" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Recipe Based Items
                  </label>
                </div>
                <div className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    id="type-final"
                    name="item-type"
                    checked={selectedItemType === 'final'}
                    onChange={() => setSelectedItemType('final')}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 mr-2"
                  />
                  <label htmlFor="type-final" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Final Products
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Add Item Button */}
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th 
                  onClick={() => toggleSort('product_name')}
                  className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    Product Name
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('sku')}
                  className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    SKU
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('category')}
                  className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    Category
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('stock_level')}
                  className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    Stock Level
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('unit_price')}
                  className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    Unit Price
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th 
                  onClick={() => toggleSort('supplier')}
                  className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    Supplier
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading inventory...
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {item.product_name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.sku}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.category}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                        item.stock_level <= item.reorder_point
                          ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : item.stock_level <= item.reorder_point * 1.5
                          ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      }`}>
                        {item.stock_level} {item.unit}
                        {getAltUnitDisplay(item) && (
                          <span className="ml-1 text-gray-500 dark:text-gray-400">
                            {getAltUnitDisplay(item)}
                          </span>
                        )}
                        {item.stock_level <= item.reorder_point && (
                          <AlertTriangle className="ml-1 h-3 w-3" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      £{item.unit_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.is_final_product
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                          : item.is_recipe_based
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {item.is_final_product 
                          ? 'Final Product' 
                          : item.is_recipe_based 
                            ? 'Recipe Based' 
                            : 'Raw Material'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.supplier_name || item.supplier || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            /* Edit action */
                          }}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Form Modal would go here */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add New Inventory Item</h3>
            {/* Form would go here */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddForm(false)}
                className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

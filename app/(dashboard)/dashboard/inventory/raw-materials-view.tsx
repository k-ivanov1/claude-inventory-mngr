'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Plus, Edit2, Trash2, Search, AlertTriangle, ArrowUpDown } from 'lucide-react'

// Raw Material interface with enhanced fields for the view
interface RawMaterial {
  id: string
  product_name: string
  sku: string
  category: string
  stock_level: number
  unit: string
  unit_price: number
  reorder_point: number
  supplier: string
  supplier_name?: string // Joined field for display
  last_updated?: string
  is_recipe_based?: boolean
  is_final_product?: boolean
  average_cost?: number // Added for cost tracking
  manufactured_quantity?: number // Added to show how much was manufactured
}

export default function RawMaterialsView() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [filteredMaterials, setFilteredMaterials] = useState<RawMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string>('product_name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchRawMaterials()
  }, [])

  useEffect(() => {
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const filtered = rawMaterials.filter(material => 
        material.product_name.toLowerCase().includes(term) ||
        material.category.toLowerCase().includes(term) ||
        (material.supplier && material.supplier.toLowerCase().includes(term))
      )
      setFilteredMaterials(filtered)
    } else {
     setFilteredMaterials(rawMaterials)
    }
  }, [searchTerm, rawMaterials])

  // Function to sort materials
  const sortMaterials = (field: string) => {
    let newDirection: 'asc' | 'desc' = 'asc'
    
    if (field === sortField) {
      // Toggle direction if same field
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    }
    
    // Sort the materials
    const sorted = [...filteredMaterials].sort((a, b) => {
      let valueA = a[field as keyof RawMaterial];
      let valueB = b[field as keyof RawMaterial];
      
      // Handle string comparison
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return newDirection === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      
      // Handle number comparison
      if (valueA === null || valueA === undefined) valueA = 0;
      if (valueB === null || valueB === undefined) valueB = 0;
      
      return newDirection === 'asc'
        ? Number(valueA) - Number(valueB)
        : Number(valueB) - Number(valueA);
    });
    
    setFilteredMaterials(sorted);
    setSortField(field);
    setSortDirection(newDirection);
  };

  const fetchRawMaterials = async () => {
    setLoading(true)
    setError(null)
    try {
      // First, fetch inventory items
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('product_name', { ascending: true })
      
      if (error) throw error

      // Get supplier information
      const enhancedMaterials = await Promise.all((data || []).map(async (material) => {
        // Get information based on whether it's a raw material or final product
        if (material.is_final_product) {
          // For final products, fetch manufacturing data to show how much was manufactured
          const { data: batchData } = await supabase
            .from('batch_manufacturing_records')
            .select('bags_count, batch_size')
            .eq('product_id', material.id)
          
          let manufacturedQuantity = 0
          if (batchData && batchData.length > 0) {
            // Sum all bags produced across all batches
            manufacturedQuantity = batchData.reduce((sum, batch) => sum + (batch.bags_count || 0), 0)
          }
          
          return {
            ...material,
            manufactured_quantity: manufacturedQuantity
          }
        } else {
          // For raw materials
          if (material.supplier) {
            // Try to get supplier name from suppliers table
            const { data: supplierData } = await supabase
              .from('suppliers')
              .select('name')
              .eq('id', material.supplier)
              .single()

            if (supplierData) {
              return {
                ...material,
                supplier_name: supplierData.name
              }
            }
          }

          // Get average cost from stock entries if available
          const { data: stockData } = await supabase
            .from('stock_tea_coffee')
            .select('price_per_unit')
            .eq('product_name', material.product_name)
            .eq('is_accepted', true)

          let averageCost = material.unit_price
          if (stockData && stockData.length > 0) {
            const totalCost = stockData.reduce((sum, entry) => 
              sum + (entry.price_per_unit || 0), 0
            )
            averageCost = totalCost / stockData.length
          }

          return {
            ...material,
            average_cost: averageCost
          }
        }
      }))

      setRawMaterials(enhancedMaterials)
      setFilteredMaterials(enhancedMaterials)
    } catch (error: any) {
      console.error('Error fetching raw materials:', error)
      setError('Failed to load raw materials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-8">
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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h2>
          <p className="text-gray-600 dark:text-gray-300">Track and manage your inventory</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Items</dt>
                <dd className="flex items-baseline">
                  <span className="text-2xl font-semibold text-gray-900 dark:text-white">{filteredMaterials.length}</span>
                </dd>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Low Stock Items</dt>
                <dd className="flex items-baseline">
                  <span className="text-2xl font-semibold text-red-600 dark:text-red-400">{filteredMaterials.filter(item => item.stock_level <= item.reorder_point).length}</span>
                </dd>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Value</dt>
                <dd className="flex items-baseline">
                  <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                    £{filteredMaterials.reduce((sum, item) => sum + (item.stock_level * item.unit_price), 0).toFixed(2)}
                  </span>
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          placeholder="Search by name, category, or supplier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th 
                  onClick={() => sortMaterials('product_name')}
                  className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    Product Name
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  SKU
                </th>
                <th 
                  onClick={() => sortMaterials('category')}
                  className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    Category
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  onClick={() => sortMaterials('stock_level')}
                  className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    Stock Level
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  onClick={() => sortMaterials('is_final_product')}
                  className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    Type
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  onClick={() => sortMaterials('unit_price')}
                  className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    Unit Price
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  onClick={() => sortMaterials('average_cost')}
                  className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    Average Cost
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  onClick={() => sortMaterials('manufactured_quantity')}
                  className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    Manufactured
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading inventory...
                  </td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {material.product_name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {material.sku}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {material.category}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                        material.stock_level <= material.reorder_point
                          ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          : material.stock_level <= material.reorder_point * 1.5
                          ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      }`}>
                        {material.stock_level} {material.unit}
                        {material.stock_level <= material.reorder_point && (
                          <AlertTriangle className="ml-1 h-3 w-3" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {material.is_final_product ? 'Final Product' : 'Raw Material'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      £{material.unit_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {material.average_cost 
                        ? `£${material.average_cost.toFixed(2)}` 
                        : `£${material.unit_price.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {material.is_final_product && material.manufactured_quantity 
                        ? `${material.manufactured_quantity} bags` 
                        : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(material.last_updated)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Search, Plus, Edit2, Trash2, RefreshCw } from 'lucide-react'
import { updateAllCosts, updateRecipeCosts } from '@/lib/utils/raw-material-utils'

interface RawMaterial {
  id: string
  name: string
  description?: string
  unit: string
  category: string
  min_stock_level: number
  current_stock: number
  avg_cost: number
  is_active: boolean
}

export default function RawMaterialsPage() {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [filteredMaterials, setFilteredMaterials] = useState<RawMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isUpdatingCosts, setIsUpdatingCosts] = useState(false)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchRawMaterials()
  }, [])

  // Filter materials whenever search term changes
  useEffect(() => {
    const filterMaterials = () => {
      const term = searchTerm.toLowerCase()
      const filtered = rawMaterials.filter(material =>
        material.name.toLowerCase().includes(term) ||
        material.category.toLowerCase().includes(term) ||
        material.description?.toLowerCase().includes(term)
      )
      setFilteredMaterials(filtered)
    }

    filterMaterials()
  }, [searchTerm, rawMaterials])

  const fetchRawMaterials = async () => {
    setLoading(true)
    setError(null)

    try {
      // First try to use the view that includes average costs
      let { data: viewData, error: viewError } = await supabase
        .from('raw_materials_with_avg_cost')
        .select('*')
        .order('name')
      
      if (!viewError && viewData) {
        setRawMaterials(viewData)
        setLoading(false)
        return
      }
      
      // If the view doesn't exist, fall back to manual calculation
      console.log('Falling back to manual calculation for average costs')
      
      // Get raw materials
      const { data: materialsData, error: materialsError } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name')
      
      if (materialsError) throw materialsError
      
      // Enhance with average costs
      const enhancedMaterials = await Promise.all((materialsData || []).map(async (material) => {
        // Get stock records for this material
        const { data: stockData } = await supabase
          .from('stock_receiving')
          .select('quantity, unit_price')
          .eq('item_type', 'raw_material')
          .eq('item_id', material.id)
          .eq('is_accepted', true)
        
        // Calculate average cost
        let avgCost = 0
        if (stockData && stockData.length > 0) {
          let totalCost = 0
          let totalQuantity = 0
          
          for (const record of stockData) {
            totalCost += record.quantity * record.unit_price
            totalQuantity += record.quantity
          }
          
          avgCost = totalQuantity > 0 ? totalCost / totalQuantity : 0
        }
        
        return {
          ...material,
          avg_cost: avgCost
        }
      }))
      
      setRawMaterials(enhancedMaterials)
    } catch (error: any) {
      console.error('Error fetching raw materials:', error)
      setError(error.message || 'Failed to load raw materials')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateAllCosts = async () => {
    setIsUpdatingCosts(true)
    try {
      await updateAllCosts()
      fetchRawMaterials() // Refresh data
    } catch (error: any) {
      console.error('Error updating costs:', error)
      setError('Failed to update costs: ' + error.message)
    } finally {
      setIsUpdatingCosts(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
          <span 
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.03a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Raw Materials</h2>
          <p className="text-gray-600 dark:text-gray-300">Manage your raw materials inventory</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUpdateAllCosts}
            disabled={isUpdatingCosts}
            className="inline-flex items-center gap-x-2 rounded-md bg-green-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:bg-green-400"
          >
            <RefreshCw className="h-5 w-5" />
            {isUpdatingCosts ? 'Updating...' : 'Update All Costs'}
          </button>
          <button
            onClick={() => {/* Add your create material function here */}}
            className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus className="h-5 w-5" />
            Add Material
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          placeholder="Search by name, category, or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100"
        />
      </div>

      {/* Materials Table */}
      <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Unit
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Current Stock
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Min. Stock
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Avg. Cost
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No raw materials found.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {material.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {material.category}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {material.unit}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {material.current_stock}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {material.min_stock_level}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      £{material.avg_cost?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        material.is_active 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {material.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-x-3">
                        <button
                          onClick={() => {/* Add your edit function here */}}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {/* Add your delete function here */}}
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
    </div>
  )
}

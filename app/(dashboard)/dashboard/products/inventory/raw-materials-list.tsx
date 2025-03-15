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
  Package,
  DollarSign
} from 'lucide-react'

// Raw Material interface
interface RawMaterial {
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
  custom_sku?: string
  is_recipe_based?: boolean
  is_final_product?: boolean
}

// SKU Form interface
interface SKUFormData {
  id: string
  product_name: string
  current_sku: string
  custom_sku: string
}

interface RawMaterialsListProps {
  dateRange: {
    start: Date
    end: Date
  }
}

export default function RawMaterialsList({ dateRange }: RawMaterialsListProps) {
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([])
  const [filteredMaterials, setFilteredMaterials] = useState<RawMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<keyof RawMaterial>('product_name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showSkuForm, setShowSkuForm] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<SKUFormData | null>(null)
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchRawMaterials()
    fetchCategories()
    fetchSuppliers()
  }, [dateRange])

  useEffect(() => {
    filterMaterials()
  }, [searchTerm, rawMaterials, selectedCategories, sortField, sortDirection])

  const fetchRawMaterials = async () => {
    setLoading(true)
    setError(null)
    try {
      // Get raw materials only (not recipe based, not final products)
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('is_recipe_based', false)
        .eq('is_final_product', false)
        .order('product_name', { ascending: true })

      if (error) throw error

      // Fetch custom SKUs if they exist
      const { data: customSkuData, error: customSkuError } = await supabase
        .from('custom_skus')
        .select('product_id, custom_sku')

      if (customSkuError) throw customSkuError

      // Create a map of product_id to custom_sku
      const customSkuMap = new Map()
      if (customSkuData) {
        customSkuData.forEach(item => {
          customSkuMap.set(item.product_id, item.custom_sku)
        })
      }

      // Fetch supplier names
      const materialsWithDetails = await Promise.all((data || []).map(async (item) => {
        let supplierName = null
        
        if (item.supplier) {
          const { data: supplierData } = await supabase
            .from('suppliers')
            .select('name')
            .eq('id', item.supplier)
            .single()

          if (supplierData) {
            supplierName = supplierData.name
          }
        }

        return {
          ...item,
          supplier_name: supplierName,
          custom_sku: customSkuMap.get(item.id) || ''
        }
      }))

      setRawMaterials(materialsWithDetails)
      filterMaterials(materialsWithDetails)
    } catch (error: any) {
      console.error('Error fetching raw materials:', error)
      setError('Failed to load raw materials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('category')
        .eq('is_recipe_based', false)
        .eq('is_final_product', false)
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

  const filterMaterials = (items = rawMaterials) => {
    let result = [...items]
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(item => 
        item.product_name.toLowerCase().includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        (item.custom_sku && item.custom_sku.toLowerCase().includes(term)) ||
        (item.supplier_name && item.supplier_name.toLowerCase().includes(term)) ||
        (item.supplier && item.supplier.toLowerCase().includes(term)) ||
        item.category.toLowerCase().includes(term)
      )
    }
    
    // Apply category filter
    if (selectedCategories.length > 0) {
      result = result.filter(item => selectedCategories.includes(item.category))
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
      
      // Handle undefined values for sorting
      const numA = valueA === undefined ? 0 : Number(valueA)
      const numB = valueB === undefined ? 0 : Number(valueB)
      
      return sortDirection === 'asc' ? numA - numB : numB - numA
    })
    
    setFilteredMaterials(result)
  }

  const toggleSort = (field: keyof RawMaterial) => {
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
    if (window.confirm('Are you sure you want to delete this raw material?')) {
      try {
        const { error } = await supabase
          .from('inventory')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        fetchRawMaterials()
      } catch (error: any) {
        console.error('Error deleting raw material:', error)
        setError('Failed to delete raw material. Please try again.')
      }
    }
  }

  const openSkuForm = (material: RawMaterial) => {
    setSelectedMaterial({
      id: material.id,
      product_name: material.product_name,
      current_sku: material.sku,
      custom_sku: material.custom_sku || ''
    })
    setShowSkuForm(true)
  }

  const saveCustomSku = async () => {
    if (!selectedMaterial) return
    
    try {
      // Check if record already exists
      const { data: existingData, error: checkError } = await supabase
        .from('custom_skus')
        .select('*')
        .eq('product_id', selectedMaterial.id)
        .maybeSingle()
      
      if (checkError) throw checkError
      
      let saveError
      
      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('custom_skus')
          .update({ custom_sku: selectedMaterial.custom_sku })
          .eq('product_id', selectedMaterial.id)
        
        saveError = error
      } else {
        // Insert new record
        const { error } = await supabase
          .from('custom_skus')
          .insert({ 
            product_id: selectedMaterial.id, 
            custom_sku: selectedMaterial.custom_sku 
          })
        
        saveError = error
      }
      
      if (saveError) throw saveError
      
      // Update the local state
      setRawMaterials(prev => 
        prev.map(item => 
          item.id === selectedMaterial.id 
            ? { ...item, custom_sku: selectedMaterial.custom_sku } 
            : item
        )
      )
      
      setShowSkuForm(false)
      setSelectedMaterial(null)
    } catch (error: any) {
      console.error('Error saving custom SKU:', error)
      setError('Failed to save custom SKU. Please try again.')
    }
  }

  // Calculate metrics
  const totalMaterials = filteredMaterials.length
  const totalValue = filteredMaterials.reduce(
    (sum, item) => sum + (item.stock_level * item.unit_price), 0
  )
  const lowStockItems = filteredMaterials.filter(
    item => item.stock_level <= item.reorder_point
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Total Raw Materials
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      {totalMaterials}
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
                <DollarSign className="h-6 w-6 text-white" />
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

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search raw materials..."
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
            </div)}
        </div>
      </div>

      {/* Raw Materials Table */}
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
                    System SKU
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  </div>
                </th>
                <th 
                  onClick={() => toggleSort('custom_sku')}
                  className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center">
                    Custom SKU
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
                    Loading raw materials...
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
                      {material.product_name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {material.sku}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 dark:text-gray-400">
                          {material.custom_sku || '—'}
                        </span>
                        <button
                          onClick={() => openSkuForm(material)}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                        >
                          {material.custom_sku ? 'Edit' : 'Add'}
                        </button>
                      </div>
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
                      £{material.unit_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {material.supplier_name || material.supplier || '—'}
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
                          onClick={() => handleDeleteItem(material.id)}
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

      {/* Custom SKU Form Modal */}
      {showSkuForm && selectedMaterial && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {selectedMaterial.custom_sku ? 'Edit Custom SKU' : 'Add Custom SKU'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Product Name
                </label>
                <div className="mt-1 text-sm text-gray-900 dark:text-white font-medium">
                  {selectedMaterial.product_name}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  System SKU
                </label>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedMaterial.current_sku}
                </div>
              </div>
              
              <div>
                <label htmlFor="custom_sku" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Custom SKU
                </label>
                <input
                  type="text"
                  id="custom_sku"
                  value={selectedMaterial.custom_sku}
                  onChange={(e) => setSelectedMaterial({
                    ...selectedMaterial,
                    custom_sku: e.target.value
                  })}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Add your own custom SKU for easier identification when ordering from supplier.
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSkuForm(false)
                  setSelectedMaterial(null)
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomSku}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

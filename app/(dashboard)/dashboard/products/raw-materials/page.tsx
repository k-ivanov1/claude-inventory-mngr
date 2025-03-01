'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  AlertTriangle
} from 'lucide-react'
import { RawMaterialForm } from '@/components/products/raw-materials/raw-material-form'

// Raw Material interface
interface RawMaterial {
  id?: string
  name: string
  description?: string
  category?: string
  sku?: string
  unit: string
  reorder_point: number
  is_active: boolean
  supplier_id?: string
  supplier_name?: string // Joined field for display
}

// Inventory interface to show current stock
interface InventoryItem {
  item_id: string
  current_stock: number
  unit_price: number
}

export default function RawMaterialsPage() {
  const [rawMaterials, setRawMaterials] = useState<(RawMaterial & { inventory?: InventoryItem })[]>([])
  const [filteredMaterials, setFilteredMaterials] = useState<(RawMaterial & { inventory?: InventoryItem })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null)
  const [categories, setCategories] = useState<string[]>(['tea', 'coffee', 'herbs', 'spices', 'packaging'])
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchRawMaterials()
    fetchCategories()
  }, [])

  // Filter products whenever search term or products change
  useEffect(() => {
    const term = searchTerm.toLowerCase()
    const filtered = rawMaterials.filter(material => 
      material.name.toLowerCase().includes(term) ||
      material.category?.toLowerCase().includes(term) ||
      material.sku?.toLowerCase().includes(term)
    )
    setFilteredMaterials(filtered)
  }, [searchTerm, rawMaterials])

  const fetchRawMaterials = async () => {
    setLoading(true)
    setError(null)
    try {
      // First, get raw materials with supplier name
      const { data: materialsData, error: materialsError } = await supabase
        .from('raw_materials')
        .select(`
          *,
          suppliers(name)
        `)
        .order('name')
      
      if (materialsError) throw materialsError
      
      // Format data with supplier name
      const formattedMaterials = (materialsData || []).map(material => ({
        ...material,
        supplier_name: material.suppliers?.name
      }))
      
      // Next, get inventory data for these materials
      const materialIds = formattedMaterials.map(m => m.id)
      
      if (materialIds.length > 0) {
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory')
          .select('*')
          .eq('item_type', 'raw_material')
          .in('item_id', materialIds)
        
        if (inventoryError) throw inventoryError
        
        // Merge inventory data with raw materials
        const materialsWithInventory = formattedMaterials.map(material => {
          const inventory = inventoryData?.find(inv => inv.item_id === material.id)
          return {
            ...material,
            inventory: inventory ? {
              item_id: inventory.item_id,
              current_stock: inventory.current_stock,
              unit_price: inventory.unit_price
            } : undefined
          }
        })
        
        setRawMaterials(materialsWithInventory)
      } else {
        setRawMaterials(formattedMaterials)
      }
    } catch (error: any) {
      console.error('Error fetching raw materials:', error)
      setError(error.message || 'Failed to load raw materials. Please check your connection or permissions.')
    } finally {
      setLoading(false)
    }
  }

const fetchCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('raw_materials')
      .select('category')
      .not('category', 'is', null)
    
    if (error) throw error
    
    if (data && data.length > 0) {
      // Create an object to track unique categories instead of using Set
      const categoryMap: Record<string, boolean> = {};
      
      // Add each category to the map
      data.forEach(item => {
        if (item.category) {
          categoryMap[item.category] = true;
        }
      });
      
      // Convert the object keys to an array
      const uniqueCategories = Object.keys(categoryMap);
      
      if (uniqueCategories.length > 0) {
        setCategories(uniqueCategories);
      }
    }
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    // If fetching categories fails, keep default categories
  }
}

  const handleDeleteMaterial = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this raw material?')) {
      try {
        // First check if there are recipe items using this material
        const { data: usageData, error: usageError } = await supabase
          .from('recipe_items')
          .select('id')
          .eq('raw_material_id', id)
          .limit(1)
        
        if (usageError) throw usageError
        
        if (usageData && usageData.length > 0) {
          alert('This raw material is used in one or more recipes and cannot be deleted. Consider marking it as inactive instead.')
          return
        }
        
        const { error } = await supabase
          .from('raw_materials')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        // Refresh raw materials list
        fetchRawMaterials()
      } catch (error: any) {
        console.error('Error deleting raw material:', error)
        setError(error.message || 'Failed to delete raw material. Please try again.')
      }
    }
  }

  const handleEditMaterial = (material: RawMaterial) => {
    setEditingMaterial(material)
    setShowForm(true)
  }

  const handleSaveMaterial = () => {
    // Close form
    setShowForm(false)
    setEditingMaterial(null)
    
    // Refresh data
    fetchRawMaterials()
  }

  return (
    <div className="space-y-8">
      {/* Error Notification */}
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
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

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Raw Materials</h2>
          <p className="text-gray-600">Manage raw materials used in your products</p>
        </div>
        <button
          onClick={() => {
            setEditingMaterial(null)
            setShowForm(true)
          }}
          className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="h-5 w-5" />
          Add Raw Material
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search by name, category, or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      {/* Raw Materials Table */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Level
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-4 text-center text-sm text-gray-500">
                    No raw materials found.
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((material) => (
                  <tr key={material.id} className={!material.is_active ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {material.name}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.category || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.sku || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.unit}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {material.inventory ? (
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                          material.inventory.current_stock <= material.reorder_point
                            ? 'bg-red-50 text-red-700'
                            : material.inventory.current_stock <= material.reorder_point * 1.5
                            ? 'bg-yellow-50 text-yellow-700'
                            : 'bg-green-50 text-green-700'
                        }`}>
                          {material.inventory.current_stock} {material.unit}
                          {material.inventory.current_stock <= material.reorder_point && (
                            <AlertTriangle className="ml-1 h-3 w-3" />
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">No stock data</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.inventory ? 
                        `£${material.inventory.unit_price.toFixed(2)}` : 
                        '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.supplier_name || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        material.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {material.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-x-3">
                        <button
                          onClick={() => handleEditMaterial(material)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => material.id && handleDeleteMaterial(material.id)}
                          className="text-red-600 hover:text-red-900"
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

      {/* Raw Material Form Modal */}
      {showForm && (
        <RawMaterialForm
          material={editingMaterial}
          categories={categories}
          onClose={() => {
            setShowForm(false)
            setEditingMaterial(null)
          }}
          onSubmit={handleSaveMaterial}
        />
      )}
    </div>
  )
}

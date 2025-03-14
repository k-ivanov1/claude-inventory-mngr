'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Search, Filter, ChevronDown, Eye, FileText, CalendarClock } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'

interface BatchTraceabilityItem {
  batch_id: string
  batch_date: string
  batch_number: string
  product_name: string
  quantity_produced: number
  ingredient_details: {
    raw_material_name: string
    quantity_used: number
    unit: string
  }[]
  consumed_inventory: {
    inventory_id: string
    product_name: string
    quantity: number
    unit: string
  }[]
  produced_inventory: {
    inventory_id: string
    product_name: string
    quantity: number
    unit: string
  }[]
}

export function BatchTraceabilityComponent() {
  const [batches, setBatches] = useState<BatchTraceabilityItem[]>([])
  const [filteredBatches, setFilteredBatches] = useState<BatchTraceabilityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showProductFilter, setShowProductFilter] = useState(false)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [products, setProducts] = useState<{ name: string }[]>([])

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchBatchTraceability()
    fetchProducts()
  }, [])

  useEffect(() => {
    let result = batches

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(batch => 
        batch.product_name.toLowerCase().includes(term) ||
        batch.batch_number.toLowerCase().includes(term) ||
        batch.ingredient_details.some(i => i.raw_material_name.toLowerCase().includes(term))
      )
    }

    // Apply product filter
    if (selectedProducts.length > 0) {
      result = result.filter(batch => selectedProducts.includes(batch.product_name))
    }

    setFilteredBatches(result)
  }, [searchTerm, batches, selectedProducts])

  const fetchBatchTraceability = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch batch manufacturing records with related data
      const { data: batchData, error: batchError } = await supabase
        .from('batch_manufacturing_records')
        .select(`
          id,
          date,
          product_batch_number,
          bags_count,
          bag_size,
          batch_size,
          batch_started,
          batch_finished,
          products:product_id (name)
        `)
        .order('date', { ascending: false })

      if (batchError) throw batchError

      // For each batch, fetch its ingredients and inventory movements
      const batchesWithDetails = await Promise.all((batchData || []).map(async (batch) => {
        // Fetch ingredients
        const { data: ingredientData, error: ingredientError } = await supabase
          .from('batch_ingredients')
          .select(`
            quantity,
            raw_materials:raw_material_id (name, unit)
          `)
          .eq('batch_id', batch.id)

        if (ingredientError) {
          console.error('Error fetching ingredients:', ingredientError)
          return null
        }

        // Fetch inventory movements related to this batch
        const { data: movementData, error: movementError } = await supabase
          .from('inventory_movements')
          .select(`
            inventory_id,
            movement_type,
            quantity,
            inventory:inventory_id (product_name, unit)
          `)
          .eq('reference_id', batch.id)
          .eq('reference_type', 'batch')

        if (movementError) {
          console.error('Error fetching movements:', movementError)
          return null
        }

        // Format ingredients
        const ingredients = (ingredientData || []).map(ingredient => ({
          raw_material_name: ingredient.raw_materials?.name || 'Unknown Material',
          quantity_used: ingredient.quantity,
          unit: ingredient.raw_materials?.unit || 'kg'
        }))

        // Split movements into consumed and produced
        const consumed = (movementData || [])
          .filter(m => m.movement_type === 'manufacturing_consume')
          .map(m => ({
            inventory_id: m.inventory_id,
            product_name: m.inventory?.product_name || 'Unknown',
            quantity: Math.abs(m.quantity),
            unit: m.inventory?.unit || 'kg'
          }))

        const produced = (movementData || [])
          .filter(m => m.movement_type === 'manufacturing_produce')
          .map(m => ({
            inventory_id: m.inventory_id,
            product_name: m.inventory?.product_name || 'Unknown',
            quantity: m.quantity,
            unit: m.inventory?.unit || 'piece'
          }))

        return {
          batch_id: batch.id,
          batch_date: batch.date,
          batch_number: batch.product_batch_number || 'No Batch #',
          product_name: batch.products?.name || 'Unknown Product',
          quantity_produced: batch.bags_count || 0,
          ingredient_details: ingredients,
          consumed_inventory: consumed,
          produced_inventory: produced
        }
      }))

      // Filter out null values (failed fetches)
      const validBatches = batchesWithDetails.filter(batch => batch !== null) as BatchTraceabilityItem[]

      setBatches(validBatches)
      setFilteredBatches(validBatches)
    } catch (error: any) {
      console.error('Error fetching batch traceability:', error)
      setError(error.message || 'Failed to load batch traceability data')
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('final_products')
        .select('name')
        .order('name')

      if (error) throw error

      setProducts(data || [])
    } catch (error: any) {
      console.error('Error fetching products:', error)
    }
  }

  const toggleProductFilter = (product: string) => {
    setSelectedProducts(prev =>
      prev.includes(product)
        ? prev.filter(p => p !== product)
        : [...prev, product]
    )
  }

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy')
    } catch (e) {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Batch Traceability</h2>
        <button
          onClick={fetchBatchTraceability}
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
            placeholder="Search by product, batch number, or ingredient..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        {/* Product Filter */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProductFilter(!showProductFilter)}
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Filter className="h-4 w-4 mr-2" />
            Products
            <ChevronDown className="h-4 w-4 ml-2" />
          </button>
          {showProductFilter && (
            <div className="absolute right-0 z-10 mt-2 w-64 max-h-96 overflow-auto rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1" role="menu" aria-orientation="vertical">
                {products.map((product) => (
                  <div key={product.name} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      id={`product-${product.name}`}
                      checked={selectedProducts.includes(product.name)}
                      onChange={() => toggleProductFilter(product.name)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-2"
                    />
                    <label htmlFor={`product-${product.name}`} className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      {product.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Batches List */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded" role="alert">
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="px-4 py-5 sm:p-6 text-center">
            <div className="animate-pulse text-gray-600 dark:text-gray-400">Loading batch traceability data...</div>
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="px-4 py-5 sm:p-6 text-center text-gray-500 dark:text-gray-400">
            No batch records found for the selected criteria.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredBatches.map((batch) => (
              <li key={batch.batch_id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <Link href={`/dashboard/traceability/batch-records/${batch.batch_id}`} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        {batch.product_name}
                      </div>
                    </Link>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      Batch #{batch.batch_number}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <CalendarClock className="h-4 w-4 mr-1 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(batch.batch_date)}</span>
                  </div>
                </div>
                
                {/* Production Details */}
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Ingredients Used */}
                  <div className="bg-gray-50 dark:bg-gray-900/30 rounded-md p-3">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Ingredients Used</h4>
                    <div className="space-y-1">
                      {batch.ingredient_details.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No ingredients recorded</p>
                      ) : (
                        batch.ingredient_details.map((ingredient, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">{ingredient.raw_material_name}</span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {ingredient.quantity_used} {ingredient.unit}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* Products Produced */}
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-md p-3">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Production Output</h4>
                    <div className="space-y-1">
                      {batch.produced_inventory.length === 0 ? (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300">{batch.product_name}</span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {batch.quantity_produced} pieces
                          </span>
                        </div>
                      ) : (
                        batch.produced_inventory.map((product, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">{product.product_name}</span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {product.quantity} {product.unit}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                
                {/* View Details Link */}
                <div className="mt-3 flex justify-end">
                  <Link 
                    href={`/dashboard/traceability/batch-records/${batch.batch_id}`}
                    className="inline-flex items-center text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Complete Batch Record
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

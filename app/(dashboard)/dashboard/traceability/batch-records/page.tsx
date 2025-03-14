'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Search, 
  Eye, 
  FileText, 
  Calendar,
  Clock,
  ArrowUpDown,
  Filter,
  ChevronDown,
  Download,
  Plus,
  RefreshCw,
  X
} from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'

// Interface for batch manufacturing record data
interface BatchRecord {
  id: string
  date: string
  product_id: string
  product_batch_number?: string
  products?: { name: string }
  product_name?: string
  batch_size: number
  batch_started: string
  batch_finished?: string
  status?: string
  created_at?: string
}

export default function BatchRecordsPage() {
  const [batchRecords, setBatchRecords] = useState<BatchRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<BatchRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [products, setProducts] = useState<Record<string, string>>({})

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchBatchRecords()
  }, [])

  useEffect(() => {
    let result = batchRecords

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(record => 
        (record.product_name && record.product_name.toLowerCase().includes(term)) ||
        (record.product_batch_number && record.product_batch_number.toLowerCase().includes(term)) ||
        record.id.toString().includes(term)
      )
    }

    // Apply status filter
    if (filterStatus !== 'all' && filterStatus) {
      result = result.filter(record => record.status === filterStatus)
    }

    // Apply sort
    result = [...result].sort((a, b) => {
      if (sortField === 'date') {
        // Use created_at if available, otherwise fall back to date
        const dateA = a.created_at ? new Date(a.created_at).getTime() : new Date(a.date).getTime()
        const dateB = b.created_at ? new Date(b.created_at).getTime() : new Date(b.date).getTime()
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA
      } else if (sortField === 'batch_size') {
        return sortDirection === 'asc' ? a.batch_size - b.batch_size : b.batch_size - a.batch_size
      } else if (sortField === 'product_name') {
        const nameA = a.product_name || ''
        const nameB = b.product_name || ''
        return sortDirection === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA)
      } else {
        return 0
      }
    })

    setFilteredRecords(result)
  }, [searchTerm, batchRecords, sortField, sortDirection, filterStatus])

  // Fetch product names to use for lookups
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('final_products')
        .select('id, name')
      
      if (error) throw error

      console.log('Fetched products data:', data)
      
      const productMap: Record<string, string> = {}
      data?.forEach(product => {
        productMap[product.id] = product.name
        console.log(`Added product to map: ID ${product.id} -> ${product.name}`)
      })
      
      console.log('Complete product map:', productMap)
      setProducts(productMap)
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchBatchRecords = async () => {
    setLoading(true)
    setError(null)
    try {
      console.log('INVESTIGATING DATABASE STRUCTURE...')
      
      // First, get one sample batch record to examine the product_id
      const { data: sampleBatch, error: sampleError } = await supabase
        .from('batch_manufacturing_records')
        .select('*')
        .limit(1)
      
      if (sampleError) {
        console.error('Error fetching sample batch:', sampleError)
      } else if (sampleBatch && sampleBatch.length > 0) {
        const sample = sampleBatch[0]
        console.log('Sample batch record:', sample)
        console.log('Product ID in sample:', sample.product_id, 'Type:', typeof sample.product_id)
        
        // Now try to find the corresponding product
        const { data: matchingProduct, error: matchError } = await supabase
          .from('final_products')
          .select('*')
          .eq('id', sample.product_id)
        
        console.log('Tried to match product with ID:', sample.product_id)
        
        if (matchError) {
          console.error('Error finding matching product:', matchError)
        } else {
          console.log('Matching product result:', matchingProduct)
          
          // Also get all products to compare
          const { data: allProducts, error: productsError } = await supabase
            .from('final_products')
            .select('*')
          
          if (productsError) {
            console.error('Error fetching all products:', productsError)
          } else {
            console.log('All products:', allProducts)
            
            // Try to find a match manually
            const manualMatch = allProducts?.find(p => String(p.id) === String(sample.product_id))
            console.log('Manual match result:', manualMatch)
          }
        }
      }
      
      // Try several join approaches
      console.log('TRYING DIFFERENT JOIN APPROACHES...')
      
      // 1. Using direct foreign key relationship
      console.log('Approach 1: Direct foreign key relationship')
      const { data: approach1Data, error: approach1Error } = await supabase
        .from('batch_manufacturing_records')
        .select(`
          *,
          final_products(id, name)
        `)
        .limit(5)
      
      console.log('Approach 1 result:', approach1Data)
      console.log('Approach 1 error:', approach1Error)
      
      // 2. Using named foreign key
      console.log('Approach 2: Named foreign key')
      const { data: approach2Data, error: approach2Error } = await supabase
        .from('batch_manufacturing_records')
        .select(`
          *,
          products:product_id(id, name)
        `)
        .limit(5)
      
      console.log('Approach 2 result:', approach2Data)
      console.log('Approach 2 error:', approach2Error)
      
      // 3. Using explicit join
      console.log('Approach 3: Explicit join')
      const { data: approach3Data, error: approach3Error } = await supabase
        .from('batch_manufacturing_records')
        .select(`
          *,
          product_name:final_products!inner(name)
        `)
        .limit(5)
      
      console.log('Approach 3 result:', approach3Data)
      console.log('Approach 3 error:', approach3Error)
      
      // After investigation, proceed with the most promising approach
      let productNameField = ''
      if (!approach1Error && approach1Data && approach1Data[0]?.final_products?.name) {
        console.log('Using approach 1 for full fetch')
        productNameField = 'final_products(name)'
      } else if (!approach2Error && approach2Data && approach2Data[0]?.products?.name) {
        console.log('Using approach 2 for full fetch')
        productNameField = 'products:product_id(name)'
      } else {
        console.log('Using fallback approach for full fetch')
        productNameField = ''
      }
      
      // Now fetch all records using the approach that worked
      if (productNameField) {
        const { data: batchData, error: batchError } = await supabase
          .from('batch_manufacturing_records')
          .select(`*, ${productNameField}`)
          .order('date', { ascending: false })
        
        if (batchError) {
          console.error('Error fetching batch records with join:', batchError)
          throw batchError
        }
        
        console.log('Fetched all batch records with product names:', batchData)
        
        // Format the records based on which approach worked
        const formattedRecords = (batchData || []).map((record: any) => {
          let productName = 'Unknown Product'
          
          if (record.products?.name) {
            productName = record.products.name
          } else if (record.final_products?.name) {
            productName = record.final_products.name
          }
          
          return {
            ...record,
            product_name: productName,
            status: record.batch_finished ? 'completed' : 'in-progress'
          }
        })
        
        setBatchRecords(formattedRecords)
        setFilteredRecords(formattedRecords)
      } else {
        // Fallback to getting products separately
        const { data: batchData, error: batchError } = await supabase
          .from('batch_manufacturing_records')
          .select('*')
          .order('date', { ascending: false })
        
        if (batchError) {
          console.error('Error fetching batch records:', batchError)
          throw batchError
        }
        
        // Get all products to map IDs to names
        const { data: products, error: productsError } = await supabase
          .from('final_products')
          .select('id, name')
        
        if (productsError) {
          console.error('Error fetching products:', productsError)
        }
        
        const productMap: Record<string, string> = {}
        products?.forEach((product: any) => {
          productMap[product.id] = product.name
          // Also add string version as fallback
          productMap[String(product.id)] = product.name
        })
        
        const formattedRecords = (batchData || []).map((record: any) => {
          // Try both the direct ID and string version
          const productName = productMap[record.product_id] || 
                             productMap[String(record.product_id)] || 
                             'Unknown Product'
          
          return {
            ...record,
            product_name: productName,
            status: record.batch_finished ? 'completed' : 'in-progress'
          }
        })
        
        setBatchRecords(formattedRecords)
        setFilteredRecords(formattedRecords)
      }
    } catch (error: any) {
      console.error('Error fetching batch records:', error)
      setError('Failed to load batch records. Please try again.')
      
      // Emergency fallback
      try {
        const { data, error: fallbackError } = await supabase
          .from('batch_manufacturing_records')
          .select('*')
        
        if (!fallbackError) {
          setBatchRecords(data || [])
          setFilteredRecords(data || [])
        }
      } catch (e) {
        console.error('Even emergency fallback failed:', e)
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-'
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy')
    } catch (e) {
      return dateString
    }
  }

  const formatDateTime = (dateTimeString: string | undefined) => {
    if (!dateTimeString) return '-'
    try {
      return format(parseISO(dateTimeString), 'dd/MM/yyyy HH:mm')
    } catch (e) {
      return dateTimeString
    }
  }

  const handleClearError = () => {
    setError(null)
  }
  
  const handleRefresh = async () => {
    await fetchBatchRecords()
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative" role="alert">
          <div className="flex items-center justify-between">
            <span className="block sm:inline">{error}</span>
            <button onClick={handleClearError} className="text-red-700 dark:text-red-200">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Batch Manufacturing Records</h2>
          <p className="text-gray-600 dark:text-gray-300">
            View and manage batch manufacturing records
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleRefresh} 
            className="inline-flex items-center gap-x-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            title="Refresh batch records"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <Link href="/dashboard/traceability">
            <button className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
              <Plus className="h-5 w-5" />
              New Batch Record
            </button>
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search by product name or batch ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            <ChevronDown className="h-4 w-4 ml-2" />
          </button>
          {showFilters && (
            <div className="absolute right-0 z-10 mt-2 w-56 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1" role="menu" aria-orientation="vertical">
                <div className="px-4 py-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="in-progress">In Progress</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Batch ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Batch Number
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('date')}
                >
                  <div className="flex items-center">
                    Date
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('product_name')}
                >
                  <div className="flex items-center">
                    Product
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('batch_size')}
                >
                  <div className="flex items-center">
                    Batch Size
                    <ArrowUpDown className="h-4 w-4 ml-1" />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Started
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Finished
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                    <div className="flex justify-center items-center">
                      <RefreshCw className="h-5 w-5 animate-spin mr-3" />
                      Loading batch records...
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                    No batch records found. Try refreshing or creating a new batch record.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-indigo-500" />
                        {record.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {record.product_batch_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDate(record.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {record.product_name || 'Unknown Product'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {record.batch_size !== undefined ? `${record.batch_size} kg` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDateTime(record.batch_started)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {record.batch_finished ? (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          {formatDateTime(record.batch_finished)}
                        </div>
                      ) : (
                        <span className="text-yellow-500 dark:text-yellow-400">In progress</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.status === 'completed' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                          : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                      }`}>
                        {record.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <Link 
                          href={`/dashboard/traceability/batch-records/${record.id}`}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button 
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                          title="Download batch record"
                        >
                          <Download className="h-4 w-4" />
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

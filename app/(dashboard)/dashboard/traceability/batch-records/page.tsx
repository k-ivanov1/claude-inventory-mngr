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
      // Debug logging
      console.log('Fetching batch records...')
      
      // First, get all batch records
      const { data: batchData, error: batchError } = await supabase
        .from('batch_manufacturing_records')
        .select('*')
        .order('date', { ascending: false })

      if (batchError) {
        console.error('Supabase error fetching batches:', batchError)
        throw batchError
      }

      console.log('Fetched batch records:', batchData)
      
      // If we have batch records, get the product names for each
      if (batchData && batchData.length > 0) {
        // Extract unique product IDs
        const productIds = [...new Set(batchData.map(record => record.product_id))].filter(Boolean)
        console.log('Unique product IDs:', productIds)
        
        if (productIds.length > 0) {
          // Fetch product details for these IDs
          const { data: productData, error: productError } = await supabase
            .from('final_products')
            .select('id, name')
            .in('id', productIds)
          
          if (productError) {
            console.error('Error fetching product details:', productError)
          } else {
            console.log('Fetched product details:', productData)
            
            // Create a mapping of product IDs to names
            const productMap: Record<string, string> = {}
            productData?.forEach(product => {
              productMap[product.id] = product.name
              console.log(`Mapped product: ${product.id} -> ${product.name}`)
            })
            
            // Assign product names to batch records
            const formattedRecords = batchData.map(record => {
              const productName = productMap[record.product_id] || 'Unknown Product'
              console.log(`Assigned product name for batch ${record.id}: ${productName}`)
              
              return {
                ...record,
                product_name: productName,
                status: record.batch_finished ? 'completed' : 'in-progress'
              }
            })
            
            console.log('Final formatted records:', formattedRecords)
            setBatchRecords(formattedRecords)
            setFilteredRecords(formattedRecords)
            setLoading(false)
            return
          }
        }
      }
      
      // If we reached here, either there was an error or no product IDs to look up
      // Just format the batch records without product names
      const formattedRecords = (batchData || []).map(record => ({
        ...record,
        product_name: 'Unknown Product',
        status: record.batch_finished ? 'completed' : 'in-progress'
      }))
      
      setBatchRecords(formattedRecords)
      setFilteredRecords(formattedRecords)
    } catch (error: any) {
      console.error('Error fetching batch records:', error)
      setError('Failed to load batch records. Please try again.')
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

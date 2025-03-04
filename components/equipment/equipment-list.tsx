'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Filter, 
  ChevronDown,
  Calendar,
  Wrench, // Replaced "Tool" with "Wrench"
  AlertTriangle
} from 'lucide-react'
import { EquipmentForm } from '@/components/equipment/equipment-form'
import { format, parseISO, isAfter, addDays } from 'date-fns'

// Equipment interface to match database schema
interface Equipment {
  id?: string
  serial_number?: string
  description: string
  model?: string
  manufacturer?: string
  value: number
  purchase_date?: string
  last_service_date?: string
  next_service_date?: string
  service_interval_months?: number
  location?: string
  status?: string
  condition?: string
  notes?: string
}

export default function EquipmentList() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showStatusFilter, setShowStatusFilter] = useState(false)
  const [statusOptions, setStatusOptions] = useState<string[]>([
    'active', 'maintenance', 'repair', 'decommissioned'
  ])
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchEquipment()
  }, [])

  useEffect(() => {
    let result = equipment
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(item => 
        (item.description?.toLowerCase().includes(term)) || 
        (item.serial_number?.toLowerCase().includes(term)) ||
        (item.manufacturer?.toLowerCase().includes(term)) ||
        (item.location?.toLowerCase().includes(term))
      )
    }
    
    // Apply status filter
    if (selectedStatus !== 'all') {
      result = result.filter(item => item.status === selectedStatus)
    }
    
    setFilteredEquipment(result)
  }, [searchTerm, selectedStatus, equipment])

  const fetchEquipment = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('description')
      
      if (error) throw error
      
      setEquipment(data || [])
    } catch (error: any) {
      console.error('Error fetching equipment:', error)
      setError('Failed to load equipment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEquipment = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this equipment?')) {
      try {
        const { error } = await supabase
          .from('equipment')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        // Refresh equipment list
        fetchEquipment()
      } catch (error: any) {
        console.error('Error deleting equipment:', error)
        setError('Failed to delete equipment. Please try again.')
      }
    }
  }

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return '-'
    return format(parseISO(dateString), 'dd/MM/yyyy')
  }

  const isServiceDue = (nextServiceDate: string | undefined | null) => {
    if (!nextServiceDate) return false
    
    // Consider service due if it's within the next 30 days or overdue
    const today = new Date()
    const serviceDate = parseISO(nextServiceDate)
    const thirtyDaysFromNow = addDays(today, 30)
    
    return isAfter(thirtyDaysFromNow, serviceDate)
  }

  const handleEquipmentSaved = () => {
    setShowForm(false)
    setEditingEquipment(null)
    fetchEquipment()
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Equipment List</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Track and manage all equipment and machinery
          </p>
        </div>
        <button
          onClick={() => {
            setEditingEquipment(null)
            setShowForm(true)
          }}
          className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="h-5 w-5" />
          Add Equipment
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search equipment, serial number, manufacturer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border dark:border-gray-700 border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowStatusFilter(!showStatusFilter)}
            className="inline-flex items-center rounded-md border dark:border-gray-700 border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
          >
            <Filter className="h-4 w-4 mr-2" />
            Status
            <ChevronDown className="h-4 w-4 ml-2" />
          </button>
          {showStatusFilter && (
            <div className="absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1" role="menu" aria-orientation="vertical">
                <button
                  onClick={() => {
                    setSelectedStatus('all')
                    setShowStatusFilter(false)
                  }}
                  className={`w-full text-left block px-4 py-2 text-sm ${
                    selectedStatus === 'all' 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' 
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  All Status
                </button>
                
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setSelectedStatus(status)
                      setShowStatusFilter(false)
                    }}
                    className={`w-full text-left block px-4 py-2 text-sm ${
                      selectedStatus === status 
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' 
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
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
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Serial Number</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Manufacturer</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Purchase Date</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Next Service</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading equipment...
                  </td>
                </tr>
              ) : filteredEquipment.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No equipment found.
                  </td>
                </tr>
              ) : (
                filteredEquipment.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <Wrench className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                        {item.description}
                      </div>
                      {item.model && <div className="text-xs text-gray-500 dark:text-gray-400">Model: {item.model}</div>}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.serial_number || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.manufacturer || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      £{item.value.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDate(item.purchase_date)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {item.next_service_date ? (
                        <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${
                          isServiceDue(item.next_service_date)
                            ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                            : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        }`}>
                          {isServiceDue(item.next_service_date) && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {formatDate(item.next_service_date)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.status === 'active' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                          : item.status === 'maintenance'
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          : item.status === 'repair'
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-x-3">
                        <button
                          onClick={() => {
                            setEditingEquipment(item)
                            setShowForm(true)
                          }}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                          title="Edit equipment"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEquipment(item.id!)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          title="Delete equipment"
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

      {/* Equipment Form Modal */}
      {showForm && (
        <EquipmentForm
          equipment={editingEquipment}
          onClose={() => {
            setShowForm(false)
            setEditingEquipment(null)
          }}
          onSave={handleEquipmentSaved}
        />
      )}
    </div>
  )
}

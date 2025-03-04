'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Wrench } from 'lucide-react' // Changed from X to Wrench

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

interface EquipmentFormProps {
  equipment?: Equipment | null
  onClose: () => void
  onSave: () => void
}

export function EquipmentForm({ 
  equipment, 
  onClose, 
  onSave 
}: EquipmentFormProps) {
  const [formData, setFormData] = useState<Equipment>({
    serial_number: '',
    description: '',
    model: '',
    manufacturer: '',
    value: 0,
    purchase_date: '',
    last_service_date: '',
    next_service_date: '',
    service_interval_months: 12,
    location: '',
    status: 'active',
    condition: 'good',
    notes: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  // Available options for dropdowns
  const statusOptions = ['active', 'maintenance', 'repair', 'decommissioned']
  const conditionOptions = ['excellent', 'good', 'fair', 'poor']
  const locationOptions = ['main building', 'warehouse', 'production floor', 'office', 'laboratory']

  useEffect(() => {
    if (equipment) {
      setFormData({
        ...equipment,
        // Ensure all dates are properly formatted for input fields
        purchase_date: equipment.purchase_date || '',
        last_service_date: equipment.last_service_date || '',
        next_service_date: equipment.next_service_date || '',
      })
    }
  }, [equipment])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    
    if (type === 'number') {
      setFormData({ ...formData, [name]: parseFloat(value) || 0 })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  // Calculate next service date based on last service date and interval
  const calculateNextServiceDate = () => {
    if (!formData.last_service_date || !formData.service_interval_months) return

    const lastServiceDate = new Date(formData.last_service_date)
    const nextServiceDate = new Date(lastServiceDate)
    nextServiceDate.setMonth(lastServiceDate.getMonth() + formData.service_interval_months)
    
    // Format date to YYYY-MM-DD for input field
    const nextDateStr = nextServiceDate.toISOString().split('T')[0]
    setFormData({ ...formData, next_service_date: nextDateStr })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.description) {
        throw new Error('Equipment description is required.')
      }

      if (formData.value <= 0) {
        throw new Error('Value must be greater than zero.')
      }

      // Prepare data to submit
      const equipmentData = {
        serial_number: formData.serial_number || null,
        description: formData.description,
        model: formData.model || null,
        manufacturer: formData.manufacturer || null,
        value: formData.value,
        purchase_date: formData.purchase_date || null,
        last_service_date: formData.last_service_date || null,
        next_service_date: formData.next_service_date || null,
        service_interval_months: formData.service_interval_months || null,
        location: formData.location || null,
        status: formData.status || 'active',
        condition: formData.condition || null,
        notes: formData.notes || null
      }

      if (equipment?.id) {
        // Update existing equipment
        const { error } = await supabase
          .from('equipment')
          .update(equipmentData)
          .eq('id', equipment.id)
        
        if (error) throw error
      } else {
        // Insert new equipment
        const { error } = await supabase
          .from('equipment')
          .insert(equipmentData)
        
        if (error) throw error
      }

      // Call the onSave callback
      onSave()
    } catch (error: any) {
      console.error('Error saving equipment:', error)
      setError(error.message || 'Failed to save equipment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
              <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <title>Close</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.03a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
              </svg>
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {equipment ? 'Edit Equipment' : 'Add New Equipment'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <Wrench className="h-5 w-5" /> {/* Updated icon */}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description *
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Serial Number
              </label>
              <input
                type="text"
                name="serial_number"
                value={formData.serial_number}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Manufacturer
              </label>
              <input
                type="text"
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Model
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Value (£) *
              </label>
              <input
                type="number"
                name="value"
                value={formData.value}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {statusOptions.map(option => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Condition
              </label>
              <select
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {conditionOptions.map(option => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Purchase Date
              </label>
              <input
                type="date"
                name="purchase_date"
                value={formData.purchase_date}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Location
              </label>
              <select
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select a location</option>
                {locationOptions.map(option => (
                  <option key={option} value={option}>
                    {option.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Maintenance Section */}
            <div className="col-span-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-3">
                Maintenance Information
              </h4>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Last Service Date
              </label>
              <input
                type="date"
                name="last_service_date"
                value={formData.last_service_date}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Service Interval (months)
                </label>
                <button
                  type="button"
                  onClick={calculateNextServiceDate}
                  className="text-xs text-indigo-600 dark:text-indigo-400"
                  disabled={!formData.last_service_date || !formData.service_interval_months}
                >
                  Calculate Next Service
                </button>
              </div>
              <input
                type="number"
                name="service_interval_months"
                value={formData.service_interval_months}
                onChange={handleChange}
                min="1"
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Next Service Date
              </label>
              <input
                type="date"
                name="next_service_date"
                value={formData.next_service_date}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Notes Section */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : equipment ? 'Update Equipment' : 'Add Equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

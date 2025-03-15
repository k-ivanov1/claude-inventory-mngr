'use client'

import { useState, useEffect } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'

interface DateRangeSelectorProps {
  dateRange: {
    start: Date
    end: Date
  }
  onChange: (range: { start: Date; end: Date }) => void
}

export default function DateRangeSelector({ dateRange, onChange }: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [startDate, setStartDate] = useState<string>(format(dateRange.start, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState<string>(format(dateRange.end, 'yyyy-MM-dd'))
  const [selectedPreset, setSelectedPreset] = useState<string>('last30')

  // Update the form when presets are selected
  useEffect(() => {
    // Convert to proper date format for inputs
    setStartDate(format(dateRange.start, 'yyyy-MM-dd'))
    setEndDate(format(dateRange.end, 'yyyy-MM-dd'))
  }, [dateRange])

  const applyDateRange = () => {
    onChange({
      start: new Date(startDate),
      end: new Date(endDate)
    })
    setIsOpen(false)
  }

  const selectPreset = (preset: string) => {
    const today = new Date()
    let start = new Date()
    const end = today

    switch (preset) {
      case 'today':
        start = new Date(today.setHours(0, 0, 0, 0))
        break
      case 'yesterday':
        start = new Date(today)
        start.setDate(start.getDate() - 1)
        start.setHours(0, 0, 0, 0)
        break
      case 'last7':
        start = new Date(today)
        start.setDate(start.getDate() - 7)
        break
      case 'last30':
        start = new Date(today)
        start.setDate(start.getDate() - 30)
        break
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        end.setDate(0) // Last day of previous month
        break
      default:
        break
    }

    setStartDate(format(start, 'yyyy-MM-dd'))
    setEndDate(format(end, 'yyyy-MM-dd'))
    setSelectedPreset(preset)

    onChange({ start, end })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
      >
        <Calendar className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
        {format(dateRange.start, 'MMM d, yyyy')} - {format(dateRange.end, 'MMM d, yyyy')}
        <ChevronDown className="ml-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button 
                onClick={() => selectPreset('today')}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  selectedPreset === 'today' 
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Today
              </button>
              <button 
                onClick={() => selectPreset('yesterday')}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  selectedPreset === 'yesterday' 
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Yesterday
              </button>
              <button 
                onClick={() => selectPreset('last7')}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  selectedPreset === 'last7' 
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Last 7 Days
              </button>
              <button 
                onClick={() => selectPreset('last30')}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  selectedPreset === 'last30' 
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Last 30 Days
              </button>
              <button 
                onClick={() => selectPreset('thisMonth')}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  selectedPreset === 'thisMonth' 
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                This Month
              </button>
              <button 
                onClick={() => selectPreset('lastMonth')}
                className={`px-3 py-1.5 text-xs font-medium rounded ${
                  selectedPreset === 'lastMonth' 
                    ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Last Month
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="mr-2 inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyDateRange}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

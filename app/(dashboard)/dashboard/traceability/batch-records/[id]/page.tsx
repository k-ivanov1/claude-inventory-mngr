'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  ChevronLeft, 
  CalendarClock, 
  FileCheck,
  PrinterIcon,
  Download,
  Edit,
  Scale
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import Link from 'next/link'

interface BatchRecord {
  id: string
  date: string
  product_id: string
  product_name?: string
  batch_size: number
  batch_started: string
  batch_finished?: string
  scale_id: string
  scale_target_weight: number
  scale_actual_reading: number
  equipment_clean: boolean
  equipment_clean_initials: string
  followed_gmp: boolean
  followed_gmp_initials: string
  bb_date_match: boolean
  bb_date_match_initials: string
  label_compliance: boolean
  label_compliance_initials: string
  checklist_notes: Record<string, string>
  manager_comments?: string
  remedial_actions?: string
  work_undertaken?: string
  created_at: string
  scale_name?: string
}

interface BatchIngredient {
  id: string
  batch_id: string
  raw_material_id: string
  raw_material_name?: string
  batch_number?: string
  best_before_date?: string
  quantity: number
  unit?: string
}

export default function BatchRecordDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [batchRecord, setBatchRecord] = useState<BatchRecord | null>(null)
  const [ingredients, setIngredients] = useState<BatchIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClientComponentClient()
  const batchId = params?.id as string

  useEffect(() => {
    if (batchId) {
      fetchBatchRecord()
    }
  }, [batchId])

  const fetchBatchRecord = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch batch record
      const { data: recordData, error: recordError } = await supabase
        .from('batch_manufacturing_records')
        .select(`
          *,
          products:product_id(name),
          scales:scale_id(description, model)
        `)
        .eq('id', batchId)
        .single()
      
      if (recordError) throw recordError

      if (recordData) {
        const formattedRecord = {
          ...recordData,
          product_name: recordData.products?.name,
          scale_name: recordData.scales?.description + (recordData.scales?.model ? ` (${recordData.scales.model})` : '')
        }
        
        setBatchRecord(formattedRecord)
      }

      // Fetch batch ingredients
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('batch_ingredients')
        .select(`
          *,
          raw_materials:raw_material_id(name, unit)
        `)
        .eq('batch_id', batchId)
      
      if (ingredientsError) throw ingredientsError

      if (ingredientsData) {
        const formattedIngredients = ingredientsData.map(ingredient => ({
          ...ingredient,
          raw_material_name: ingredient.raw_materials?.name,
          unit: ingredient.raw_materials?.unit
        }))
        
        setIngredients(formattedIngredients)
      }
    } catch (error: any) {
      console.error('Error fetching batch record:', error)
      setError('Failed to load batch record. Please try again.')
    } finally {
      setLoading(false)
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

  const printBatchRecord = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading batch record...</div>
      </div>
    )
  }

  if (error || !batchRecord) {
    return (
      <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative" role="alert">
        <span className="block sm:inline">{error || 'Batch record not found'}</span>
        <div className="mt-4">
          <Link href="/dashboard/traceability/batch-records">
            <button className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
              <ChevronLeft className="h-5 w-5" />
              Back to Batch Records
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <Link href="/dashboard/traceability/batch-records">
          <button className="inline-flex items-center gap-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
            <ChevronLeft className="h-5 w-5" />
            Back to Batch Records
          </button>
        </Link>
        <div className="flex items-center gap-x-2">
          <button
            onClick={printBatchRecord}
            className="inline-flex items-center gap-x-2 rounded-md bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <PrinterIcon className="h-5 w-5" />
            Print
          </button>
          <button
            className="inline-flex items-center gap-x-2 rounded-md bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Download className="h-5 w-5" />
            Download PDF
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Batch Manufacturing Record</h2>
        </div>
        <div className="p-6 space-y-8">
          {/* Batch Information Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Batch Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Batch ID</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{batchRecord.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {format(parseISO(batchRecord.date), 'dd/MM/yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Product</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{batchRecord.product_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Batch Size</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{batchRecord.batch_size} kg</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Time</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {formatDateTime(batchRecord.batch_started)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Finish Time</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {batchRecord.batch_finished ? formatDateTime(batchRecord.batch_finished) : 'In progress'}
                </p>
              </div>
            </div>
          </div>

          {/* Scale Verification Section */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              <div className="flex items-center">
                <Scale className="h-5 w-5 mr-2 text-indigo-500" />
                Scale Verification
              </div>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Scale Equipment</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{batchRecord.scale_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Target Weight</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{batchRecord.scale_target_weight} g</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Actual Reading</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{batchRecord.scale_actual_reading} g</p>
              </div>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Ingredients</h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Raw Material</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batch Number</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Best Before Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {ingredients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                        No ingredients found for this batch.
                      </td>
                    </tr>
                  ) : (
                    ingredients.map((ingredient) => (
                      <tr key={ingredient.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {ingredient.raw_material_name || 'Unknown material'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {ingredient.batch_number || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {ingredient.best_before_date ? format(parseISO(ingredient.best_before_date), 'dd/MM/yyyy') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {ingredient.quantity} {ingredient.unit || ''}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Checklist Section */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              <div className="flex items-center">
                <FileCheck className="h-5 w-5 mr-2 text-indigo-500" />
                Compliance Checklist
              </div>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-white">Batch Completion</h4>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md space-y-3">
                  <div>
                    <div className="flex items-start">
                      <div className={`h-5 w-5 rounded-full mr-2 ${
                        batchRecord.equipment_clean ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        Equipment clean after batch completion
                      </p>
                    </div>
                    <p className="ml-7 text-xs text-gray-500 dark:text-gray-400">
                      Initials: {batchRecord.equipment_clean_initials || '-'}
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-start">
                      <div className={`h-5 w-5 rounded-full mr-2 ${
                        batchRecord.followed_gmp ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        Followed GMP (Good Manufacturing Practices)
                      </p>
                    </div>
                    <p className="ml-7 text-xs text-gray-500 dark:text-gray-400">
                      Initials: {batchRecord.followed_gmp_initials || '-'}
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-start">
                      <div className={`h-5 w-5 rounded-full mr-2 ${
                        batchRecord.bb_date_match ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        Best Before date matches product
                      </p>
                    </div>
                    <p className="ml-7 text-xs text-gray-500 dark:text-gray-400">
                      Initials: {batchRecord.bb_date_match_initials || '-'}
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-start">
                      <div className={`h-5 w-5 rounded-full mr-2 ${
                        batchRecord.label_compliance ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white">
                        Label meets all criteria and regulatory compliance
                      </p>
                    </div>
                    <p className="ml-7 text-xs text-gray-500 dark:text-gray-400">
                      Initials: {batchRecord.label_compliance_initials || '-'}
                    </p>
                  </div>
                </div>
              </div>
                
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-white">Label Checklist</h4>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md space-y-3">
                  {[
                    { id: 'product_name_accurate', label: 'Product name accurate' },
                    { id: 'ingredients_listed', label: 'All ingredients listed correctly' },
                    { id: 'net_quantity_displayed', label: 'Net quantity displayed' },
                    { id: 'nutritional_info_present', label: 'Nutritional information present' },
                    { id: 'claims_verified', label: 'Nutritional/health claims verified' }
                  ].map((item) => (
                    <div key={item.id}>
                      <div className="flex items-start">
                        <div className={`h-5 w-5 rounded-full mr-2 ${
                          batchRecord[item.id as keyof typeof batchRecord] ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {item.label}
                        </p>
                      </div>
                      {batchRecord.checklist_notes && batchRecord.checklist_notes[item.id] && (
                        <p className="ml-7 text-xs text-gray-500 dark:text-gray-400">
                          Note: {batchRecord.checklist_notes[item.id]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
            
          {/* Manager's Section */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Manager's Section</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Manager's Comments</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                  {batchRecord.manager_comments || 'No comments provided.'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Remedial Actions</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                  {batchRecord.remedial_actions || 'No remedial actions required.'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Work Undertaken</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                  {batchRecord.work_undertaken || 'No work undertaken recorded.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

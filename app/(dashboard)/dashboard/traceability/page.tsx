'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  CheckCircle2,
  AlertTriangle,
  Scale,
  ClipboardCheck,
  Save,
  X,
  ArrowRight
} from 'lucide-react'
import { format } from 'date-fns'
import BatchInfoForm from '@/components/traceability/batch-info-form'
import BatchChecklistForm from '@/components/traceability/batch-checklist-form'

export default function BatchRecordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [equipment, setEquipment] = useState<any[]>([])
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [batchNumbers, setBatchNumbers] = useState<Record<string, any[]>>({})
  const [finalProducts, setFinalProducts] = useState<any[]>([])
  const [availableStock, setAvailableStock] = useState<Record<string, {quantity: number, total_kg: number}>>({})
  
  // State for batch record and checklist
  const [showChecklist, setShowChecklist] = useState(false)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [infoComplete, setInfoComplete] = useState(false)
  const [checklistComplete, setChecklistComplete] = useState(false)

  // Form data state
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    product_id: '',
    product_batch_number: '',
    product_best_before_date: '',
    bags_count: '0',
    bag_size: '0', // Use this field for "kilograms per bag"
    batch_size: '0',
    batch_started: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    batch_finished: '',
    scale_id: '',
    scale_target_weight: '',
    scale_actual_reading: '',
    ingredients: [
      {
        raw_material_id: '',
        batch_number: '',
        best_before_date: '',
        quantity: ''
      }
    ],
    equipment_clean: false,
    equipment_clean_initials: '',
    followed_gmp: false,
    followed_gmp_initials: '',
    bb_date_match: false,
    bb_date_match_initials: '',
    label_compliance: false,
    label_compliance_initials: '',
    product_name_accurate: false,
    ingredients_listed: false,
    net_quantity_displayed: false,
    nutritional_info_present: false,
    claims_verified: false,
    manufacturer_info: false,
    storage_conditions: false,
    usage_instructions: false,
    provenance_verified: false,
    certifications_valid: false,
    batch_code_applied: false,
    artwork_correct: false,
    text_clear: false,
    packaging_compliant: false,
    regulatory_compliant: false,
    checklist_notes: {} as Record<string, string>,
    manager_comments: '',
    remedial_actions: '',
    work_undertaken: ''
  })

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchEquipment()
    fetchRawMaterials()
    fetchFinalProducts()
    fetchStockTeaCoffee()
  }, [])

  // Check if batch info is complete
  useEffect(() => {
    const isInfoComplete = validateBatchInfo()
    setInfoComplete(isInfoComplete)
  }, [formData])

  // Check if checklist is complete
  useEffect(() => {
    const isChecklistComplete = validateChecklist()
    setChecklistComplete(isChecklistComplete)
  }, [formData])

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('status', 'active')
        .order('description')

      if (error) throw error

      const azextraEquipment = data?.find(item =>
        item.description.toLowerCase().includes('azextra') ||
        item.model?.toLowerCase().includes('azextra')
      )

      if (azextraEquipment) {
        setFormData(prev => ({
          ...prev,
          scale_id: azextraEquipment.id
        }))
      }

      setEquipment(data || [])
    } catch (error: any) {
      console.error('Error fetching equipment:', error)
      setError('Failed to load equipment. Please try again.')
    }
  }

  const fetchRawMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      setRawMaterials(data || [])
    } catch (error: any) {
      console.error('Error fetching raw materials:', error)
      setError('Failed to load raw materials. Please try again.')
    }
  }

  const fetchStockTeaCoffee = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_tea_coffee')
        .select('*')
        .eq('is_accepted', true)

      if (error) throw error

      // Group stock by product_name and batch_number
      const batchesByProduct: Record<string, any[]> = {}
      const stockQuantities: Record<string, {quantity: number, total_kg: number}> = {}

      data?.forEach(stock => {
        if (stock.product_name) {
          // Create stock key for batch numbers
          if (!batchesByProduct[stock.product_name]) {
            batchesByProduct[stock.product_name] = []
          }
          
          // Check if this batch already exists in our array
          const existingBatchIndex = batchesByProduct[stock.product_name].findIndex(
            b => b.batch_number === stock.batch_number
          )
          
          if (existingBatchIndex === -1 && stock.batch_number) {
            batchesByProduct[stock.product_name].push({
              batch_number: stock.batch_number,
              best_before_date: stock.best_before_date || '',
              available_quantity: stock.quantity || 0,
              available_kg: stock.total_kg || 0
            })
          } else if (existingBatchIndex !== -1 && stock.batch_number) {
            // Add to the available quantity if the batch already exists
            batchesByProduct[stock.product_name][existingBatchIndex].available_quantity += (stock.quantity || 0)
            batchesByProduct[stock.product_name][existingBatchIndex].available_kg += (stock.total_kg || 0)
          }
          
          // Track total available stock by product_name + batch_number
          const stockKey = `${stock.product_name}-${stock.batch_number || 'unknown'}`
          if (!stockQuantities[stockKey]) {
            stockQuantities[stockKey] = { quantity: 0, total_kg: 0 }
          }
          stockQuantities[stockKey].quantity += (stock.quantity || 0)
          stockQuantities[stockKey].total_kg += (stock.total_kg || 0)
        }
      })
      
      setBatchNumbers(batchesByProduct)
      setAvailableStock(stockQuantities)
    } catch (error: any) {
      console.error('Error fetching stock data:', error)
      setError('Failed to load stock data. Please try again.')
    }
  }

  const fetchFinalProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('final_products')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      setFinalProducts(data || [])
    } catch (error: any) {
      console.error('Error fetching final products:', error)
      setError('Failed to load final products. Please try again.')
    }
  }

  const validateBatchInfo = () => {
    // Basic validation for batch information
    if (!formData.product_id) return false
    if (!formData.product_batch_number) return false
    if (!formData.product_best_before_date) return false
    if (!formData.batch_started) return false
    if (!formData.scale_id) return false
    if (!formData.scale_target_weight) return false
    if (!formData.scale_actual_reading) return false
    
    // Check bag values
    if (parseFloat(formData.bags_count) <= 0) return false
    if (parseFloat(formData.bag_size) <= 0) return false
    
    // Check if at least one ingredient is valid
    const hasValidIngredient = formData.ingredients.some(
      ing => ing.raw_material_id && ing.quantity && parseFloat(ing.quantity) > 0
    )
    
    return hasValidIngredient
  }

  const validateChecklist = () => {
    // Basic validation for checklist - checking completion of the main checklist items
    return formData.equipment_clean && 
           formData.followed_gmp && 
           formData.bb_date_match && 
           formData.label_compliance
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement
      setFormData({ ...formData, [name]: target.checked })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const updateIngredient = (index: number, field: string, value: string) => {
    const updatedIngredients = [...formData.ingredients]
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      [field]: value
    }
    
    // If the raw material is changed, reset batch number and best before date
    if (field === 'raw_material_id') {
      updatedIngredients[index].batch_number = ''
      updatedIngredients[index].best_before_date = ''
    }
    
    // If batch number is changed, update best before date if available
    if (field === 'batch_number' && value && updatedIngredients[index].raw_material_id) {
      // Find the raw material name
      const rawMaterial = rawMaterials.find(m => m.id === updatedIngredients[index].raw_material_id)
      if (rawMaterial && rawMaterial.name) {
        // Find the batch info in our batchNumbers state
        const batches = batchNumbers[rawMaterial.name] || []
        const selectedBatch = batches.find(b => b.batch_number === value)
        
        if (selectedBatch && selectedBatch.best_before_date) {
          updatedIngredients[index].best_before_date = selectedBatch.best_before_date
        }
      }
    }
    
    setFormData({ ...formData, ingredients: updatedIngredients })
  }

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [
        ...formData.ingredients,
        { raw_material_id: '', batch_number: '', best_before_date: '', quantity: '' }
      ]
    })
  }

  const removeIngredient = (index: number) => {
    const updatedIngredients = [...formData.ingredients]
    updatedIngredients.splice(index, 1)
    if (updatedIngredients.length === 0) {
      updatedIngredients.push({ raw_material_id: '', batch_number: '', best_before_date: '', quantity: '' })
    }
    setFormData({ ...formData, ingredients: updatedIngredients })
  }

  const updateChecklistNote = (checklistItem: string, note: string) => {
    setFormData({
      ...formData,
      checklist_notes: {
        ...formData.checklist_notes,
        [checklistItem]: note
      }
    })
  }

  // Save batch information first
  const saveBatchInfo = async () => {
    if (!validateBatchInfo()) {
      setError('Please complete all required batch information fields')
      return null
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Calculate batch size from bags_count and bag_size
      const bags = parseFloat(formData.bags_count) || 0
      const bagSize = parseFloat(formData.bag_size) || 0
      const calculatedBatchSize = bags * bagSize

      // Create batch record with minimal info - we'll update with checklist later
      const { data: batchData, error: batchError } = await supabase
        .from('batch_manufacturing_records')
        .insert({
          date: formData.date,
          product_id: formData.product_id,
          product_batch_number: formData.product_batch_number,
          product_best_before_date: formData.product_best_before_date,
          bags_count: parseInt(formData.bags_count) || 0,
          bag_size: parseFloat(formData.bag_size) || 0,
          batch_size: calculatedBatchSize,
          batch_started: formData.batch_started,
          batch_finished: formData.batch_finished || null,
          scale_id: formData.scale_id,
          scale_target_weight: parseFloat(formData.scale_target_weight),
          scale_actual_reading: parseFloat(formData.scale_actual_reading)
        })
        .select('id')
      
      if (batchError) throw batchError

      const batchId = batchData?.[0]?.id
      if (batchId) {
        const validIngredients = formData.ingredients
          .filter(ing => ing.raw_material_id && ing.quantity)
        
        const batchIngredients = validIngredients.map(ing => ({
          batch_id: batchId,
          raw_material_id: ing.raw_material_id,
          batch_number: ing.batch_number || null,
          best_before_date: ing.best_before_date || null,
          quantity: parseFloat(ing.quantity)
        }))

        if (batchIngredients.length > 0) {
          const { error: ingredientsError } = await supabase
            .from('batch_ingredients')
            .insert(batchIngredients)
          
          if (ingredientsError) throw ingredientsError
        }
        
        return batchId
      }
      return null
    } catch (error: any) {
      console.error('Error saving batch record:', error)
      setError(error.message || 'Failed to save batch record. Please try again.')
      return null
    } finally {
      setLoading(false)
    }
  }
  
  // Update with checklist info
  const saveChecklist = async () => {
    if (!batchId) {
      setError('Batch ID is missing. Cannot save checklist.')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const { error: updateError } = await supabase
        .from('batch_manufacturing_records')
        .update({
          equipment_clean: formData.equipment_clean,
          equipment_clean_initials: formData.equipment_clean_initials,
          followed_gmp: formData.followed_gmp,
          followed_gmp_initials: formData.followed_gmp_initials,
          bb_date_match: formData.bb_date_match,
          bb_date_match_initials: formData.bb_date_match_initials,
          label_compliance: formData.label_compliance,
          label_compliance_initials: formData.label_compliance_initials,
          product_name_accurate: formData.product_name_accurate,
          ingredients_listed: formData.ingredients_listed,
          net_quantity_displayed: formData.net_quantity_displayed,
          nutritional_info_present: formData.nutritional_info_present,
          claims_verified: formData.claims_verified,
          manufacturer_info: formData.manufacturer_info,
          storage_conditions: formData.storage_conditions,
          usage_instructions: formData.usage_instructions,
          provenance_verified: formData.provenance_verified,
          certifications_valid: formData.certifications_valid,
          batch_code_applied: formData.batch_code_applied,
          artwork_correct: formData.artwork_correct,
          text_clear: formData.text_clear,
          packaging_compliant: formData.packaging_compliant,
          regulatory_compliant: formData.regulatory_compliant,
          checklist_notes: formData.checklist_notes,
          manager_comments: formData.manager_comments,
          remedial_actions: formData.remedial_actions,
          work_undertaken: formData.work_undertaken
        })
        .eq('id', batchId)
      
      if (updateError) throw updateError
      
      setSuccess(true)
      
      // Wait a moment to show success message before redirecting
      setTimeout(() => {
        router.push('/dashboard/traceability/batch-records')
      }, 3000)
    } catch (error: any) {
      console.error('Error saving checklist:', error)
      setError(error.message || 'Failed to save checklist. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle initial form submission - save batch info and show checklist
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = await saveBatchInfo()
    if (id) {
      setBatchId(id)
      setShowChecklist(true)
    }
  }

  // Complete the batch with checklist
  const handleCompleteChecklist = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveChecklist()
  }

  // Get maximum available quantity for a specific raw material and batch (in KG)
  const getMaxAvailableQuantity = (rawMaterialId: string, batchNumber: string): number => {
    if (!rawMaterialId || !batchNumber) return 0
    
    const rawMaterial = rawMaterials.find(m => m.id === rawMaterialId)
    if (!rawMaterial || !rawMaterial.name) return 0
    
    const stockKey = `${rawMaterial.name}-${batchNumber}`
    return availableStock[stockKey]?.total_kg || 0
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Batch Manufacturing Record</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Create a new batch manufacturing record for traceability
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative" role="alert">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-3 rounded relative" role="alert">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            <span className="block sm:inline">Batch record saved successfully! Redirecting to batch records list...</span>
          </div>
        </div>
      )}

      {/* Batch Info Form */}
      {!showChecklist && (
        <form onSubmit={handleCreateBatch}>
          <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl overflow-hidden">
            <div className="p-6">
              <BatchInfoForm
                formData={formData}
                handleInputChange={handleInputChange}
                updateIngredient={updateIngredient}
                addIngredient={addIngredient}
                removeIngredient={removeIngredient}
                equipment={equipment}
                rawMaterials={rawMaterials}
                batchNumbers={batchNumbers}
                finalProducts={finalProducts}
                getMaxAvailableQuantity={getMaxAvailableQuantity}
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                type="submit"
                disabled={loading || !infoComplete}
                className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Create Batch Record'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Checklist Modal */}
      {showChecklist && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium">Complete Batch Record Checklist</h3>
              <button 
                onClick={() => setShowChecklist(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCompleteChecklist}>
              <div className="p-5">
                <BatchChecklistForm
                  formData={formData}
                  handleInputChange={handleInputChange}
                  updateChecklistNote={updateChecklistNote}
                />
              </div>
              
              <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                <button
                  type="button"
                  onClick={() => setShowChecklist(false)}
                  className="inline-flex items-center rounded-md bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Complete Batch Record'}
                  <Save className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

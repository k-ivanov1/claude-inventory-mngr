'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  Scale,
  ClipboardCheck
} from 'lucide-react'
import { format } from 'date-fns'
import BatchInfoForm from '@/components/traceability/batch-info-form'
import BatchChecklistForm from '@/components/traceability/batch-checklist-form'

const steps = [
  { id: 'batch-info', name: 'Batch Information', icon: Scale },
  { id: 'checklist', name: 'Product Checklist', icon: ClipboardCheck },
]

export default function BatchRecordPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [equipment, setEquipment] = useState<any[]>([])
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [batchNumbers, setBatchNumbers] = useState<Record<string, any[]>>({})
  const [finalProducts, setFinalProducts] = useState<any[]>([])
  const [availableStock, setAvailableStock] = useState<Record<string, number>>({})

  // UPDATED: Removed the kg_per_bag field; now using only bag_size
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
      const stockQuantities: Record<string, number> = {}

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
              available_quantity: stock.quantity || 0
            })
          } else if (existingBatchIndex !== -1 && stock.batch_number) {
            // Add to the available quantity if the batch already exists
            batchesByProduct[stock.product_name][existingBatchIndex].available_quantity += (stock.quantity || 0)
          }
          
          // Track total available stock by product_name + batch_number
          const stockKey = `${stock.product_name}-${stock.batch_number || 'unknown'}`
          if (!stockQuantities[stockKey]) {
            stockQuantities[stockKey] = 0
          }
          stockQuantities[stockKey] += (stock.quantity || 0)
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

  const validateFirstStep = () => {
    if (!formData.product_id) return false
    if (parseFloat(formData.batch_size) <= 0) return false
    if (!formData.batch_started) return false
    if (!formData.scale_id) return false
    if (!formData.scale_target_weight) return false
    if (!formData.scale_actual_reading) return false

    const hasValidIngredient = formData.ingredients.some(
      ing => ing.raw_material_id && ing.quantity
    )
    return hasValidIngredient
  }

  const validateSecondStep = () => {
    // Basic validation for checklist
    return true
  }

  const handleNext = () => {
    if (currentStep === 0 && !validateFirstStep()) {
      setError('Please fill all required fields before proceeding')
      return
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1))
    setError(null)
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
    setError(null)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // If we're on the first step, just move to the next step
    if (currentStep === 0) {
      handleNext()
      return
    }
    
    // Only proceed with form submission if we're on the last step
    if (currentStep !== steps.length - 1) {
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const numericProductId = parseInt(formData.product_id)
      const productId = isNaN(numericProductId) ? formData.product_id : numericProductId

      // Calculate batch size from bags_count and bag_size
      const bags = parseFloat(formData.bags_count) || 0
      const bagSize = parseFloat(formData.bag_size) || 0
      const calculatedBatchSize = bags * bagSize

      // Create batch record
      const { data: batchData, error: batchError } = await supabase
        .from('batch_manufacturing_records')
        .insert({
          date: formData.date,
          product_id: productId,
          product_batch_number: formData.product_batch_number,
          product_best_before_date: formData.product_best_before_date,
          bags_count: parseInt(formData.bags_count) || 0,
          bag_size: parseFloat(formData.bag_size) || 0,
          batch_size: calculatedBatchSize,
          batch_started: formData.batch_started,
          batch_finished: formData.batch_finished || null,
          scale_id: formData.scale_id,
          scale_target_weight: parseFloat(formData.scale_target_weight),
          scale_actual_reading: parseFloat(formData.scale_actual_reading),
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
      }
      
      setSuccess(true)
      
      // Wait a moment to show success message before redirecting
      setTimeout(() => {
        router.push('/dashboard/traceability/batch-records')
      }, 3000)
    } catch (error: any) {
      console.error('Error saving batch record:', error)
      setError(error.message || 'Failed to save batch record. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Get maximum available quantity for a specific raw material and batch
  const getMaxAvailableQuantity = (rawMaterialId: string, batchNumber: string): number => {
    if (!rawMaterialId || !batchNumber) return 0
    
    const rawMaterial = rawMaterials.find(m => m.id === rawMaterialId)
    if (!rawMaterial || !rawMaterial.name) return 0
    
    const stockKey = `${rawMaterial.name}-${batchNumber}`
    return availableStock[stockKey] || 0
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

      {/* Steps */}
      <nav aria-label="Progress">
        <ol role="list" className="flex items-center">
          {steps.map((step, index) => (
            <li key={step.id} className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                {index !== steps.length - 1 && (
                  <div className={`h-0.5 w-full ${currentStep > index ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
              <div 
                className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                  currentStep > index 
                    ? 'bg-indigo-600 dark:bg-indigo-400' 
                    : currentStep === index 
                    ? 'bg-indigo-600 dark:bg-indigo-400' 
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {currentStep > index ? (
                  <CheckCircle2 className="h-5 w-5 text-white" aria-hidden="true" />
                ) : (
                  <step.icon className="h-5 w-5 text-white" aria-hidden="true" />
                )}
                <span className="sr-only">{step.name}</span>
              </div>
              <div className="mt-2 hidden sm:block">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{step.name}</span>
              </div>
            </li>
          ))}
        </ol>
      </nav>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl overflow-hidden">
          <div className="p-6">
            {currentStep === 0 ? (
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
            ) : (
              <BatchChecklistForm
                formData={formData}
                handleInputChange={handleInputChange}
                updateChecklistNote={updateChecklistNote}
              />
            )}
          </div>
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`rounded-md px-3.5 py-2.5 text-sm font-semibold shadow-sm ${
                currentStep === 0
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Previous
            </button>
            <div>
              {currentStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || success}
                  className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Batch Record'}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
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
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [equipment, setEquipment] = useState<any[]>([])
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [batchNumbers, setBatchNumbers] = useState<Record<string, string[]>>({})
  
  // Form data state
  const [formData, setFormData] = useState({
    // General batch info
    date: format(new Date(), 'yyyy-MM-dd'),
    product_id: '',
    batch_size: '',
    batch_started: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
    batch_finished: '',
    
    // Scale verification
    scale_id: '',
    scale_target_weight: '',
    scale_actual_reading: '',
    
    // Ingredients
    ingredients: [{ 
      raw_material_id: '', 
      batch_number: '', 
      best_before_date: '', 
      quantity: '' 
    }],
    
    // Checklists
    equipment_clean: false,
    equipment_clean_initials: '',
    followed_gmp: false,
    followed_gmp_initials: '',
    bb_date_match: false,
    bb_date_match_initials: '',
    label_compliance: false,
    label_compliance_initials: '',
    
    // Label checklist items
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
    
    // Notes for each checklist item
    checklist_notes: {} as Record<string, string>,
    
    // Manager section
    manager_comments: '',
    remedial_actions: '',
    work_undertaken: ''
  })
  
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchEquipment()
    fetchRawMaterials()
  }, [])

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('status', 'active')
        .order('description')
      
      if (error) throw error
      
      // Find the AZextra equipment and set it as default
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
      
      // Fetch available batch numbers for each raw material
      await fetchBatchNumbers(data || [])
      
    } catch (error: any) {
      console.error('Error fetching raw materials:', error)
      setError('Failed to load raw materials. Please try again.')
    }
  }

  const fetchBatchNumbers = async (materials: any[]) => {
    try {
      // Get batch numbers from stock entries
      const { data, error } = await supabase
        .from('stock_tea_coffee')
        .select('*')
        .eq('is_accepted', true)
      
      if (error) throw error
      
      // Organize batch numbers by product name
      const batchesByProduct: Record<string, string[]> = {}
      
      data?.forEach(stock => {
        if (stock.batch_number && stock.product_name) {
          if (!batchesByProduct[stock.product_name]) {
            batchesByProduct[stock.product_name] = []
          }
          
          // Only add if it's not already in the array
          if (!batchesByProduct[stock.product_name].includes(stock.batch_number)) {
            batchesByProduct[stock.product_name].push(stock.batch_number)
          }
        }
      })
      
      setBatchNumbers(batchesByProduct)
      
    } catch (error: any) {
      console.error('Error fetching batch numbers:', error)
      setError('Failed to load batch numbers. Please try again.')
    }
  }

  const validateFirstStep = () => {
    // Check if all required fields in step 1 are filled
    if (!formData.product_id) return false
    if (!formData.batch_size) return false
    if (!formData.batch_started) return false
    if (!formData.scale_id) return false
    if (!formData.scale_target_weight) return false
    if (!formData.scale_actual_reading) return false
    
    // Check if at least one ingredient is properly filled
    const hasValidIngredient = formData.ingredients.some(
      ing => ing.raw_material_id && ing.quantity
    )
    
    return hasValidIngredient
  }

  const handleNext = () => {
    // Validate first step
    if (currentStep === 0 && !validateFirstStep()) {
      setError('Please fill all required fields before proceeding')
      return
    }
    
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
    setError(null)
  }

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
    setError(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement
      setFormData({
        ...formData,
        [name]: target.checked
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const updateIngredient = (index: number, field: string, value: string) => {
    const updatedIngredients = [...formData.ingredients]
    updatedIngredients[index] = { 
      ...updatedIngredients[index], 
      [field]: value 
    }
    
    // If raw_material_id changes, reset batch_number
    if (field === 'raw_material_id') {
      updatedIngredients[index].batch_number = ''
      
      // Set best before date if available
      const rawMaterial = rawMaterials.find(m => m.id === value)
      if (rawMaterial?.best_before_date) {
        updatedIngredients[index].best_before_date = rawMaterial.best_before_date
      } else {
        updatedIngredients[index].best_before_date = ''
      }
    }
    
    setFormData({
      ...formData,
      ingredients: updatedIngredients
    })
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
    
    // Make sure we always have at least one ingredient
    if (updatedIngredients.length === 0) {
      updatedIngredients.push({ raw_material_id: '', batch_number: '', best_before_date: '', quantity: '' })
    }
    
    setFormData({
      ...formData,
      ingredients: updatedIngredients
    })
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
    setLoading(true)
    setError(null)
    
    try {
      // Create batch record
      const { data: batchData, error: batchError } = await supabase
        .from('batch_manufacturing_records')
        .insert({
          date: formData.date,
          product_id: formData.product_id,
          batch_size: parseFloat(formData.batch_size),
          batch_started: formData.batch_started,
          batch_finished: formData.batch_finished,
          scale_id: formData.scale_id,
          scale_target_weight: parseFloat(formData.scale_target_weight),
          scale_actual_reading: parseFloat(formData.scale_actual_reading),
          // Checklist data
          equipment_clean: formData.equipment_clean,
          equipment_clean_initials: formData.equipment_clean_initials,
          followed_gmp: formData.followed_gmp,
          followed_gmp_initials: formData.followed_gmp_initials,
          bb_date_match: formData.bb_date_match,
          bb_date_match_initials: formData.bb_date_match_initials,
          label_compliance: formData.label_compliance,
          label_compliance_initials: formData.label_compliance_initials,
          // Label checklist
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
          // Checklist notes as JSON
          checklist_notes: formData.checklist_notes,
          // Manager section
          manager_comments: formData.manager_comments,
          remedial_actions: formData.remedial_actions,
          work_undertaken: formData.work_undertaken
        })
        .select('id')
      
      if (batchError) throw batchError
      
      const batchId = batchData?.[0]?.id
      
      // Add batch ingredients
      if (batchId) {
        const batchIngredients = formData.ingredients
          .filter(ing => ing.raw_material_id && ing.quantity)
          .map(ing => ({
            batch_id: batchId,
            raw_material_id: ing.raw_material_id,
            batch_number: ing.batch_number || null,
            best_before_date: ing.best_before_date || null,
            quantity: parseFloat(ing.quantity)
          }))
        
        const { error: ingredientsError } = await supabase
          .from('batch_ingredients')
          .insert(batchIngredients)
        
        if (ingredientsError) throw ingredientsError
      }
      
      setSuccess(true)
      
      // Reset form after successful submission
      setTimeout(() => {
        window.location.href = '/dashboard/traceability/batch-records'
      }, 2000)
      
    } catch (error: any) {
      console.error('Error saving batch record:', error)
      setError(error.message || 'Failed to save batch record. Please try again.')
    } finally {
      setLoading(false)
    }
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
            <span className="block sm:inline">Batch record saved successfully!</span>
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
          {/* Step content */}
          <div className="p-6">
            {currentStep === 0 && (
              <BatchInfoForm 
                formData={formData}
                handleInputChange={handleInputChange}
                updateIngredient={updateIngredient}
                addIngredient={addIngredient}
                removeIngredient={removeIngredient}
                equipment={equipment}
                rawMaterials={rawMaterials}
                batchNumbers={batchNumbers}
              />
            )}
            
            {currentStep === 1 && (
              <BatchChecklistForm 
                formData={formData}
                handleInputChange={handleInputChange}
                updateChecklistNote={updateChecklistNote}
              />
            )}
          </div>
          
          {/* Form actions */}
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
                  disabled={loading}
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

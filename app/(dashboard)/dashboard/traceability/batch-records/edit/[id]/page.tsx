'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ChevronLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import BatchInfoForm from '../../../../../../../components/traceability/batch-info-form'
import BatchChecklistForm from '../../../../../../../components/traceability/batch-checklist-form'
import { useBatchInventoryIntegration } from '@/lib/hooks/use-batch-inventory-integration'

export default function EditBatchRecordPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [equipment, setEquipment] = useState<any[]>([])
  const [rawMaterials, setRawMaterials] = useState<any[]>([])
  const [batchNumbers, setBatchNumbers] = useState<Record<string, any[]>>({})
  const [finalProducts, setFinalProducts] = useState<any[]>([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('info') // 'info' or 'checklist'

  // Initialize the batch inventory integration hook
  useBatchInventoryIntegration();

  const [formData, setFormData] = useState({
    date: '',
    product_id: '',
    product_batch_number: '',
    product_best_before_date: '',
    bags_count: '',
    bag_size: '',
    batch_size: '',
    batch_started: '',
    batch_finished: '',
    scale_id: '',
    scale_target_weight: '',
    scale_actual_reading: '',
    ingredients: [] as any[],
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
  const batchId = params?.id as string

  useEffect(() => {
    if (batchId) {
      fetchReferenceData().then(() => {
        fetchBatchRecord()
      })
    }
  }, [batchId])

  const fetchReferenceData = async () => {
    try {
      // Fetch equipment
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select('*')
        .order('description')
      
      if (equipmentError) throw equipmentError
      setEquipment(equipmentData || [])

      // Fetch raw materials
      const { data: materialsData, error: materialsError } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name')
      
      if (materialsError) throw materialsError
      setRawMaterials(materialsData || [])

      // Fetch batch numbers for materials from stock_receiving table
      const { data: stockData, error: stockError } = await supabase
        .from('stock_receiving')
        .select('*')
        .eq('is_accepted', true)
      
      if (stockError) throw stockError
      
      // Group stock by material name and batch number
      const stockByMaterial: Record<string, any[]> = {}
      for (const material of materialsData || []) {
        // Find all stock entries for this material
        const materialStock = stockData?.filter(
          item => item.item_type === 'raw_material' && item.item_id === material.id
        ) || []
        
        // Get unique batch numbers and available quantities
        const uniqueBatches = materialStock.reduce((acc: any[], current: any) => {
          const exists = acc.find(item => item.batch_number === current.batch_number)
          if (!exists) {
            acc.push({
              batch_number: current.batch_number,
              best_before_date: current.best_before_date,
              available_kg: current.quantity
            })
          } else {
            // If batch exists, update the available quantity
            exists.available_kg += current.quantity
          }
          return acc
        }, [])
        
        stockByMaterial[material.name] = uniqueBatches
      }
      
      setBatchNumbers(stockByMaterial)

      // Fetch final products
      const { data: productsData, error: productsError } = await supabase
        .from('final_products')
        .select('*')
        .order('name')
      
      if (productsError) throw productsError
      setFinalProducts(productsData || [])
    } catch (error) {
      console.error('Error fetching reference data:', error)
      setError('Failed to load reference data. Please refresh the page.')
    }
  }

  const fetchBatchRecord = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch batch record
      const { data: recordData, error: recordError } = await supabase
        .from('batch_manufacturing_records')
        .select('*')
        .eq('id', batchId)
        .single()
      
      if (recordError) throw recordError

      // Fetch batch ingredients
      const { data: ingredientsData, error: ingredientsError } = await supabase
        .from('batch_ingredients')
        .select('*')
        .eq('batch_id', batchId)
      
      if (ingredientsError) throw ingredientsError

      // Format the data for the form
      const formattedData = {
        ...formData,
        ...recordData,
        date: recordData.date || '',
        product_id: recordData.product_id || '',
        product_batch_number: recordData.product_batch_number || '',
        product_best_before_date: recordData.product_best_before_date || '',
        bags_count: recordData.bags_count?.toString() || '',
        bag_size: recordData.bag_size?.toString() || '',
        batch_size: recordData.batch_size?.toString() || '',
        batch_started: recordData.batch_started ? new Date(recordData.batch_started).toISOString().slice(0, 16) : '',
        batch_finished: recordData.batch_finished ? new Date(recordData.batch_finished).toISOString().slice(0, 16) : '',
        scale_id: recordData.scale_id || '',
        scale_target_weight: recordData.scale_target_weight?.toString() || '',
        scale_actual_reading: recordData.scale_actual_reading?.toString() || '',
        equipment_clean: recordData.equipment_clean || false,
        equipment_clean_initials: recordData.equipment_clean_initials || '',
        followed_gmp: recordData.followed_gmp || false,
        followed_gmp_initials: recordData.followed_gmp_initials || '',
        bb_date_match: recordData.bb_date_match || false,
        bb_date_match_initials: recordData.bb_date_match_initials || '',
        label_compliance: recordData.label_compliance || false,
        label_compliance_initials: recordData.label_compliance_initials || '',
        product_name_accurate: recordData.product_name_accurate || false,
        ingredients_listed: recordData.ingredients_listed || false,
        net_quantity_displayed: recordData.net_quantity_displayed || false,
        nutritional_info_present: recordData.nutritional_info_present || false,
        claims_verified: recordData.claims_verified || false,
        manufacturer_info: recordData.manufacturer_info || false,
        storage_conditions: recordData.storage_conditions || false,
        usage_instructions: recordData.usage_instructions || false,
        provenance_verified: recordData.provenance_verified || false,
        certifications_valid: recordData.certifications_valid || false,
        batch_code_applied: recordData.batch_code_applied || false,
        artwork_correct: recordData.artwork_correct || false,
        text_clear: recordData.text_clear || false,
        packaging_compliant: recordData.packaging_compliant || false,
        regulatory_compliant: recordData.regulatory_compliant || false,
        checklist_notes: recordData.checklist_notes || {},
        manager_comments: recordData.manager_comments || '',
        remedial_actions: recordData.remedial_actions || '',
        work_undertaken: recordData.work_undertaken || '',
        ingredients: (ingredientsData || []).map(ingredient => ({
          raw_material_id: ingredient.raw_material_id || '',
          batch_number: ingredient.batch_number || '',
          best_before_date: ingredient.best_before_date || '',
          quantity: ingredient.quantity?.toString() || ''
        }))
      }

      // If no ingredients, add an empty one
      if (formattedData.ingredients.length === 0) {
        formattedData.ingredients.push({
          raw_material_id: '',
          batch_number: '',
          best_before_date: '',
          quantity: ''
        })
      }

      setFormData(formattedData)
    } catch (error) {
      console.error('Error fetching batch record:', error)
      setError('Failed to load batch record. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const updateIngredient = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const updatedIngredients = [...prev.ingredients]
      updatedIngredients[index] = { ...updatedIngredients[index], [field]: value }
      
      return { ...prev, ingredients: updatedIngredients }
    })
  }

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        {
          raw_material_id: '',
          batch_number: '',
          best_before_date: '',
          quantity: ''
        }
      ]
    }))
  }

  const removeIngredient = (index: number) => {
    setFormData(prev => {
      const updatedIngredients = [...prev.ingredients]
      updatedIngredients.splice(index, 1)
      return { ...prev, ingredients: updatedIngredients }
    })
  }

  const updateChecklistNote = (checklistItem: string, note: string) => {
    setFormData(prev => ({
      ...prev,
      checklist_notes: {
        ...prev.checklist_notes,
        [checklistItem]: note
      }
    }))
  }

  const getMaxAvailableQuantity = (rawMaterialId: string, batchNumber: string): number => {
    if (!rawMaterialId || !batchNumber) return 0
    
    const material = rawMaterials.find(m => m.id === rawMaterialId)
    if (!material || !batchNumbers[material.name]) return 0
    
    const batch = batchNumbers[material.name].find(b => b.batch_number === batchNumber)
    return batch ? (batch.available_kg || 0) : 0
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)
    
    try {
      // Validate form data
      if (!formData.date || !formData.product_id || !formData.batch_size) {
        setError('Please fill in all required fields.')
        setSaving(false)
        return
      }

      // Format the data for saving
      const batchData = {
        date: formData.date,
        product_id: formData.product_id,
        product_batch_number: formData.product_batch_number,
        product_best_before_date: formData.product_best_before_date,
        bags_count: formData.bags_count ? parseInt(formData.bags_count) : null,
        bag_size: formData.bag_size ? parseFloat(formData.bag_size) : null,
        batch_size: formData.batch_size ? parseFloat(formData.batch_size) : null,
        batch_started: formData.batch_started,
        batch_finished: formData.batch_finished || null,
        scale_id: formData.scale_id,
        scale_target_weight: formData.scale_target_weight ? parseFloat(formData.scale_target_weight) : null,
        scale_actual_reading: formData.scale_actual_reading ? parseFloat(formData.scale_actual_reading) : null,
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
      }

      // Get original batch data for comparison to determine inventory changes
      const { data: originalBatch, error: originalError } = await supabase
        .from('batch_manufacturing_records')
        .select('bags_count, batch_finished, product_id')
        .eq('id', batchId)
        .single()
      
      if (originalError) throw originalError

      // Update the batch record
      const { error: updateError } = await supabase
        .from('batch_manufacturing_records')
        .update(batchData)
        .eq('id', batchId)
      
      if (updateError) throw updateError

      // Handle ingredients - first delete existing ingredients
      const { error: deleteIngredientsError } = await supabase
        .from('batch_ingredients')
        .delete()
        .eq('batch_id', batchId)
      
      if (deleteIngredientsError) throw deleteIngredientsError

      // Then insert new ingredients
      if (formData.ingredients.length > 0) {
        const ingredientsToInsert = formData.ingredients
          .filter(ingredient => ingredient.raw_material_id && ingredient.quantity) // Only include valid ingredients
          .map(ingredient => ({
            batch_id: batchId,
            raw_material_id: ingredient.raw_material_id,
            batch_number: ingredient.batch_number,
            best_before_date: ingredient.best_before_date,
            quantity: ingredient.quantity ? parseFloat(ingredient.quantity) : 0
          }))

        if (ingredientsToInsert.length > 0) {
          const { error: insertIngredientsError } = await supabase
            .from('batch_ingredients')
            .insert(ingredientsToInsert)
          
          if (insertIngredientsError) throw insertIngredientsError
          
          // Update inventory for each ingredient
          for (const ingredient of ingredientsToInsert) {
            const material = rawMaterials.find(m => m.id === ingredient.raw_material_id)
            if (!material) continue
            
            // Find inventory record for this material
            const { data: inventoryItem } = await supabase
              .from('inventory')
              .select('*')
              .eq('product_name', material.name)
              .maybeSingle()
              
            if (inventoryItem) {
              // Reduce inventory by ingredient quantity
              await supabase
                .from('inventory')
                .update({
                  stock_level: Math.max(0, inventoryItem.stock_level - ingredient.quantity),
                  last_updated: new Date().toISOString()
                })
                .eq('id', inventoryItem.id)
              
              // Create inventory movement record
              await supabase
                .from('inventory_movements')
                .insert({
                  inventory_id: inventoryItem.id,
                  movement_type: 'manufacturing_consume',
                  quantity: -ingredient.quantity, // Negative for consumption
                  reference_id: batchId,
                  reference_type: 'batch',
                  notes: `Used in batch ${formData.product_batch_number}`,
                  created_at: new Date().toISOString()
                })
            }
          }
        }
      }
      
      // Handle final product inventory changes
      if (
        // If batch was marked as finished in this update
        (!originalBatch.batch_finished && formData.batch_finished) || 
        // Or if the number of bags changed for a finished batch
        (originalBatch.batch_finished && originalBatch.bags_count !== parseInt(formData.bags_count))
      ) {
        // Get the product
        const { data: product } = await supabase
          .from('final_products')
          .select('*')
          .eq('id', formData.product_id)
          .single()
          
        if (product) {
          // Find inventory for this final product
          const { data: finalProductInventory } = await supabase
            .from('inventory')
            .select('*')
            .eq('product_name', product.name)
            .eq('is_final_product', true)
            .maybeSingle()
            
          const bagsProduced = parseInt(formData.bags_count) || 0
          const previousBags = originalBatch.bags_count || 0
          const bagsDifference = bagsProduced - previousBags
            
          if (finalProductInventory) {
            // Update existing inventory
            await supabase
              .from('inventory')
              .update({
                stock_level: Math.max(0, finalProductInventory.stock_level + bagsDifference),
                last_updated: new Date().toISOString()
              })
              .eq('id', finalProductInventory.id)
              
            // Create inventory movement record
            await supabase
              .from('inventory_movements')
              .insert({
                inventory_id: finalProductInventory.id,
                movement_type: 'manufacturing_produce',
                quantity: bagsDifference,
                reference_id: batchId,
                reference_type: 'batch',
                notes: `Produced in batch ${formData.product_batch_number}`,
                created_at: new Date().toISOString()
              })
          } else {
            // Create new inventory entry
            const { data: newInventory, error: insertError } = await supabase
              .from('inventory')
              .insert({
                product_name: product.name,
                sku: product.sku || generateSKU(product.category || 'prod'),
                category: product.category || 'finished_product',
                stock_level: bagsProduced,
                unit: 'bag',
                unit_price: product.unit_selling_price || 0,
                reorder_point: 5, // Default
                is_recipe_based: true,
                is_final_product: true,
                last_updated: new Date().toISOString()
              })
              .select()
              
            if (insertError) throw insertError
            
            // Create inventory movement
            if (newInventory && newInventory.length > 0) {
              await supabase
                .from('inventory_movements')
                .insert({
                  inventory_id: newInventory[0].id,
                  movement_type: 'manufacturing_produce',
                  quantity: bagsProduced,
                  reference_id: batchId,
                  reference_type: 'batch',
                  notes: `Initial production in batch ${formData.product_batch_number}`,
                  created_at: new Date().toISOString()
                })
            }
          }
        }
      }

      setSuccessMessage('Batch record updated successfully!')
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null)
      }, 5000)
    } catch (error) {
      console.error('Error updating batch record:', error)
      setError('Failed to update batch record. Please try again.')
    } finally {
      setSaving(false)
    }
  }
  
  // Helper function to generate SKU
  const generateSKU = (category: string) => {
    const prefix = category.substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString().substring(9, 13)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    
    return `${prefix}-${timestamp}${random}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/traceability/batch-records">
          <button className="inline-flex items-center gap-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
            <ChevronLeft className="h-5 w-5" />
            Back to Batch Records
          </button>
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{successMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <span className="ml-2 text-gray-600 dark:text-gray-300">Loading batch record...</span>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl overflow-hidden">
          <div className="px-4 py-6 sm:px-6">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                className={`px-4 py-2 font-medium text-sm border-b-2 ${
                  activeTab === 'info'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('info')}
              >
                Batch Information
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm border-b-2 ${
                  activeTab === 'checklist'
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab('checklist')}
              >
                Compliance Checklist
              </button>
            </div>

            <div className="mt-6">
              {activeTab === 'info' ? (
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
          </div>
        </div>
      )}
    </div>
  )
}

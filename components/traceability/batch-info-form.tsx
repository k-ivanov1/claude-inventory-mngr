'use client'

import React from 'react'
import { Plus, Trash2 } from 'lucide-react'

export interface BatchInfoFormProps {
  formData: {
    date: string
    product_id: string
    product_batch_number: string
    product_best_before_date: string
    bags_count: string
    bag_size: string
    batch_size: string
    batch_started: string
    batch_finished: string
    scale_id: string
    scale_target_weight: string
    scale_actual_reading: string
    ingredients: {
      raw_material_id: string
      batch_number: string
      best_before_date: string
      quantity: string
    }[]
    equipment_clean: boolean
    equipment_clean_initials: string
    followed_gmp: boolean
    followed_gmp_initials: string
    bb_date_match: boolean
    bb_date_match_initials: string
    label_compliance: boolean
    label_compliance_initials: string
    product_name_accurate: boolean
    ingredients_listed: boolean
    net_quantity_displayed: boolean
    nutritional_info_present: boolean
    claims_verified: boolean
    manufacturer_info: boolean
    storage_conditions: boolean
    usage_instructions: boolean
    provenance_verified: boolean
    certifications_valid: boolean
    batch_code_applied: boolean
    artwork_correct: boolean
    text_clear: boolean
    packaging_compliant: boolean
    regulatory_compliant: boolean
    checklist_notes: Record<string, string>
    manager_comments: string
    remedial_actions: string
    work_undertaken: string
  }
  handleInputChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => void
  updateIngredient: (index: number, field: string, value: string) => void
  addIngredient: () => void
  removeIngredient: (index: number) => void
  equipment: any[]
  rawMaterials: any[]
  batchNumbers: Record<string, string[]>
  finalProducts: any[]
}

const BatchInfoForm: React.FC<BatchInfoFormProps> = ({
  formData,
  handleInputChange,
  updateIngredient,
  addIngredient,
  removeIngredient,
  equipment,
  rawMaterials,
  batchNumbers,
  finalProducts
}) => {
  // Calculate total batch size using bags_count and bag_size
  const calculateTotalBatchSize = () => {
    const bags = parseFloat(formData.bags_count) || 0
    const bagSize = parseFloat(formData.bag_size) || 0
    return (bags * bagSize).toFixed(2)
  }

  // When a batch number is changed for an ingredient, update the field and fetch best_before_date
  const handleBatchNumberChange = async (index: number, batchNumber: string) => {
    updateIngredient(index, 'batch_number', batchNumber)
    const ingredient = formData.ingredients[index]
    const rawMaterialId = ingredient.raw_material_id
    if (!rawMaterialId || !batchNumber) return

    // Example: query your 'stock_receiving' table for best_before_date.
    // Adjust the query as needed for your schema.
    // Here we assume you have an imported supabase client.
    // For example:
    // const { data, error } = await supabase
    //   .from('stock_receiving')
    //   .select('best_before_date')
    //   .eq('raw_material_id', rawMaterialId)
    //   .eq('batch_number', batchNumber)
    //   .single()
    // if (!error && data) {
    //   updateIngredient(index, 'best_before_date', data.best_before_date)
    // }
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Batch Information</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Enter the general information about this batch.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date *</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>
        {/* Product Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product *</label>
          <select
            name="product_id"
            value={formData.product_id}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          >
            <option value="">Select a product</option>
            {finalProducts?.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
        {/* Product Batch Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Batch Number *</label>
          <input
            type="text"
            name="product_batch_number"
            value={formData.product_batch_number}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>
        {/* Product Best Before Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Best Before Date *</label>
          <input
            type="date"
            name="product_best_before_date"
            value={formData.product_best_before_date}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>
        {/* Number of Bags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Number of Bags *</label>
          <input
            type="number"
            name="bags_count"
            value={formData.bags_count}
            onChange={handleInputChange}
            step="1"
            min="0"
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>
        {/* Kilograms per Bag (using bag_size) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kilograms per Bag *</label>
          <input
            type="number"
            name="bag_size"
            value={formData.bag_size}
            onChange={handleInputChange}
            step="0.001"
            min="0"
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>
        {/* Total Batch Size (calculated) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Batch Size (kg)</label>
          <input
            type="number"
            name="batch_size"
            value={calculateTotalBatchSize()}
            readOnly
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Calculated: {formData.bags_count || 0} bags x {formData.bag_size || 0} kg = {calculateTotalBatchSize()} kg
          </p>
        </div>
        {/* Batch Started (Date & Time) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Batch Started (Date & Time) *</label>
          <input
            type="datetime-local"
            name="batch_started"
            value={formData.batch_started}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          />
        </div>
        {/* Batch Finished (Date & Time) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Batch Finished (Date & Time)</label>
          <input
            type="datetime-local"
            name="batch_finished"
            value={formData.batch_finished}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Scale Verification Section */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scale Verification</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Verify the scale used for this batch.</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Scale Equipment *</label>
            <select
              name="scale_id"
              value={formData.scale_id}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            >
              <option value="">Select scale</option>
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.description} {item.model ? `(${item.model})` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Default: AZextra scale</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Scale Target Weight (g) *</label>
            <input
              type="number"
              name="scale_target_weight"
              value={formData.scale_target_weight}
              onChange={handleInputChange}
              step="0.001"
              min="0"
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Actual Reading (g) *</label>
            <input
              type="number"
              name="scale_actual_reading"
              value={formData.scale_actual_reading}
              onChange={handleInputChange}
              step="0.001"
              min="0"
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>
        </div>
      </div>

      {/* Ingredients Section */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ingredients</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Add ingredients used in this batch.</p>
          </div>
          <button
            type="button"
            onClick={addIngredient}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Ingredient
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {formData.ingredients.map((ingredient: any, index: number) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 border border-gray-200 dark:border-gray-700 rounded-md">
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Raw Material *</label>
                <select
                  value={ingredient.raw_material_id}
                  onChange={(e) => updateIngredient(index, 'raw_material_id', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="">Select raw material</option>
                  {rawMaterials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.name} ({material.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Batch Number</label>
                <select
                  value={ingredient.batch_number}
                  onChange={(e) => {
                    // When selecting a batch number, trigger best before date retrieval.
                    handleBatchNumberChange(index, e.target.value)
                  }}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={!ingredient.raw_material_id}
                >
                  <option value="">Select batch number</option>
                  {ingredient.raw_material_id &&
                    (batchNumbers[rawMaterials.find(m => m.id === ingredient.raw_material_id)?.name] || []).map((batchNumber: string) => (
                      <option key={batchNumber} value={batchNumber}>
                        {batchNumber}
                      </option>
                    ))
                  }
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Best Before Date</label>
                <input
                  type="date"
                  value={ingredient.best_before_date || ''}
                  onChange={(e) => updateIngredient(index, 'best_before_date', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity *</label>
                <input
                  type="number"
                  value={ingredient.quantity}
                  onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                  step="0.001"
                  min="0"
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>

              <div className="md:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                  title="Remove ingredient"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default BatchInfoForm

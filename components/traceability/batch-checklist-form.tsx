import React from 'react'

interface BatchChecklistFormProps {
  formData: any
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  updateChecklistNote: (checklistItem: string, note: string) => void
}

export default function BatchChecklistForm({
  formData,
  handleInputChange,
  updateChecklistNote
}: BatchChecklistFormProps) {
  // Batch Completion Checklist
  const completionChecklist = [
    {
      id: 'equipment_clean',
      label: 'Is the equipment clean after the batch is completed?',
      checked: formData.equipment_clean,
      initials: formData.equipment_clean_initials,
      initialsField: 'equipment_clean_initials'
    },
    {
      id: 'followed_gmp',
      label: 'Was the batch manufactured following GMP (Good Manufacturing Practices)?',
      checked: formData.followed_gmp,
      initials: formData.followed_gmp_initials,
      initialsField: 'followed_gmp_initials'
    },
    {
      id: 'bb_date_match',
      label: 'Does the Best Before (BB) date match the BB date on the product?',
      checked: formData.bb_date_match,
      initials: formData.bb_date_match_initials,
      initialsField: 'bb_date_match_initials'
    },
    {
      id: 'label_compliance',
      label: 'Does the label meet all criteria from the Labeling Procedure (Ref: 1.12) and comply with all regulations?',
      checked: formData.label_compliance,
      initials: formData.label_compliance_initials,
      initialsField: 'label_compliance_initials'
    }
  ]

  // Product Label Checklist
  const labelChecklist = [
    {
      id: 'product_name_accurate',
      label: 'The product name accurately describes the product and is prominently displayed.',
      checked: formData.product_name_accurate,
      notes: formData.checklist_notes?.product_name_accurate || ''
    },
    {
      id: 'ingredients_listed',
      label: 'All ingredients are listed in descending order by weight and correctly declared.',
      checked: formData.ingredients_listed,
      notes: formData.checklist_notes?.ingredients_listed || ''
    },
    {
      id: 'net_quantity_displayed',
      label: 'The net quantity of contents is displayed.',
      checked: formData.net_quantity_displayed,
      notes: formData.checklist_notes?.net_quantity_displayed || ''
    },
    {
      id: 'nutritional_info_present',
      label: 'Nutritional information is present and accurate.',
      checked: formData.nutritional_info_present,
      notes: formData.checklist_notes?.nutritional_info_present || ''
    },
    {
      id: 'claims_verified',
      label: 'Any nutritional or health claims are verified and compliant with regulations.',
      checked: formData.claims_verified,
      notes: formData.checklist_notes?.claims_verified || ''
    },
    {
      id: 'manufacturer_info',
      label: 'The name and address of the manufacturer, packer, or distributor are present.',
      checked: formData.manufacturer_info,
      notes: formData.checklist_notes?.manufacturer_info || ''
    },
    {
      id: 'storage_conditions',
      label: 'Proper storage conditions are specified.',
      checked: formData.storage_conditions,
      notes: formData.checklist_notes?.storage_conditions || ''
    },
    {
      id: 'usage_instructions',
      label: 'Usage instructions (if necessary) are clearly stated.',
      checked: formData.usage_instructions,
      notes: formData.checklist_notes?.usage_instructions || ''
    },
    {
      id: 'provenance_verified',
      label: 'Any claims regarding provenance are verified and documented.',
      checked: formData.provenance_verified,
      notes: formData.checklist_notes?.provenance_verified || ''
    },
    {
      id: 'certifications_valid',
      label: 'Any certifications (Organic, Halal, Kosher, etc.) are valid and displayed appropriately.',
      checked: formData.certifications_valid,
      notes: formData.checklist_notes?.certifications_valid || ''
    },
    {
      id: 'batch_code_applied',
      label: 'Batch code/date coding is accurately applied.',
      checked: formData.batch_code_applied,
      notes: formData.checklist_notes?.batch_code_applied || ''
    },
    {
      id: 'artwork_correct',
      label: 'The artwork is correctly oriented and positioned.',
      checked: formData.artwork_correct,
      notes: formData.checklist_notes?.artwork_correct || ''
    },
    {
      id: 'text_clear',
      label: 'All text and images are clear and legible.',
      checked: formData.text_clear,
      notes: formData.checklist_notes?.text_clear || ''
    },
    {
      id: 'packaging_compliant',
      label: 'Packaging material is suitable and compliant with regulations.',
      checked: formData.packaging_compliant,
      notes: formData.checklist_notes?.packaging_compliant || ''
    },
    {
      id: 'regulatory_compliant',
      label: 'The label is fully compliant with local, national, and international regulations.',
      checked: formData.regulatory_compliant,
      notes: formData.checklist_notes?.regulatory_compliant || ''
    }
  ]

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Product Labeling & Compliance Checklist</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Complete the following checklists to ensure labeling compliance.
        </p>
      </div>

      {/* Batch Completion Checklist */}
      <div>
        <h4 className="text-md font-medium text-gray-900 dark:text-white">Batch Completion Checklist</h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Check each item and add your initials to confirm.
        </p>
        <div className="mt-4 space-y-6">
          {completionChecklist.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="flex items-start flex-1">
                <div className="flex h-5 items-center">
                  <input
                    id={item.id}
                    name={item.id}
                    type="checkbox"
                    checked={item.checked}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor={item.id} className="font-medium text-gray-900 dark:text-white">
                    {item.label}
                  </label>
                </div>
              </div>
              <div className="w-full sm:w-1/4">
                <input
                  type="text"
                  name={item.initialsField}
                  value={item.initials}
                  onChange={handleInputChange}
                  placeholder="Initials"
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Label Checklist */}
      <div>
        <h4 className="text-md font-medium text-gray-900 dark:text-white">Product Label Checklist</h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Check each item and add any necessary notes.
        </p>
        <div className="mt-4 space-y-6">
          {labelChecklist.map((item) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
              <div className="flex items-start flex-1">
                <div className="flex h-5 items-center">
                  <input
                    id={item.id}
                    name={item.id}
                    type="checkbox"
                    checked={item.checked}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor={item.id} className="font-medium text-gray-900 dark:text-white">
                    {item.label}
                  </label>
                </div>
              </div>
              <div className="w-full sm:w-1/3">
                <input
                  type="text"
                  placeholder="Notes"
                  value={item.notes}
                  onChange={(e) => updateChecklistNote(item.id, e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manager’s Section */}
      <div>
        <h4 className="text-md font-medium text-gray-900 dark:text-white">Manager’s Section</h4>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Manager’s Comments
            </label>
            <textarea
              name="manager_comments"
              value={formData.manager_comments}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Remedial Actions
            </label>
            <textarea
              name="remedial_actions"
              value={formData.remedial_actions}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Work Undertaken
            </label>
            <textarea
              name="work_undertaken"
              value={formData.work_undertaken}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

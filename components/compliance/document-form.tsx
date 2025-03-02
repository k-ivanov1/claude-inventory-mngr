// components/compliance/document-form.tsx

'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  X, 
  Plus, 
  Calendar,
  FileText,
  Award
} from 'lucide-react'
import { ComplianceDocument, DocumentCategory, DocumentVersion, AccreditationType } from '@/lib/types/compliance'

interface DocumentFormProps {
  document?: ComplianceDocument | null
  categories: DocumentCategory[]
  isAccreditation?: boolean
  accreditationTypes?: AccreditationType[]
  onClose: () => void
  onSave: () => void
}

export function DocumentForm({ 
  document, 
  categories, 
  isAccreditation = false,
  accreditationTypes = [],
  onClose, 
  onSave 
}: DocumentFormProps) {
  const [formData, setFormData] = useState<ComplianceDocument>({
    title: '',
    document_number: '',
    category_id: '',
    content: '',
    status: 'draft',
    is_accreditation: isAccreditation,
    accreditation_type: '',
    expiry_date: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(!!document)
  const [changesSummary, setChangesSummary] = useState('')
  
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (document) {
      setFormData({
        ...document,
        // Ensure these fields are set even if not in the document
        category_id: document.category_id || '',
        content: document.content || '',
        accreditation_type: document.accreditation_type || '',
        expiry_date: document.expiry_date || ''
      })
    } else {
      // Set default for new document
      setFormData(prev => ({
        ...prev,
        is_accreditation: isAccreditation,
        // Auto-generate document number
        document_number: generateDocumentNumber(isAccreditation)
      }))
    }
  }, [document, isAccreditation])

  const generateDocumentNumber = (isAccreditation: boolean) => {
    const prefix = isAccreditation ? 'CERT-' : 'DOC-'
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    
    return `${prefix}${year}${month}-${random}`
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checkboxInput = e.target as HTMLInputElement
      setFormData({ ...formData, [name]: checkboxInput.checked })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const now = new Date().toISOString()
      
      // Validate required fields
      if (!formData.title || !formData.document_number) {
        throw new Error('Title and document number are required.')
      }
      
      if (!isAccreditation && !formData.category_id) {
        throw new Error('Please select a category for this document.')
      }
      
      if (isAccreditation && !formData.accreditation_type) {
        throw new Error('Please select an accreditation type.')
      }
      
      // Prepare document data
      const documentData: ComplianceDocument = {
        ...formData,
        last_updated: now
      }
      
      // For accreditations, category_id is not required
      if (isAccreditation) {
        documentData.category_id = 'accreditations' // Use a default category
      }
      
      let documentId: string | undefined = document?.id

      if (isEditing && documentId) {
        // Update existing document
        const { error: updateError } = await supabase
          .from('compliance_documents')
          .update({
            title: documentData.title,
            document_number: documentData.document_number,
            category_id: documentData.category_id,
            content: documentData.content,
            status: documentData.status,
            last_updated: documentData.last_updated,
            current_version: (document.current_version || 1) + 1,
            is_accreditation: documentData.is_accreditation,
            accreditation_type: documentData.accreditation_type,
            expiry_date: documentData.expiry_date
          })
          .eq('id', documentId)
        
        if (updateError) throw updateError
      } else {
        // Insert new document
        const { data: newDoc, error: insertError } = await supabase
          .from('compliance_documents')
          .insert({
            title: documentData.title,
            document_number: documentData.document_number,
            category_id: documentData.category_id,
            content: documentData.content,
            status: documentData.status,
            created_at: now,
            last_updated: now,
            current_version: 1,
            is_accreditation: documentData.is_accreditation,
            accreditation_type: documentData.accreditation_type,
            expiry_date: documentData.expiry_date
          })
          .select()
        
        if (insertError) throw insertError
        documentId = newDoc[0]?.id
      }

      // If editing, create a version record
      if (isEditing && documentId) {
        // Check if we need to increment the version (only if content changed)
        const needsNewVersion = document?.content !== formData.content || changesSummary
        
        if (needsNewVersion) {
          const versionData: DocumentVersion = {
            document_id: documentId,
            version_number: (document?.current_version || 1) + 1,
            content: formData.content,
            changes: changesSummary || 'Updated document',
            previous_version: document?.current_version || 1
          }
          
          const { error: versionError } = await supabase
            .from('document_versions')
            .insert(versionData)
          
          if (versionError) throw versionError
        }
      }

      onSave()
    } catch (error: any) {
      console.error('Error saving document:', error)
      setError(error.message || 'Failed to save document. Please try again.')
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
            {isEditing ? 'Edit' : 'New'} {isAccreditation ? 'Accreditation' : 'Document'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Document Number
              </label>
              <input
                type="text"
                name="document_number"
                value={formData.document_number}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            {isAccreditation ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Accreditation Type
                </label>
                <select
                  name="accreditation_type"
                  value={formData.accreditation_type}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="">Select a type</option>
                  {accreditationTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {isAccreditation && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Expiry Date
                </label>
                <input
                  type="date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            )}

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Content
              </label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={10}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {isEditing && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Changes Summary
                </label>
                <textarea
                  name="changesSummary"
                  value={changesSummary}
                  onChange={(e) => setChangesSummary(e.target.value)}
                  rows={2}
                  placeholder="Describe the changes made to this document..."
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-x-3">
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
              {loading ? 'Saving...' : isEditing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

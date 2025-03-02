'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Plus, 
  Search, 
  Award, 
  CalendarClock, 
  FileCheck,
  AlertTriangle,
  Download,
  Clock,
  Edit2,
  Trash2
} from 'lucide-react'
import { ComplianceDocument, AccreditationType } from '@/lib/types/compliance'
import { format, parseISO, isBefore, addDays } from 'date-fns'
import { DocumentForm } from '@/components/compliance/document-form'

export default function AccreditationsPage() {
  const [documents, setDocuments] = useState<ComplianceDocument[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<ComplianceDocument[]>([])
  const [accreditationTypes, setAccreditationTypes] = useState<AccreditationType[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingDocument, setEditingDocument] = useState<ComplianceDocument | null>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchAccreditations()
    fetchAccreditationTypes()
  }, [])

  useEffect(() => {
    let result = documents
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(doc => 
        doc.title.toLowerCase().includes(term) || 
        doc.document_number.toLowerCase().includes(term) ||
        doc.accreditation_type?.toLowerCase().includes(term)
      )
    }
    
    // Apply type filter
    if (selectedType !== 'all') {
      result = result.filter(doc => doc.accreditation_type === selectedType)
    }
    
    setFilteredDocuments(result)
  }, [searchTerm, selectedType, documents])

  const fetchAccreditations = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('compliance_documents')
        .select('*')
        .eq('is_accreditation', true)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setDocuments(data || [])
    } catch (error: any) {
      console.error('Error fetching accreditations:', error)
      setError('Failed to load accreditations. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchAccreditationTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('accreditation_types')
        .select('*')
        .order('name')
      
      if (error) throw error
      
      setAccreditationTypes(data || [])
    } catch (error: any) {
      console.error('Error fetching accreditation types:', error)
      setError('Failed to load accreditation types. Please try again.')
      
      // Set default types in case of error
      setAccreditationTypes([
        { id: '1', name: 'ISO 9001', description: 'Quality Management System' },
        { id: '2', name: 'BRCGS', description: 'Global Standard for Food Safety' },
        { id: '3', name: 'SALSA', description: 'Food Safety Certification' },
        { id: '4', name: 'Organic', description: 'Organic Certification' },
      ])
    }
  }

  const getExpiryStatus = (expiryDate: string | undefined) => {
    if (!expiryDate) return 'unknown'
    
    const today = new Date()
    const expiry = parseISO(expiryDate)
    
    if (isBefore(expiry, today)) {
      return 'expired'
    }
    
    // Warning if less than 90 days until expiry
    if (isBefore(expiry, addDays(today, 90))) {
      return 'warning'
    }
    
    return 'valid'
  }

  const renderExpiryBadge = (expiryDate: string | undefined) => {
    const status = getExpiryStatus(expiryDate)
    
    let className = ''
    let text = ''
    let Icon = Clock
    
    switch (status) {
      case 'expired':
        className = 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        text = 'Expired'
        Icon = AlertTriangle
        break
      case 'warning':
        className = 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
        text = `Expires ${expiryDate ? format(parseISO(expiryDate), 'MMM d, yyyy') : ''}`
        Icon = CalendarClock
        break
      case 'valid':
        className = 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
        text = `Valid until ${expiryDate ? format(parseISO(expiryDate), 'MMM d, yyyy') : ''}`
        Icon = FileCheck
        break
      default:
        className = 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        text = 'No expiry date'
        Icon = Clock
    }
    
    return (
      <span className={`inline-flex items-center gap-x-1 rounded-md px-2 py-1 text-xs font-medium ${className}`}>
        <Icon className="h-3 w-3" />
        {text}
      </span>
    )
  }

  const handleDeleteDocument = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this accreditation? This action cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('compliance_documents')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        // Refresh documents list
        fetchAccreditations()
      } catch (error: any) {
        console.error('Error deleting accreditation:', error)
        setError('Failed to delete accreditation. Please try again.')
      }
    }
  }

  const handleDocumentSaved = () => {
    setShowForm(false)
    setEditingDocument(null)
    fetchAccreditations()
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
          <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <title>Close</title>
              <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.03a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/>
            </svg>
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">3rd Party Accreditations</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Manage compliance certificates and accreditations
          </p>
        </div>
        <button
          onClick={() => {
            setEditingDocument(null)
            setShowForm(true)
          }}
          className="inline-flex items-center gap-x-2 rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="h-5 w-5" />
          Add Accreditation
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search accreditations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border dark:border-gray-700 border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="block w-full rounded-md border dark:border-gray-700 border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="all">All Accreditation Types</option>
            {accreditationTypes.map((type) => (
              <option key={type.id} value={type.name}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-8">
            <div className="text-gray-500 dark:text-gray-400">Loading accreditations...</div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="col-span-full flex justify-center py-8">
            <div className="text-gray-500 dark:text-gray-400">No accreditations found.</div>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center">
                  <Award className="h-5 w-5 text-indigo-500 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">{doc.accreditation_type}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setEditingDocument(doc)
                      setShowForm(true)
                    }}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                    title="Edit accreditation"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(doc.id!)}
                    className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    title="Delete accreditation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">{doc.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Doc #: {doc.document_number}</p>
                </div>
                
                <div className="flex flex-col gap-y-2">
                  <div>
                    {renderExpiryBadge(doc.expiry_date)}
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Last updated: {doc.last_updated ? format(parseISO(doc.last_updated), 'MMM d, yyyy') : 'N/A'}
                  </div>
                  
                  <div className="mt-2">
                    <button className="inline-flex items-center gap-x-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300">
                      <Download className="h-4 w-4" />
                      Download Certificate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Document Form Modal */}
      {showForm && (
        <DocumentForm
          document={editingDocument}
          categories={[]}
          isAccreditation={true}
          accreditationTypes={accreditationTypes}
          onClose={() => {
            setShowForm(false)
            setEditingDocument(null)
          }}
          onSave={handleDocumentSaved}
        />
      )}
    </div>
  )
}

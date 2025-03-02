'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  File, 
  Folder, 
  FileText,
  Calendar,
  Clock,
  Edit2,
  Trash2
} from 'lucide-react'
import { ComplianceDocument, DocumentCategory } from '@/lib/types/compliance'
import { format, parseISO } from 'date-fns'
import { DocumentForm } from '@/components/compliance/document-form'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<ComplianceDocument[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<ComplianceDocument[]>([])
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingDocument, setEditingDocument] = useState<ComplianceDocument | null>(null)

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchDocuments()
    fetchCategories()
  }, [])

  useEffect(() => {
    let result = documents
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(doc => 
        doc.title.toLowerCase().includes(term) || 
        doc.document_number.toLowerCase().includes(term)
      )
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      result = result.filter(doc => doc.category_id === selectedCategory)
    }
    
    setFilteredDocuments(result)
  }, [searchTerm, selectedCategory, documents])

  const fetchDocuments = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('compliance_documents')
        .select(`
          *,
          categories:document_categories(name)
        `)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Format data with category name
      const formattedDocs = (data || []).map(doc => ({
        ...doc,
        category_name: doc.categories?.name
      }))
      
      setDocuments(formattedDocs)
    } catch (error: any) {
      console.error('Error fetching documents:', error)
      setError('Failed to load documents. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .order('name')
      
      if (error) throw error
      
      setCategories(data || [])
    } catch (error: any) {
      console.error('Error fetching categories:', error)
      setError('Failed to load categories. Please try again.')
    }
  }

  const handleDeleteDocument = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('compliance_documents')
          .delete()
          .eq('id', id)
        
        if (error) throw error
        
        // Refresh documents list
        fetchDocuments()
      } catch (error: any) {
        console.error('Error deleting document:', error)
        setError('Failed to delete document. Please try again.')
      }
    }
  }

  const handleDocumentSaved = () => {
    setShowForm(false)
    setEditingDocument(null)
    fetchDocuments()
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Compliance Documents</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Manage and track all compliance and policy documents
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
          Add Document
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by document title or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border dark:border-gray-700 border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className="inline-flex items-center rounded-md border dark:border-gray-700 border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Filter className="h-4 w-4 mr-2" />
            Categories
            <ChevronDown className="h-4 w-4 ml-2" />
          </button>
          {showCategoryFilter && (
            <div className="absolute z-10 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1" role="menu" aria-orientation="vertical">
                <button
                  onClick={() => {
                    setSelectedCategory('all')
                    setShowCategoryFilter(false)
                  }}
                  className={`w-full text-left block px-4 py-2 text-sm ${
                    selectedCategory === 'all' 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' 
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  All Categories
                </button>
                
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id!)
                      setShowCategoryFilter(false)
                    }}
                    className={`w-full text-left block px-4 py-2 text-sm ${
                      selectedCategory === category.id 
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' 
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Document Number</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Version</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Updated</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading documents...
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No documents found.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-indigo-500" />
                        {doc.document_number}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {doc.title}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Folder className="h-4 w-4 mr-2 text-blue-500" />
                        {doc.category_name || 'Uncategorized'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      v{doc.current_version || 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {doc.last_updated ? format(parseISO(doc.last_updated), 'MMM d, yyyy') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        doc.status === 'published' 
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                          : doc.status === 'draft' 
                          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            setEditingDocument(doc)
                            setShowForm(true)
                          }}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                          title="Edit document"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id!)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Form Modal */}
      {showForm && (
        <DocumentForm
          document={editingDocument}
          categories={categories}
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

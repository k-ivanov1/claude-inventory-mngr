'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Search, 
  FileText, 
  Calendar,
  Clock,
  ArrowUpDown,
  History,
  Users,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { DocumentVersion, ComplianceDocument } from '@/lib/types/compliance'
import { format, parseISO } from 'date-fns'
import { VersionHistory } from '@/components/compliance/version-history'

export default function VersionsPage() {
  const [documents, setDocuments] = useState<ComplianceDocument[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<ComplianceDocument[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null)
  const [versions, setVersions] = useState<Record<string, DocumentVersion[]>>({})
  const [sortField, setSortField] = useState<string>('last_updated')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchDocuments()
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
    
    // Apply sort
    result = [...result].sort((a, b) => {
      if (sortField === 'last_updated') {
        const dateA = a.last_updated ? new Date(a.last_updated).getTime() : 0
        const dateB = b.last_updated ? new Date(b.last_updated).getTime() : 0
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA
      } else if (sortField === 'current_version') {
        const versionA = a.current_version || 1
        const versionB = b.current_version || 1
        return sortDirection === 'asc' ? versionA - versionB : versionB - versionA
      } else if (sortField === 'title') {
        return sortDirection === 'asc' 
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      } else {
        return 0
      }
    })
    
    setFilteredDocuments(result)
  }, [searchTerm, documents, sortField, sortDirection])

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

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleDocumentExpand = async (docId: string) => {
    if (expandedDocId === docId) {
      setExpandedDocId(null)
      return
    }
    
    setExpandedDocId(docId)
    
    // Only fetch versions if we don't already have them
    if (!versions[docId]) {
      try {
        const { data, error } = await supabase
          .from('document_versions')
          .select('*')
          .eq('document_id', docId)
          .order('version_number', { ascending: false })
        
        if (error) throw error
        
        setVersions(prev => ({
          ...prev,
          [docId]: data || []
        }))
      } catch (error: any) {
        console.error('Error fetching document versions:', error)
        setError('Failed to load document versions. Please try again.')
      }
    }
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />
    return sortDirection === 'asc' 
      ? <ChevronDown className="h-4 w-4 ml-1" />
      : <ChevronRight className="h-4 w-4 ml-1" />
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

      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Document Version Control</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Track document history and changes over time
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border dark:border-gray-700 border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-100"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-900/5 dark:ring-gray-700 sm:rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Document Number
                </th>
                <th scope="col" 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('title')}
                >
                  <div className="flex items-center">
                    Title
                    {getSortIcon('title')}
                  </div>
                </th>
                <th scope="col" 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('current_version')}
                >
                  <div className="flex items-center">
                    Current Version
                    {getSortIcon('current_version')}
                  </div>
                </th>
                <th scope="col" 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('last_updated')}
                >
                  <div className="flex items-center">
                    Last Updated
                    {getSortIcon('last_updated')}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading documents...
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No documents found.
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <>
                    <tr 
                      key={doc.id} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                        expandedDocId === doc.id ? 'bg-gray-50 dark:bg-gray-700' : ''
                      }`}
                      onClick={() => toggleDocumentExpand(doc.id!)}
                    >
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
                    </tr>
                    {expandedDocId === doc.id && (
                      <tr>
                        {expandedDocId === doc.id && (
                      <tr>
                        <td colSpan={5} className="px-0 py-0">
                          <div className="bg-gray-50 dark:bg-gray-900 p-4 border-t border-b border-gray-200 dark:border-gray-700">
                            <div className="mb-2 flex items-center">
                              <History className="h-5 w-5 mr-2 text-indigo-500" />
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Version History</h4>
                            </div>
                            
                            {versions[doc.id!]?.length ? (
                              <VersionHistory versions={versions[doc.id!]} documentId={doc.id!} />
                            ) : (
                              <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">
                                Loading version history...
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

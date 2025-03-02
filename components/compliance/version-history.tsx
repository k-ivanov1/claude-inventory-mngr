'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  ChevronRight, 
  ChevronDown, 
  Download, 
  ArrowLeft, 
  ArrowRight,
  History,
  Clock
} from 'lucide-react'
import { DocumentVersion } from '@/lib/types/compliance'
import { format, parseISO } from 'date-fns'

interface VersionHistoryProps {
  versions: DocumentVersion[]
  documentId: string
}

export function VersionHistory({ versions, documentId }: VersionHistoryProps) {
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareVersions, setCompareVersions] = useState<[number, number] | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClientComponentClient()

  const toggleVersion = (versionNumber: number) => {
    setExpandedVersion(prev => prev === versionNumber ? null : versionNumber)
  }

  const handleCompare = (version1: number, version2: number) => {
    if (version1 === version2) {
      setError('Cannot compare a version with itself')
      return
    }
    
    setCompareVersions([Math.max(version1, version2), Math.min(version1, version2)])
    setCompareMode(true)
  }

  const exitCompareMode = () => {
    setCompareMode(false)
    setCompareVersions(null)
  }

  const getDiffHighlight = (text1: string, text2: string): JSX.Element => {
    if (!text1 || !text2) return <div>{text1 || text2}</div>
    
    // This is a very simplistic diff implementation
    // In a production environment, you would use a proper diff library
    const words1 = text1.split(/\s+/)
    const words2 = text2.split(/\s+/)
    
    const diff: JSX.Element[] = []
    let i = 0, j = 0
    
    while (i < words1.length && j < words2.length) {
      if (words1[i] === words2[j]) {
        diff.push(<span key={`${i}-${j}`}>{words1[i]} </span>)
        i++
        j++
      } else {
        // Find the next match
        let found = false
        let iOffset = 0
        let jOffset = 0
        
        // Try to find the next matching word
        const maxLookahead = 3
        let bestMatch = -1
        
        for (let k = 1; k <= maxLookahead && i + k < words1.length; k++) {
          if (words1[i + k] === words2[j]) {
            bestMatch = k
            break
          }
        }
        
        if (bestMatch > 0) {
          // Words were removed in the newer version
          for (let k = 0; k < bestMatch; k++) {
            diff.push(<span key={`removed-${i + k}`} className="bg-red-100 dark:bg-red-900 line-through">{words1[i + k]} </span>)
          }
          i += bestMatch
        } else {
          // Words were added in the newer version
          diff.push(<span key={`added-${j}`} className="bg-green-100 dark:bg-green-900">{words2[j]} </span>)
          j++
        }
      }
    }
    
    // Add remaining words
    while (i < words1.length) {
      diff.push(<span key={`removed-end-${i}`} className="bg-red-100 dark:bg-red-900 line-through">{words1[i]} </span>)
      i++
    }
    
    while (j < words2.length) {
      diff.push(<span key={`added-end-${j}`} className="bg-green-100 dark:bg-green-900">{words2[j]} </span>)
      j++
    }
    
    return <div>{diff}</div>
  }

  const renderVersionContent = (version: DocumentVersion) => {
    if (compareMode && compareVersions) {
      const [newerVersion, olderVersion] = compareVersions
      
      if (version.version_number !== newerVersion) {
        return null
      }
      
      const olderVersionData = versions.find(v => v.version_number === olderVersion)
      
      if (!olderVersionData) {
        return <div className="text-red-600 dark:text-red-400">Error: Comparison version not found</div>
      }
      
      return (
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              <div className="flex items-center">
                <History className="h-4 w-4 mr-1 text-indigo-500" />
                <span>Comparing v{olderVersion} </span>
                <ArrowRight className="mx-2 h-4 w-4" />
                <span>v{newerVersion}</span>
              </div>
            </div>
            <button
              onClick={exitCompareMode}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              Exit Comparison
            </button>
          </div>
          
          <div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {getDiffHighlight(olderVersionData.content, version.content)}
          </div>
        </div>
      )
    }
    
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
        {version.content}
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
      
      {compareMode && compareVersions ? (
        <div>
          {versions.map((version) => {
            if (version.version_number === compareVersions[0]) {
              return (
                <div key={version.id} className="mb-4">
                  {renderVersionContent(version)}
                </div>
              )
            }
            return null
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {versions.map((version) => (
            <div key={version.id} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
              <div 
                className="bg-gray-50 dark:bg-gray-900 px-4 py-3 flex items-center justify-between cursor-pointer"
                onClick={() => toggleVersion(version.version_number)}
              >
                <div className="flex items-center">
                  {expandedVersion === version.version_number ? (
                    <ChevronDown className="h-4 w-4 mr-2 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-2 text-gray-500" />
                  )}
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Version {version.version_number}</span>
                  {version.version_number === Math.max(...versions.map(v => v.version_number)) && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-green-100 dark:bg-green-900 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-200">
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="h-3 w-3 mr-1" />
                  {version.created_at ? format(parseISO(version.created_at), 'MMM d, yyyy') : 'N/A'}
                </div>
              </div>
              
              {expandedVersion === version.version_number && (
                <div className="p-4 bg-white dark:bg-gray-800">
                  <div className="mb-3">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Changes in this version
                    </h4>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      {version.changes || 'No change description provided'}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <button
                      className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                      onClick={() => window.alert('Download functionality would be implemented here')}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </button>
                    
                    {version.previous_version && (
                      <button
                        className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                        onClick={() => handleCompare(version.version_number, version.previous_version!)}
                      >
                        <History className="h-3 w-3 mr-1" />
                        Compare with v{version.previous_version}
                      </button>
                    )}
                  </div>
                  
                  {renderVersionContent(version)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

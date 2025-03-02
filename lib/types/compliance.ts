// lib/types/compliance.ts

// Document category for grouping documents
export interface DocumentCategory {
  id?: string;
  name: string;
  description?: string;
  parent_id?: string; // For sub-categories
}

// Document main interface
export interface ComplianceDocument {
  id?: string;
  title: string;
  document_number: string; // For referencing (e.g., POL-001)
  category_id: string;
  category_name?: string; // For display purposes
  content: string;
  status: 'draft' | 'published' | 'archived';
  created_at?: string;
  last_updated?: string;
  current_version?: number;
  is_accreditation?: boolean;
  accreditation_type?: string; // ISO, BRCGS, SALSA, etc.
  expiry_date?: string; // For accreditation documents
}

// Document version for tracking changes
export interface DocumentVersion {
  id?: string;
  document_id: string;
  version_number: number;
  content: string;
  changes: string; // Description of changes
  created_at?: string;
  created_by?: string;
  previous_version?: number;
}

// Accreditation types
export interface AccreditationType {
  id?: string;
  name: string; // e.g., ISO 9001, BRCGS, SALSA
  description?: string;
  icon?: string; // For UI display
}

// Document comment for collaboration
export interface DocumentComment {
  id?: string;
  document_id: string;
  user_id: string;
  user_name?: string;
  content: string;
  created_at?: string;
}

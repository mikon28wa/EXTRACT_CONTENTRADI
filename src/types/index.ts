/**
 * Type definitions for the PDF Extraction Suite
 */

export interface ExtractedData {
  title: string;
  content: string;
  url: string;
}

export interface ProcessResult {
  url: string;
  status: 'success' | 'fail';
  error?: string;
  data?: ExtractedData;
}

export interface PdfSettings {
  format: 'a4' | 'letter';
  orientation: 'p' | 'l';
  showPageNumbers: boolean;
  showUrls: boolean;
  exportType: 'pdf' | 'md' | 'png';
}

export type AuditEvent = 
  | 'PIPELINE_START'
  | 'EXPORT_START'
  | 'EXPORT_COMPLETE'
  | 'EXPORT_ERROR'
  | 'VALIDATION_ERROR';

export interface AuditLogEntry {
  timestamp: string;
  event: AuditEvent;
  userAgent?: string;
  [key: string]: any;
}

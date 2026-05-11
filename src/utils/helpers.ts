/**
 * Utility functions for the PDF Extraction Suite
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Audit logging helper for GDPR compliance
 */
export const logAudit = (event: string, metadata: Record<string, any> = {}) => {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...metadata,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
  };
  console.log(`[AUDIT] ${JSON.stringify(auditEntry)}`);
};

/**
 * Sanitize filename for download
 */
export const sanitizeFilename = (filename: string): string => {
  return filename.substring(0, 30).replace(/[^a-z0-9]/gi, '_');
};

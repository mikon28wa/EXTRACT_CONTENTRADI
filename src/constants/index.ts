/**
 * Default configuration constants
 */

import { PdfSettings } from '../types';

export const DEFAULT_PDF_SETTINGS: PdfSettings = {
  format: 'a4',
  orientation: 'p',
  showPageNumbers: true,
  showUrls: true,
  exportType: 'pdf'
};

export const EXPORT_OPTIONS = {
  scale: 1.25,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff',
  allowTaint: true,
} as const;

export const NOISE_SELECTORS = [
  'script', 'style', 'nav', 'footer', 'header', 
  'iframe', 'noscript', '.ad', '.sidebar'
] as const;

export const CONTENT_SELECTORS = [
  '.chat-container', 
  '.messages-container',
  '[role="log"]',
  'main', 
  'article', 
  '#content',
  '.post-content',
  'body'
] as const;

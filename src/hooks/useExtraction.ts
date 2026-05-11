/**
 * Custom hook for managing content extraction and export state
 */

import { useState, useRef, useEffect } from 'react';
import { ProcessResult, PdfSettings } from '../types';
import { UrlListSchema, ManualContentSchema } from '../utils/validation';
import { logAudit } from '../utils/helpers';
import { fetchUrlContent } from '../services/fetchService';
import { exportToPdf, exportToPng, exportToMarkdown } from '../services/exportService';

interface UseExtractionReturn {
  urls: string;
  manualContent: string;
  showManual: boolean;
  isLoading: boolean;
  validationError: string | null;
  isExporting: boolean;
  exportProgressValue: number;
  exportProgress: string;
  error: string | null;
  results: ProcessResult[];
  setUrls: (urls: string) => void;
  setManualContent: (content: string) => void;
  setShowManual: (show: boolean) => void;
  handleBatchFetch: () => Promise<void>;
  handleManualExport: () => void;
  startExport: () => Promise<void>;
  clearResults: () => void;
  documentRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

export function useExtraction(
  settings: PdfSettings,
  setSettings: (settings: PdfSettings) => void
): UseExtractionReturn {
  const [urls, setUrls] = useState<string>('');
  const [manualContent, setManualContent] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoExportTriggered, setAutoExportTriggered] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [exportProgressValue, setExportProgressValue] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ProcessResult[]>([]);

  const documentRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleBatchFetch = async () => {
    const validation = UrlListSchema.safeParse(urls);
    if (!validation.success) {
      setValidationError(validation.error.errors[0].message);
      return;
    }
    setValidationError(null);
    
    const urlList = validation.data;
    logAudit('PIPELINE_START', { urlCount: urlList.length });
    setIsLoading(true);
    setAutoExportTriggered(true);
    setError(null);
    setResults([]);

    const newResults: ProcessResult[] = [];

    for (const url of urlList) {
      try {
        const { title, content } = await fetchUrlContent(url);
        newResults.push({ 
          url, 
          status: 'success', 
          data: { title, content, url } 
        });
      } catch (err: any) {
        newResults.push({ 
          url, 
          status: 'fail', 
          error: err.message || 'Fetch failed' 
        });
      }
      setResults([...newResults]);
    }

    setIsLoading(false);
    if (newResults.every(r => r.status === 'fail')) {
      setError("Alle URLs konnten nicht verarbeitet werden.");
      setAutoExportTriggered(false);
    }
  };

  const handleManualExport = () => {
    const validation = ManualContentSchema.safeParse(manualContent);
    if (!validation.success) {
      setValidationError(validation.error.errors[0].message);
      return;
    }
    setValidationError(null);

    setAutoExportTriggered(true);
    setResults([{ 
      url: 'MANUAL_INPUT', 
      status: 'success', 
      data: { 
        title: "Manuelles Dokument", 
        content: manualContent, 
        url: "MANUAL_INPUT" 
      } 
    }]);
    setShowManual(false);
  };

  // Auto-export logic when pipeline finishes
  useEffect(() => {
    if (!isLoading && autoExportTriggered && results.some(r => r.status === 'success')) {
      setAutoExportTriggered(false);
      const timer = setTimeout(() => {
        startExport();
      }, 800);
      return () => clearTimeout(timer);
    }
    if (!isLoading && autoExportTriggered && results.every(r => r.status === 'fail')) {
      setAutoExportTriggered(false);
    }
  }, [isLoading, autoExportTriggered, results]);

  const startExport = async () => {
    if (settings.exportType === 'pdf') {
      await exportToPdf(results, documentRefs.current, settings, (progress, message) => {
        setExportProgressValue(progress);
        setExportProgress(message);
      });
    } else if (settings.exportType === 'md') {
      setExportProgress('Markdown wird generiert...');
      exportToMarkdown(results);
    } else if (settings.exportType === 'png') {
      await exportToPng(results, documentRefs.current, (progress, message) => {
        setExportProgressValue(progress);
        setExportProgress(message);
      });
    }
    setIsExporting(false);
    setExportProgress('');
    setExportProgressValue(0);
  };

  const clearResults = () => setResults([]);

  return {
    urls,
    manualContent,
    showManual,
    isLoading,
    validationError,
    isExporting,
    exportProgressValue,
    exportProgress,
    error,
    results,
    setUrls,
    setManualContent,
    setShowManual,
    handleBatchFetch,
    handleManualExport,
    startExport,
    clearResults,
    documentRefs
  };
}

/**
 * Service for exporting content to various formats (PDF, PNG, Markdown)
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { EXPORT_OPTIONS } from '../constants';
import { ProcessResult, PdfSettings } from '../types';
import { sanitizeFilename } from '../utils/helpers';

/**
 * Export content as Markdown
 */
export function exportToMarkdown(results: ProcessResult[]): void {
  const successData = results.filter(r => r.status === 'success').map(r => r.data!);
  if (successData.length === 0) return;

  let fullContent = "";
  successData.forEach((item) => {
    const displayContent = item.content || "_Kein Inhalt extrahiert_";
    fullContent += `---\n`;
    fullContent += `Titel: ${item.title}\n`;
    fullContent += `Quelle: ${item.url}\n`;
    fullContent += `Datum: ${new Date().toLocaleString()}\n`;
    fullContent += `---\n\n`;
    fullContent += `# ${item.title}\n\n`;
    fullContent += `${displayContent}\n\n`;
    fullContent += `\n---\n\n`;
  });

  const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pipeline_export_${Date.now()}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export content as PNG images
 */
export async function exportToPng(
  results: ProcessResult[], 
  documentRefs: (HTMLDivElement | null)[],
  onProgress?: (progress: number, message: string) => void
): Promise<void> {
  const successResultIndices = results
    .map((r, i) => r.status === 'success' ? i : -1)
    .filter(i => i !== -1);

  if (successResultIndices.length === 0) return;

  for (let i = 0; i < successResultIndices.length; i++) {
    const idx = successResultIndices[i];
    const progress = Math.round(((i + 0.1) / successResultIndices.length) * 100);
    onProgress?.(progress, `Dokument ${i + 1}/${successResultIndices.length} wird gerendert...`);
    
    const element = documentRefs[idx];
    if (!element) continue;

    const canvas = await html2canvas(element, getExportOptions());
    const link = document.createElement('a');
    const title = results[idx].data?.title || 'inhalt';
    link.download = `export_${sanitizeFilename(title)}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Export content as PDF
 */
export async function exportToPdf(
  results: ProcessResult[],
  documentRefs: (HTMLDivElement | null)[],
  settings: PdfSettings,
  onProgress?: (progress: number, message: string) => void
): Promise<void> {
  const successResultIndices = results
    .map((r, i) => r.status === 'success' ? i : -1)
    .filter(i => i !== -1);

  if (successResultIndices.length === 0) return;

  const pdf = new jsPDF({
    orientation: settings.orientation,
    unit: 'mm',
    format: settings.format
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < successResultIndices.length; i++) {
    const resultIdx = successResultIndices[i];
    const progress = Math.round(((i + 0.1) / successResultIndices.length) * 100);
    onProgress?.(progress, `Dokument ${i + 1}/${successResultIndices.length} wird verarbeitet...`);
    
    const element = documentRefs[resultIdx];
    if (!element) continue;

    if (i > 0) pdf.addPage();

    const canvas = await html2canvas(element, getExportOptions());
    const imgData = canvas.toDataURL('image/jpeg', 0.82);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = pdfWidth / imgWidth;
    const canvasHeight = imgHeight * ratio;

    let heightLeft = canvasHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, canvasHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - canvasHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, canvasHeight);
      heightLeft -= pdfHeight;
    }
  }

  pdf.save(`export_${Date.now()}.pdf`);
}

/**
 * Get html2canvas export options with style overrides
 */
function getExportOptions(): html2canvas.Options {
  return {
    ...EXPORT_OPTIONS,
    onclone: (clonedDoc: Document) => {
      // Remove all existing style tags and links
      const styles = clonedDoc.getElementsByTagName('style');
      const links = clonedDoc.getElementsByTagName('link');
      
      for (let i = styles.length - 1; i >= 0; i--) {
        styles[i].parentNode?.removeChild(styles[i]);
      }
      for (let i = links.length - 1; i >= 0; i--) {
        if (links[i].rel === 'stylesheet') {
          links[i].parentNode?.removeChild(links[i]);
        }
      }

      // Force basic print styles
      const overrideStyle = clonedDoc.createElement('style');
      overrideStyle.innerHTML = `
        * { 
          color-scheme: light !important;
          box-shadow: none !important;
          text-shadow: none !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          background-image: none !important;
          filter: none !important;
          -webkit-print-color-adjust: exact !important;
        }
        body { 
          background-color: #ffffff !important; 
          color: #000000 !important; 
          margin: 0 !important;
          padding: 0 !important;
        }
        header, h1, h2, h3, p, span, div, section, article { 
          background-color: transparent !important;
          border-color: #000000 !important; 
          color: #000000 !important;
        }
        .bg-black { background-color: #000000 !important; }
        .text-white { color: #ffffff !important; }
        pre, code { 
          background-color: #f3f4f6 !important; 
          color: #000000 !important; 
          border: 1px solid #000000 !important;
          white-space: pre-wrap !important;
        }
        pre * { color: #000000 !important; }
        .markdown-body { color: #000000 !important; }
        
        div[class*="bg-"], section[class*="bg-"], article[class*="bg-"] {
          background-color: #ffffff !important;
        }
      `;
      clonedDoc.head.appendChild(overrideStyle);

      // Clean elements with problematic styles
      const allElements = clonedDoc.getElementsByTagName('*');
      for (let j = 0; j < allElements.length; j++) {
        const el = allElements[j] as HTMLElement;
        const inlineStyle = el.getAttribute('style');
        if (inlineStyle && (inlineStyle.includes('okl') || inlineStyle.includes('var'))) {
          el.removeAttribute('style');
        }
        try {
          if (el.style) {
            el.style.boxShadow = 'none';
            el.style.textShadow = 'none';
            el.style.filter = 'none';
          }
        } catch(e) {}
      }
    }
  };
}

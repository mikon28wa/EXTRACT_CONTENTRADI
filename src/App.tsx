import { useState, useRef, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { z } from 'zod';
import { 
  Link as LinkIcon, 
  Download, 
  FileText, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Trash2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Input Schemes for validation (GDPR/Security compliance)
const UrlSchema = z.string().url("Ungültiges URL-Format");
const UrlListSchema = z.string().transform(v => 
  v.split('\n').map(u => u.trim()).filter(Boolean)
).pipe(z.array(UrlSchema).min(1, "Mindestens eine URL erforderlich"));

const ManualContentSchema = z.string().min(10, "Inhalt zu kurz (Min. 10 Zeichen)");

interface ExtractedData {
  title: string;
  content: string;
  url: string;
}

interface ProcessResult {
  url: string;
  status: 'success' | 'fail';
  error?: string;
  data?: ExtractedData;
}

interface PdfSettings {
  format: 'a4' | 'letter';
  orientation: 'p' | 'l';
  showPageNumbers: boolean;
  showUrls: boolean;
  exportType: 'pdf' | 'md'| 'png';
}

export default function App() {
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
  const [settings, setSettings] = useState<PdfSettings>({
    format: 'a4',
    orientation: 'p',
    showPageNumbers: true,
    showUrls: true,
    exportType: 'pdf'
  });

  const handleBatchFetch = async () => {
    // Validation
    const validation = UrlListSchema.safeParse(urls);
    if (!validation.success) {
      setValidationError(validation.error.issues[0].message);
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
        const response = await fetch('/api/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        const result = await response.json();

        if (!response.ok) {
          newResults.push({ url, status: 'fail', error: result.error || 'Fetch failed' });
        } else {
          newResults.push({ url, status: 'success', data: { ...result, url } });
        }
      } catch (err: unknown) {
        const error = err as { message?: string };
        newResults.push({ url, status: 'fail', error: error.message || 'Unbekannter Fehler' });
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
      setValidationError(validation.error.issues[0].message);
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
      // Small delay to ensure DOM is rendered before html2canvas starts
      const timer = setTimeout(() => {
        startExport();
      }, 800);
      return () => clearTimeout(timer);
    }
    if (!isLoading && autoExportTriggered && results.every(r => r.status === 'fail')) {
       setAutoExportTriggered(false);
    }
  }, [isLoading, autoExportTriggered, results]);

  const documentRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Audit Logging Helper (GDPR compliance)
  const logAudit = (event: string, metadata: any = {}) => {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      event,
      ...metadata,
      userAgent: navigator.userAgent
    };
    console.log(`[AUDIT] ${JSON.stringify(auditEntry)}`);
  };

  const getExportOptions = () => ({
    scale: 1.25,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    allowTaint: true,
    onclone: (clonedDoc: Document) => {
      // 1. Remove ALL existing style tags and links to ensure no modern CSS is present
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

      // 2. Force a rock-solid, basic print style with zero modern functions
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
        
        /* Tactical nuke for utility classes that might still use vars */
        div[class*="bg-"], section[class*="bg-"], article[class*="bg-"] {
          background-color: #ffffff !important;
        }
      `;
      clonedDoc.head.appendChild(overrideStyle);

      // 3. Manual attribute cleaning on all elements - nuclear version
      const allElements = clonedDoc.getElementsByTagName('*');
      for (let j = 0; j < allElements.length; j++) {
        const el = allElements[j] as HTMLElement;
        
        // Remove style attribute if it contains okl or var
        const inlineStyle = el.getAttribute('style');
        if (inlineStyle && (inlineStyle.includes('okl') || inlineStyle.includes('var'))) {
           el.removeAttribute('style');
        }

        // Nuclear: Force basic properties if they look suspicious
        try {
          if (el.style) {
            el.style.boxShadow = 'none';
            el.style.textShadow = 'none';
            el.style.filter = 'none';
          }
        } catch(e) {}
      }
    }
  });

  const handleExportPNG = async () => {
    const successResultIndices = results
      .map((r, i) => r.status === 'success' ? i : -1)
      .filter(i => i !== -1);
    
    if (successResultIndices.length === 0) return;
    setIsExporting(true);
    setExportProgress('PNG wird vorbereitet...');
    logAudit('EXPORT_START', { type: 'png', count: successResultIndices.length });

    try {
      for (let i = 0; i < successResultIndices.length; i++) {
        const idx = successResultIndices[i];
        const progress = Math.round(((i + 0.1) / successResultIndices.length) * 100);
        setExportProgressValue(progress);
        setExportProgress(`Dokument ${i + 1}/${successResultIndices.length} wird gerendert...`);
        const element = documentRefs.current[idx];
        if (!element) {
          console.warn(`Element für Index ${idx} nicht gefunden`);
          continue;
        }

        const canvas = await html2canvas(element, getExportOptions());

        const link = document.createElement('a');
        link.download = `export_${results[idx].data?.title.substring(0, 30).replace(/[^a-z0-9]/gi, '_') || 'inhalt'}_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('PNG Export Error:', err);
      alert('PNG-Generierung fehlgeschlagen.');
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const handleExportMD = () => {
    const successData = results.filter(r => r.status === 'success').map(r => r.data!);
    if (successData.length === 0) return;
    setIsExporting(true);
    setExportProgress('Markdown wird generiert...');
    logAudit('EXPORT_START', { type: 'md', count: successData.length });

    try {
      let fullContent = "";
      successData.forEach((item, idx) => {
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
    } catch (err) {
      console.error('MD Export Error:', err);
      alert('Markdown-Generierung fehlgeschlagen.');
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const handleExportPDF = async () => {
    const successResultIndices = results
      .map((r, i) => r.status === 'success' ? i : -1)
      .filter(i => i !== -1);
    
    if (successResultIndices.length === 0) return;
    setIsExporting(true);
    setExportProgress('PDF wird vorbereitet...');
    logAudit('EXPORT_START', { type: 'pdf', count: successResultIndices.length });

    try {
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
        setExportProgressValue(progress);
        setExportProgress(`Dokument ${i + 1}/${successResultIndices.length} wird verarbeitet...`);
        const element = documentRefs.current[resultIdx];
        
        if (!element) {
          console.warn(`Element für Index ${resultIdx} nicht gefunden`);
          continue;
        }

        if (i > 0) pdf.addPage();

        const canvas = await html2canvas(element, getExportOptions());

        // Use JPEG for PDF to reduce data size and prevent export failures
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

      setExportProgressValue(100);
      setExportProgress('PDF wird gespeichert...');
      pdf.save(`export_${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('Der Export ist fehlgeschlagen. Dies liegt oft an sehr langen Inhalten. Versuchen Sie es mit weniger Dokumenten oder nutzen Sie den "Markdown"-Export für unbegrenzte Längen.');
    } finally {
      setIsExporting(false);
      setExportProgress('');
      setExportProgressValue(0);
    }
  };

  const startExport = () => {
    if (settings.exportType === 'pdf') handleExportPDF();
    else if (settings.exportType === 'md') handleExportMD();
    else if (settings.exportType === 'png') handleExportPNG();
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans selection:bg-white selection:text-black focus-within:outline-none">
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-white focus:text-black focus:p-4 focus:font-bold focus:m-4 focus:ring-4 focus:ring-blue-500"
      >
        Zum Hauptinhalt springen
      </a>

      {/* Sidebar/Top bar */}
      <header className="p-12 lg:px-24 flex justify-between items-start" role="banner">
        <div className="flex flex-col gap-1">
          <div className="text-[10px] tracking-[0.4em] uppercase opacity-50 font-mono">Extraction Suite v2.0</div>
          <div className="w-12 h-0.5 bg-white" aria-hidden="true"></div>
        </div>
        <nav className="flex items-center gap-6 text-xs font-bold uppercase tracking-[0.2em] font-mono" aria-label="Systemstatus">
          <span className="flex items-center gap-2" aria-label="Systemstatus: Bereit">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
            System: Bereit
          </span>
          <span className="opacity-30 cursor-not-allowed">Protokolle</span>
          <span className="opacity-30 cursor-not-allowed" aria-hidden="true">Einstellungen</span>
        </nav>
      </header>

      <main id="main-content" className="px-12 lg:px-24 py-12 max-w-screen-2xl mx-auto flex flex-col gap-16" tabIndex={-1}>
        {/* Huge Title Section */}
        <section className="huge-title flex flex-col" aria-labelledby="hero-title">
          <motion.h1 
            id="hero-title"
            initial={{ x: -20, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-[12vw] md:text-[10vw] leading-[0.8] font-black uppercase italic tracking-tighter"
          >
            Extract
          </motion.h1>
          <motion.div
            initial={{ x: 20, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="outline-text text-[8vw] md:text-[7vw] leading-[0.8] font-black uppercase italic tracking-tighter ml-auto -mt-[2vw]"
            aria-hidden="true"
          >
            Content
          </motion.div>
        </section>

        {/* Input & Control Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-end">
          <section className="md:col-span-8 flex flex-col gap-6" aria-labelledby="input-label">
            <div className="font-mono bg-brand-card p-8 border-l-4 border-white text-sm break-all leading-relaxed shadow-2xl">
              <div className="flex items-center gap-3 mb-4 opacity-50 text-[10px] uppercase tracking-widest" id="input-label">
                <LinkIcon size={12} aria-hidden="true" /> Quell-Pipeline Eingang
              </div>
              
              <div className="flex flex-col gap-4">
                {!showManual ? (
                  <div className="relative">
                    <label htmlFor="url-textarea" className="sr-only">URLs eingeben (eine pro Zeile)</label>
                    <textarea
                      id="url-textarea"
                      placeholder="QUELL-URLS EINGEBEN (EINE PRO ZEILE)..."
                      value={urls}
                      onChange={(e) => {
                        setUrls(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      className={cn(
                        "w-full bg-transparent border-b py-2 font-mono text-base focus:outline-none placeholder:opacity-20 uppercase tracking-tight min-h-[120px] resize-y transition-colors",
                        validationError ? "border-red-500" : "border-white/20 focus:border-white"
                      )}
                      aria-invalid={!!validationError}
                      aria-describedby={validationError ? "validation-error" : undefined}
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <label htmlFor="manual-textarea" className="sr-only">Inhalt oder Chat-Transkript einfügen</label>
                    <textarea
                      id="manual-textarea"
                      value={manualContent}
                      onChange={(e) => {
                        setManualContent(e.target.value);
                        if (validationError) setValidationError(null);
                      }}
                      placeholder="INHALT ODER CHAT-TRANSKRIPT EINFÜGEN..."
                      className={cn(
                        "w-full h-48 bg-transparent border p-4 font-mono text-sm focus:outline-none placeholder:opacity-20 resize-none transition-colors",
                        validationError ? "border-red-500" : "border-white/10 focus:border-white/40"
                      )}
                      aria-invalid={!!validationError}
                      aria-describedby={validationError ? "validation-error" : undefined}
                    />
                  </div>
                )}
                
                {validationError && (
                  <div id="validation-error" className="text-red-500 text-[10px] font-mono uppercase tracking-widest flex items-center gap-2" aria-live="assertive">
                    <AlertCircle size={10} aria-hidden="true" /> {validationError}
                  </div>
                )}
                
                  <div className="flex flex-wrap gap-6 items-center border-t border-white/5 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowManual(!showManual)}
                      className="min-h-[44px] px-2 text-[10px] uppercase font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2 focus:ring-2 focus:ring-white outline-none rounded-sm"
                      aria-label={showManual ? "Zum Batch-URL-Modus wechseln" : "Zu manuellem Einfügen wechseln"}
                    >
                      {showManual ? "Interaktiver Batch-Modus" : "Manueller Eingabe-Modus"}
                    </button>

                    <div className="flex flex-wrap gap-4 items-center" role="group" aria-label="Export-Konfiguration">
                      <label className="flex items-center gap-2 text-[9px] uppercase font-bold text-white/40" htmlFor="export-type">
                        Format:
                        <select 
                          id="export-type"
                          value={settings.exportType}
                          onChange={(e) => setSettings({...settings, exportType: e.target.value as any})}
                          className="bg-brand-bg border border-white/20 text-white p-2 min-h-[32px] text-[10px] outline-none focus:border-white focus:ring-1 focus:ring-white"
                        >
                          <option value="pdf">PDF</option>
                          <option value="md">Markdown</option>
                          <option value="png">Bild-Sequenz (PNG)</option>
                        </select>
                      </label>

                      {settings.exportType === 'pdf' && (
                        <>
                          <label className="flex items-center gap-2 text-[9px] uppercase font-bold text-white/40" htmlFor="export-format">
                            Papier:
                            <select 
                              id="export-format"
                              value={settings.format}
                              onChange={(e) => setSettings({...settings, format: e.target.value as any})}
                              className="bg-brand-bg border border-white/20 text-white p-2 min-h-[32px] text-[10px] outline-none focus:border-white focus:ring-1 focus:ring-white"
                            >
                              <option value="a4">A4</option>
                              <option value="letter">Letter</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-2 text-[9px] uppercase font-bold text-white/40" htmlFor="export-orientation">
                            Layout:
                            <select 
                              id="export-orientation"
                              value={settings.orientation}
                              onChange={(e) => setSettings({...settings, orientation: e.target.value as any})}
                              className="bg-brand-bg border border-white/20 text-white p-2 min-h-[32px] text-[10px] outline-none focus:border-white focus:ring-1 focus:ring-white"
                            >
                              <option value="p">Hochkant</option>
                              <option value="l">Quer</option>
                            </select>
                          </label>
                        </>
                      )}
                      
                      <label className="flex items-center gap-2 text-[9px] uppercase font-bold text-white/40 cursor-pointer min-h-[44px] px-2" htmlFor="show-urls">
                        <input 
                          id="show-urls"
                          type="checkbox" 
                          checked={settings.showUrls}
                          onChange={(e) => setSettings({...settings, showUrls: e.target.checked})}
                          className="w-4 h-4 rounded border-white/20 bg-brand-bg text-white focus:ring-offset-black focus:ring-white"
                        />
                        <span>Quell-URLs einbetten</span>
                      </label>
                    </div>
                  </div>
              </div>
            </div>

            <div className="flex gap-4 text-[10px] uppercase tracking-widest font-mono font-bold" aria-live="polite">
              <div className="bg-white/5 px-4 py-2 border border-white/10 rounded-sm">
                Status: {isLoading ? "System arbeitet..." : results.length > 0 ? "Extraktion beendet" : "Warte auf Eingabe"}
              </div>
              {results.length > 0 && (
                <>
                  <div className="bg-green-500/10 text-green-400 px-4 py-2 border border-green-500/20 rounded-sm">
                    {results.filter(r => r.status === 'success').length} Erfolge
                  </div>
                  {results.some(r => r.status === 'fail') && (
                    <div className="bg-red-500/10 text-red-500 px-4 py-2 border border-red-500/20 rounded-sm">
                      {results.filter(r => r.status === 'fail').length} Fehler
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="md:col-span-4 flex flex-col gap-6" aria-labelledby="cta-label">
            <h3 id="cta-label" className="sr-only">Aktionen</h3>
            <p className="text-xs opacity-40 leading-relaxed uppercase tracking-tighter max-w-xs font-mono">
              Unsere Pipeline strukturiert Webinhalte für den Export. Wählen Sie oben Ihren Modus und starten Sie die Verarbeitung.
            </p>
            
            {showManual ? (
               <button
                  type="button"
                  onClick={handleManualExport}
                  disabled={!manualContent}
                  aria-label="Vorschau erstellen und Export vorbereiten"
                  className="glow-btn h-20 w-full flex items-center justify-between px-8 font-black text-xl uppercase italic tracking-tighter group hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale focus:ring-4 focus:ring-white outline-none"
                >
                  <span>Vorschau</span>
                  <ChevronRight strokeWidth={4} aria-hidden="true" />
                </button>
            ) : (
              <button
                type="button"
                onClick={handleBatchFetch}
                disabled={isLoading || !urls}
                aria-label={isLoading ? "Wird abgerufen" : "Extraktion starten"}
                className="glow-btn h-20 w-full flex items-center justify-between px-8 font-black text-xl uppercase italic tracking-tighter group hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale focus:ring-4 focus:ring-white outline-none"
              >
                <span>{isLoading ? "Aktiv..." : "Starten"}</span>
                {isLoading ? <Loader2 className="animate-spin" strokeWidth={4} aria-hidden="true" /> : <ChevronRight strokeWidth={4} aria-hidden="true" />}
              </button>
            )}
          </section>
        </div>

        {/* Results List */}
        {results.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Verarbeitete Segmente">
            {results.map((res, idx) => (
              <div key={idx} className={cn(
                "p-4 border-l-4 font-mono text-[10px] bg-brand-card shadow-sm transition-all",
                res.status === 'success' ? "border-green-500" : "border-red-500"
              )}>
                <div className="flex justify-between mb-2">
                  <span className="opacity-50 truncate max-w-[80%]">{res.url}</span>
                  <span className={res.status === 'success' ? "text-green-500" : "text-red-500"} aria-hidden="true">
                    {res.status === 'success' ? 'VALID' : 'ERROR'}
                  </span>
                </div>
                {res.status === 'fail' && (
                  <div className="text-red-400 opacity-80 mt-1 uppercase leading-tight font-bold">
                    Pipeline-Error: {res.error}
                  </div>
                )}
                {res.status === 'success' && res.data && (
                  <div className="text-white font-bold truncate text-[11px]">
                    {res.data.title}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Error Handling */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              role="alert"
              aria-live="assertive"
              className="bg-red-500/10 border-l-4 border-red-500 p-6 font-mono text-xs uppercase"
            >
              <div className="text-red-500 font-black mb-1 tracking-widest">Kritischer Fehler</div>
              <div className="text-red-200/60">{error}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview & Result Section */}
        {results.some(r => r.status === 'success') && (
          <motion.section 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-12"
            aria-label="Dokumentenvorschau"
          >
            <div className="lg:col-span-8">
               <div className="border border-white/10 bg-[#FFFFFF] h-full min-h-[600px] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
                  <div className="border-b border-black/5 p-4 flex items-center justify-between bg-[#F8F8F8]">
                    <div className="flex gap-2 font-mono text-[9px] uppercase font-bold text-black/40">
                      Zusammengesetzter Ausgabe-Stream
                    </div>
                    <div className="font-mono text-[10px] font-black text-black uppercase tracking-tighter" aria-live="polite">
                      {results.filter(r => r.status === 'success').length} Segmente verarbeitet
                    </div>
                  </div>

                  <div className="flex-grow overflow-auto p-4 md:p-12 bg-[#E5E5E5] scroll-smooth">
                    {results.filter(r => r.status === 'success').map((res, idx) => {
                      const resultIndex = results.indexOf(res);
                      return (
                      <article 
                        key={idx}
                        id={`segment-${idx}`}
                        ref={(el: HTMLDivElement | null) => { documentRefs.current[resultIndex] = el; }}
                        className="bg-white p-12 shadow-2xl mx-auto w-full max-w-[800px] min-h-[1100px] relative text-[#141414] mb-12 last:mb-0"
                      >
                        <div className="absolute top-0 left-0 w-full h-1 bg-black" aria-hidden="true" />
                        
                        <header className="mb-12 flex justify-between items-start border-b-2 border-black pb-8">
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-[9px] font-black uppercase tracking-[0.3em] text-black/30">Modul {idx + 1}</span>
                            <h2 className="font-mono text-3xl font-black leading-none tracking-tighter uppercase max-w-sm">
                              {res.data!.title}
                            </h2>
                          </div>
                          <div className="text-right flex flex-col items-end">
                            {settings.showUrls && (
                              <>
                                <span className="font-mono text-[9px] text-black/30 uppercase mb-1">Quelle</span>
                                <div className="font-mono text-[10px] font-black tracking-tighter max-w-[150px] truncate underline" title={res.url}>{res.url}</div>
                              </>
                            )}
                          </div>
                        </header>

                        <div className="max-w-none font-sans text-sm leading-relaxed text-black/80 space-y-4
                          [&_h1]:font-mono [&_h1]:text-xl [&_h1]:font-black [&_h1]:uppercase [&_h1]:tracking-tighter [&_h1]:text-black [&_h1]:mt-8
                          [&_h2]:font-mono [&_h2]:text-lg [&_h2]:font-black [&_h2]:uppercase [&_h2]:tracking-tighter [&_h2]:text-black [&_h2]:mt-6
                          [&_h3]:font-mono [&_h3]:text-base [&_h3]:font-black [&_h3]:uppercase [&_h3]:tracking-tighter [&_h3]:text-black [&_h3]:mt-4
                          [&_strong]:text-black [&_strong]:font-bold
                          [&_code]:bg-black/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs
                          [&_pre]:bg-black [&_pre]:text-white [&_pre]:p-6 [&_pre]:rounded-none [&_pre]:overflow-x-auto [&_pre]:my-6 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-snug [&_pre]:border-l-4 [&_pre]:border-white/20 [&_pre]:shadow-xl
                          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2
                          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2
                          [&_blockquote]:border-l-4 [&_blockquote]:border-black/10 [&_blockquote]:pl-4 [&_blockquote]:italic
                         px-2">
                          <ReactMarkdown>{res.data!.content}</ReactMarkdown>
                        </div>
                      </article>
                    );
                    })}
                  </div>
               </div>
            </div>

            <aside className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-brand-card border border-white/5 p-8 flex flex-col gap-8 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-widest text-green-400">Export Finalisierung</div>
                  <button 
                    type="button"
                    onClick={() => setResults([])} 
                    className="opacity-20 hover:opacity-100 focus:opacity-100 transition-opacity p-2 min-h-[44px] flex items-center justify-center outline-none focus:ring-2 focus:ring-white rounded"
                    aria-label="Alle Ergebnisse löschen"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="step-card !border-white/10 p-6 bg-white/5 rounded">
                    <div className="text-[10px] uppercase tracking-widest opacity-40 mb-2 font-bold font-mono">Status</div>
                    <div className="text-lg font-bold italic tracking-tight font-sans">Batch fertiggestellt</div>
                    <p className="text-[11px] opacity-40 mt-2 leading-normal uppercase font-mono">
                      {results.filter(r => r.status === 'success').length} Module sind für den Binär-Export bereit.
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={startExport}
                    disabled={isExporting}
                    className="glow-btn h-24 w-full flex flex-col items-center justify-center gap-2 px-8 font-black text-xl uppercase italic tracking-tighter group hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-50 relative overflow-hidden focus:ring-4 focus:ring-white outline-none rounded"
                  >
                    {isExporting && (
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${exportProgressValue}%` }}
                        className="absolute bottom-0 left-0 h-1 bg-green-500 z-10"
                        aria-hidden="true"
                      />
                    )}
                    <div className="flex items-center gap-4">
                      {isExporting ? <Loader2 className="animate-spin" aria-hidden="true" /> : (
                        settings.exportType === 'pdf' ? <Download aria-hidden="true" /> : 
                        settings.exportType === 'md' ? <FileText aria-hidden="true" /> : <Download aria-hidden="true" />
                      )}
                      <span>
                        {isExporting ? "Generiere..." : "Herunterladen"}
                      </span>
                    </div>
                    {isExporting && (
                      <span className="text-[10px] font-mono not-italic opacity-50 lowercase tracking-normal" aria-live="polite">
                        {exportProgressValue}% abgeschlossen
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </aside>
          </motion.section>
        )}

        {/* The 3-Column Steps Footer Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full pt-16 border-t border-white/10 mt-12 mb-12" aria-label="Funktionsweise">
          <div className="step-card">
            <h4 className="text-[10px] uppercase tracking-widest opacity-40 mb-2 font-bold font-mono underline decoration-white/20">Phase 01</h4>
            <div className="text-lg font-bold italic tracking-tight font-sans">Validierung</div>
            <p className="text-[11px] opacity-40 mt-2 leading-normal uppercase font-mono">Strikte Prüfung der URLs & Schutz vor schädlichen Code-Injektionen.</p>
          </div>
          <div className="step-card">
            <h4 className="text-[10px] uppercase tracking-widest opacity-40 mb-2 font-bold font-mono underline decoration-white/20">Phase 02</h4>
            <div className="text-lg font-bold italic tracking-tight font-sans">Normalisierung</div>
            <p className="text-[11px] opacity-40 mt-2 leading-normal uppercase font-mono">Umwandlung komplexer HTML-Strukturen in ein einheitliches Format.</p>
          </div>
          <div className="step-card">
            <h4 className="text-[10px] uppercase tracking-widest opacity-40 mb-2 font-bold font-mono underline decoration-white/20">Phase 03</h4>
            <h5 className="text-lg font-bold italic tracking-tight font-sans">Binärisierung</h5>
            <p className="text-[11px] opacity-40 mt-2 leading-normal uppercase font-mono">Schlussendlich Kompression und sichere Generierung der Exportdateien.</p>
          </div>
        </section>
      </main>

      <footer className="px-12 lg:px-24 pb-12 opacity-20 font-mono text-[9px] uppercase tracking-[0.5em] flex justify-between border-t border-white/5 pt-12" role="contentinfo">
        <div>
          © 2026 PDF_ENGINE_TERMINAL
        </div>
        <nav className="flex gap-8" aria-label="Sicherheits-Status">
          <span>TLS 1.3 ENABLED</span>
          <span className="hidden md:inline">AUDIT LOGGING ACTIVE</span>
        </nav>
      </footer>
    </div>
  );
}

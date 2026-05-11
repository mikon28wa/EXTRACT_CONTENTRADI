import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import { DEFAULT_PDF_SETTINGS } from './constants';
import { useExtraction } from './hooks/useExtraction';
import { UrlInput, ManualInput, ValidationError, ExportSettings } from './components/InputSection';
import { ResultsList } from './components/ResultsList';
import { DocumentPreview } from './components/DocumentPreview';
import { cn } from './utils/helpers';

export default function App() {
  const [settings, setSettings] = useState(DEFAULT_PDF_SETTINGS);
  
  const {
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
  } = useExtraction(settings, setSettings);

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans selection:bg-white selection:text-black focus-within:outline-none">
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-white focus:text-black focus:p-4 focus:font-bold focus:m-4 focus:ring-4 focus:ring-blue-500"
      >
        Zum Hauptinhalt springen
      </a>

      {/* Header */}
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
        {/* Title Section */}
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
                  <UrlInput 
                    urls={urls}
                    validationError={validationError}
                    onChange={setUrls}
                    onValidationErrorClear={() => {}}
                  />
                ) : (
                  <ManualInput
                    content={manualContent}
                    validationError={validationError}
                    onChange={setManualContent}
                    onValidationErrorClear={() => {}}
                  />
                )}
                
                {validationError && (
                  <ValidationError message={validationError} />
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

                  <ExportSettings
                    exportType={settings.exportType}
                    format={settings.format}
                    orientation={settings.orientation}
                    showUrls={settings.showUrls}
                    onExportTypeChange={(type) => setSettings({...settings, exportType: type})}
                    onFormatChange={(format) => setSettings({...settings, format})}
                    onOrientationChange={(orientation) => setSettings({...settings, orientation})}
                    onShowUrlsChange={(showUrls) => setSettings({...settings, showUrls})}
                  />
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
        <ResultsList results={results} />

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
            <DocumentPreview 
              results={results}
              settings={settings}
              documentRefs={documentRefs}
            />

            <aside className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-brand-card border border-white/5 p-8 flex flex-col gap-8 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-widest text-green-400">Export Finalisierung</div>
                  <button 
                    type="button"
                    onClick={clearResults} 
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

        {/* Steps Footer Section */}
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

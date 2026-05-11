/**
 * URL Input Section Component
 */

import { LinkIcon, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UrlInputProps {
  urls: string;
  validationError: string | null;
  onChange: (urls: string) => void;
  onValidationErrorClear: () => void;
}

export function UrlInput({ urls, validationError, onChange, onValidationErrorClear }: UrlInputProps) {
  return (
    <div className="relative">
      <label htmlFor="url-textarea" className="sr-only">
        URLs eingeben (eine pro Zeile)
      </label>
      <textarea
        id="url-textarea"
        placeholder="QUELL-URLS EINGEBEN (EINE PRO ZEILE)..."
        value={urls}
        onChange={(e) => {
          onChange(e.target.value);
          if (validationError) onValidationErrorClear();
        }}
        className={cn(
          "w-full bg-transparent border-b py-2 font-mono text-base focus:outline-none placeholder:opacity-20 uppercase tracking-tight min-h-[120px] resize-y transition-colors",
          validationError ? "border-red-500" : "border-white/20 focus:border-white"
        )}
        aria-invalid={!!validationError}
        aria-describedby={validationError ? "validation-error" : undefined}
      />
    </div>
  );
}

interface ManualInputProps {
  content: string;
  validationError: string | null;
  onChange: (content: string) => void;
  onValidationErrorClear: () => void;
}

export function ManualInput({ content, validationError, onChange, onValidationErrorClear }: ManualInputProps) {
  return (
    <div className="relative">
      <label htmlFor="manual-textarea" className="sr-only">
        Inhalt oder Chat-Transkript einfügen
      </label>
      <textarea
        id="manual-textarea"
        value={content}
        onChange={(e) => {
          onChange(e.target.value);
          if (validationError) onValidationErrorClear();
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
  );
}

interface ValidationErrorProps {
  message: string;
}

export function ValidationError({ message }: ValidationErrorProps) {
  return (
    <div 
      id="validation-error" 
      className="text-red-500 text-[10px] font-mono uppercase tracking-widest flex items-center gap-2" 
      aria-live="assertive"
    >
      <AlertCircle size={10} aria-hidden="true" /> {message}
    </div>
  );
}

interface ExportSettingsProps {
  exportType: 'pdf' | 'md' | 'png';
  format: 'a4' | 'letter';
  orientation: 'p' | 'l';
  showUrls: boolean;
  onExportTypeChange: (type: 'pdf' | 'md' | 'png') => void;
  onFormatChange: (format: 'a4' | 'letter') => void;
  onOrientationChange: (orientation: 'p' | 'l') => void;
  onShowUrlsChange: (show: boolean) => void;
}

export function ExportSettings({
  exportType,
  format,
  orientation,
  showUrls,
  onExportTypeChange,
  onFormatChange,
  onOrientationChange,
  onShowUrlsChange
}: ExportSettingsProps) {
  return (
    <div className="flex flex-wrap gap-4 items-center" role="group" aria-label="Export-Konfiguration">
      <label className="flex items-center gap-2 text-[9px] uppercase font-bold text-white/40" htmlFor="export-type">
        Format:
        <select 
          id="export-type"
          value={exportType}
          onChange={(e) => onExportTypeChange(e.target.value as 'pdf' | 'md' | 'png')}
          className="bg-brand-bg border border-white/20 text-white p-2 min-h-[32px] text-[10px] outline-none focus:border-white focus:ring-1 focus:ring-white"
        >
          <option value="pdf">PDF</option>
          <option value="md">Markdown</option>
          <option value="png">Bild-Sequenz (PNG)</option>
        </select>
      </label>

      {exportType === 'pdf' && (
        <>
          <label className="flex items-center gap-2 text-[9px] uppercase font-bold text-white/40" htmlFor="export-format">
            Papier:
            <select 
              id="export-format"
              value={format}
              onChange={(e) => onFormatChange(e.target.value as 'a4' | 'letter')}
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
              value={orientation}
              onChange={(e) => onOrientationChange(e.target.value as 'p' | 'l')}
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
          checked={showUrls}
          onChange={(e) => onShowUrlsChange(e.target.checked)}
          className="w-4 h-4 rounded border-white/20 bg-brand-bg text-white focus:ring-offset-black focus:ring-white"
        />
        <span>Quell-URLs einbetten</span>
      </label>
    </div>
  );
}

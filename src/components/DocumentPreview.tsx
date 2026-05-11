/**
 * Document Preview Component
 */

import { ProcessResult, PdfSettings } from '../types';
import ReactMarkdown from 'react-markdown';

interface DocumentPreviewProps {
  results: ProcessResult[];
  settings: PdfSettings;
  documentRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
}

export function DocumentPreview({ results, settings, documentRefs }: DocumentPreviewProps) {
  const successResults = results.filter(r => r.status === 'success');
  
  if (successResults.length === 0) return null;

  return (
    <div className="lg:col-span-8">
      <div className="border border-white/10 bg-[#FFFFFF] h-full min-h-[600px] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
        <div className="border-b border-black/5 p-4 flex items-center justify-between bg-[#F8F8F8]">
          <div className="flex gap-2 font-mono text-[9px] uppercase font-bold text-black/40">
            Zusammengesetzter Ausgabe-Stream
          </div>
          <div className="font-mono text-[10px] font-black text-black uppercase tracking-tighter" aria-live="polite">
            {successResults.length} Segmente verarbeitet
          </div>
        </div>

        <div className="flex-grow overflow-auto p-4 md:p-12 bg-[#E5E5E5] scroll-smooth">
          {successResults.map((res, idx) => (
            <article 
              key={idx}
              id={`segment-${idx}`}
              ref={(el) => (documentRefs.current[results.indexOf(res)] = el)}
              className="bg-white p-12 shadow-2xl mx-auto w-full max-w-[800px] min-h-[1100px] relative text-[#141414] mb-12 last:mb-0"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-black" aria-hidden="true" />
              
              <header className="mb-12 flex justify-between items-start border-b-2 border-black pb-8">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[9px] font-black uppercase tracking-[0.3em] text-black/30">
                    Modul {idx + 1}
                  </span>
                  <h2 className="font-mono text-3xl font-black leading-none tracking-tighter uppercase max-w-sm">
                    {res.data!.title}
                  </h2>
                </div>
                <div className="text-right flex flex-col items-end">
                  {settings.showUrls && (
                    <>
                      <span className="font-mono text-[9px] text-black/30 uppercase mb-1">Quelle</span>
                      <div className="font-mono text-[10px] font-black tracking-tighter max-w-[150px] truncate underline" title={res.url}>
                        {res.url}
                      </div>
                    </>
                  )}
                </div>
              </header>

              <div className="max-w-none font-sans text-sm leading-relaxed text-black/80 space-y-4 [&_h1]:font-mono [&_h1]:text-xl [&_h1]:font-black [&_h1]:uppercase [&_h1]:tracking-tighter [&_h1]:text-black [&_h1]:mt-8 [&_h2]:font-mono [&_h2]:text-lg [&_h2]:font-black [&_h2]:uppercase [&_h2]:tracking-tighter [&_h2]:text-black [&_h2]:mt-6 [&_h3]:font-mono [&_h3]:text-base [&_h3]:font-black [&_h3]:uppercase [&_h3]:tracking-tighter [&_h3]:text-black [&_h3]:mt-4 [&_strong]:text-black [&_strong]:font-bold [&_code]:bg-black/5 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs [&_pre]:bg-black [&_pre]:text-white [&_pre]:p-6 [&_pre]:rounded-none [&_pre]:overflow-x-auto [&_pre]:my-6 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-snug [&_pre]:border-l-4 [&_pre]:border-white/20 [&_pre]:shadow-xl [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2 [&_blockquote]:border-l-4 [&_blockquote]:border-black/10 [&_blockquote]:pl-4 [&_blockquote]:italic px-2">
                <ReactMarkdown>{res.data!.content}</ReactMarkdown>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

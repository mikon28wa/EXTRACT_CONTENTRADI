/**
 * Results List Component
 */

import { ProcessResult } from '../types';
import { cn } from '../utils/helpers';

interface ResultsListProps {
  results: ProcessResult[];
}

export function ResultsList({ results }: ResultsListProps) {
  if (results.length === 0) return null;

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Verarbeitete Segmente">
      {results.map((res, idx) => (
        <div 
          key={idx} 
          className={cn(
            "p-4 border-l-4 font-mono text-[10px] bg-brand-card shadow-sm transition-all",
            res.status === 'success' ? "border-green-500" : "border-red-500"
          )}
        >
          <div className="flex justify-between mb-2">
            <span className="opacity-50 truncate max-w-[80%]">{res.url}</span>
            <span 
              className={res.status === 'success' ? "text-green-500" : "text-red-500"} 
              aria-hidden="true"
            >
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
  );
}

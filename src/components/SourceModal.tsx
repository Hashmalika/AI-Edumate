import React from 'react';
import { X, FileText, BookmarkCheck, Hash, Percent } from 'lucide-react';
import { SourceCitation } from '../types';

interface SourceModalProps {
  citation: SourceCitation | null;
  documentFilename?: string;
  onClose: () => void;
}

export const SourceModal: React.FC<SourceModalProps> = ({
  citation,
  documentFilename,
  onClose,
}) => {
  if (!citation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookmarkCheck className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Retrieved Grounding Context</h3>
              <p className="text-xs text-slate-500 truncate max-w-[280px]">
                {documentFilename || 'Source PDF'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Badges */}
        <div className="px-5 py-3 bg-indigo-50/40 border-b border-indigo-100/60 flex items-center gap-3 text-xs flex-wrap">
          <span className="flex items-center gap-1 font-semibold text-indigo-700">
            <FileText className="h-3.5 w-3.5" /> Page {citation.page}
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 text-slate-600 font-mono text-[11px]">
            <Hash className="h-3 w-3" /> {citation.chunk_id}
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-full text-[11px]">
            <Percent className="h-3 w-3" /> {(citation.relevance_score * 100).toFixed(1)}% Relevance
          </span>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[380px] overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Verbatim Document Excerpt
          </p>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono leading-relaxed whitespace-pre-wrap selection:bg-indigo-100">
            {citation.snippet || 'Full text chunk unavailable.'}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close Excerpt
          </button>
        </div>
      </div>
    </div>
  );
};

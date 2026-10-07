import React from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  Layers,
} from 'lucide-react';
import { DocumentMetadata } from '../types';

interface DocumentListProps {
  documents: DocumentMetadata[];
  activeDocId: string | null;
  onSelectDocument: (doc: DocumentMetadata) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  activeDocId,
  onSelectDocument,
  onRefresh,
  loading,
}) => {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
            <FolderOpen className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Document Store</h2>
            <p className="text-xs text-slate-500">
              {documents.length} document{documents.length !== 1 ? 's' : ''} indexed
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          title="Refresh documents"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-600">No documents indexed yet</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Upload an engineering PDF above to begin RAG search & quiz generation
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {documents.map((doc) => {
            const isSelected = doc.document_id === activeDocId;
            const isProcessed = doc.status === 'processed';

            return (
              <div
                key={doc.document_id}
                onClick={() => isProcessed && onSelectDocument(doc)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-400'
                    : isProcessed
                    ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    : 'border-slate-200 bg-slate-50/80 cursor-not-allowed opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate" title={doc.filename}>
                        {doc.filename}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                        <span>{formatBytes(doc.file_size)}</span>
                        <span>•</span>
                        <span>{doc.pages_count} pages</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Layers className="h-3 w-3" /> {doc.chunks_count} chunks
                        </span>
                        {doc.created_at && (
                          <>
                            <span>•</span>
                            <span>{formatDate(doc.created_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {doc.status === 'processed' ? (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {isSelected ? 'Active RAG' : 'Ready'}
                      </span>
                    ) : doc.status === 'processing' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                        <Clock className="h-3 w-3 animate-spin" /> Processing
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-semibold"
                        title={doc.error_message || 'Failed'}
                      >
                        <AlertCircle className="h-3 w-3" /> Failed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { uploadPDF } from '../services/api';
import { DocumentMetadata } from '../types';

interface PdfUploadProps {
  onDocumentUploaded: (doc: DocumentMetadata) => void;
}

export const PdfUpload: React.FC<PdfUploadProps> = ({ onDocumentUploaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUploadedDoc, setLastUploadedDoc] = useState<DocumentMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // 1. Validation
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Invalid file format. Please upload a PDF document.');
      return;
    }

    const maxBytes = 20 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage('File exceeds 20MB limit. Please upload a smaller PDF.');
      return;
    }

    if (file.size === 0) {
      setErrorMessage('The selected file is empty (0 bytes).');
      return;
    }

    setErrorMessage(null);
    setUploading(true);
    setProgressStep('Uploading PDF to AI-StudyMate server...');

    try {
      // Step simulation for visual feedback
      const timer1 = setTimeout(() => {
        setProgressStep('PyMuPDF extracting pages & semantic chunks...');
      }, 700);

      const timer2 = setTimeout(() => {
        setProgressStep('Gemini generating embeddings & building FAISS index...');
      }, 1600);

      const response = await uploadPDF(file);
      clearTimeout(timer1);
      clearTimeout(timer2);

      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'PDF processing failed');
      }

      setLastUploadedDoc(response.data);
      onDocumentUploaded(response.data);
      setProgressStep('');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <UploadCloud className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Upload Engineering PDF</h2>
            <p className="text-xs text-slate-500">Textbooks, lecture slides, papers, or problem sets (up to 20MB)</p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
          PDF only • FAISS RAG
        </span>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
            : uploading
            ? 'border-slate-300 bg-slate-50/70 cursor-not-allowed'
            : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/60'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileSelect}
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-2.5">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
            <div className="text-sm font-medium text-slate-800">{progressStep}</div>
            <p className="text-xs text-slate-500">Extracting page-aware text, computing embeddings, indexing vectors...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <div className="h-11 w-11 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">
                Click to browse or drag and drop your PDF here
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Supports PyMuPDF page-aware chunking & Gemini embeddings
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="flex-1">
            <span className="font-semibold">Upload failed: </span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Last Uploaded Success Card */}
      {lastUploadedDoc && !uploading && (
        <div className="mt-3.5 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <FileCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate max-w-[260px] sm:max-w-md">
                {lastUploadedDoc.filename}
              </p>
              <p className="text-[11px] text-emerald-700">
                Processed {lastUploadedDoc.pages_count} pages into {lastUploadedDoc.chunks_count} FAISS vector chunks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-semibold">
              <CheckCircle2 className="h-3 w-3" /> Ready for RAG
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

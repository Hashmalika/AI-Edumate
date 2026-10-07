import React from 'react';
import {
  GraduationCap,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  BrainCircuit,
} from 'lucide-react';
import { DocumentMetadata } from '../types';

interface HeaderProps {
  activeTab: 'chat' | 'mcq';
  onTabChange: (tab: 'chat' | 'mcq') => void;
  activeDoc: DocumentMetadata | null;
  serverStatus: 'online' | 'offline' | 'checking';
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  activeDoc,
  serverStatus,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm ring-2 ring-indigo-100">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  AI-StudyMate
                </h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  RAG Study Assistant
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Engineering PDF semantic search, grounded Q&A, and interactive MCQ generation
              </p>
            </div>
          </div>

          {/* Right Badges & Navigation */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Active Document Status */}
            {activeDoc ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                <span className="max-w-[140px] truncate" title={activeDoc.filename}>
                  {activeDoc.filename}
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1 rounded font-mono">
                  {activeDoc.pages_count}p
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-xs">
                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                <span>No PDF Selected</span>
              </div>
            )}

            {/* Server Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${
                serverStatus === 'online'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : serverStatus === 'offline'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {serverStatus === 'online' ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>RAG Online</span>
                </>
              ) : serverStatus === 'offline' ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>Checking</span>
                </>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => onTabChange('chat')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BrainCircuit className="h-3.5 w-3.5" />
                <span>Q&A Chat</span>
              </button>
              <button
                type="button"
                onClick={() => onTabChange('mcq')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === 'mcq'
                    ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>MCQ Quiz</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

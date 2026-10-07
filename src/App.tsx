import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PdfUpload } from './components/PdfUpload';
import { DocumentList } from './components/DocumentList';
import { ChatView } from './components/ChatView';
import { McqView } from './components/McqView';
import { SourceModal } from './components/SourceModal';
import { getDocuments, getHealth } from './services/api';
import { DocumentMetadata, SourceCitation } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'mcq'>('chat');
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentMetadata | null>(null);
  const [loadingDocs, setLoadingDocs] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [activeCitation, setActiveCitation] = useState<SourceCitation | null>(null);

  // Load documents and verify server health
  const refreshDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await getDocuments();
      if (res.success && res.data) {
        setDocuments(res.data);
        // Automatically select the first processed document if none is active
        if (!activeDoc) {
          const firstProcessed = res.data.find((d) => d.status === 'processed');
          if (firstProcessed) {
            setActiveDoc(firstProcessed);
          }
        } else {
          // Keep active document in sync
          const updated = res.data.find((d) => d.document_id === activeDoc.document_id);
          if (updated) setActiveDoc(updated);
        }
      }
    } catch {
      // Handled silently
    } finally {
      setLoadingDocs(false);
    }
  };

  const checkHealthStatus = async () => {
    try {
      const res = await getHealth();
      if (res.success) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch {
      setServerStatus('offline');
    }
  };

  useEffect(() => {
    checkHealthStatus();
    refreshDocuments();

    // Periodic poll for background uploads & health
    const interval = setInterval(() => {
      checkHealthStatus();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleDocumentUploaded = (newDoc: DocumentMetadata) => {
    setDocuments((prev) => [newDoc, ...prev.filter((d) => d.document_id !== newDoc.document_id)]);
    if (newDoc.status === 'processed') {
      setActiveDoc(newDoc);
    }
  };

  const handleSelectDocument = (doc: DocumentMetadata) => {
    setActiveDoc(doc);
  };

  return (
    <div className="min-h-screen bg-slate-100/60 text-slate-800 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeDoc={activeDoc}
        serverStatus={serverStatus}
      />

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Upload & Document Management (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <PdfUpload onDocumentUploaded={handleDocumentUploaded} />
            <DocumentList
              documents={documents}
              activeDocId={activeDoc?.document_id || null}
              onSelectDocument={handleSelectDocument}
              onRefresh={refreshDocuments}
              loading={loadingDocs}
            />
          </div>

          {/* Right Column: Interactive Chat or MCQ Exam (7 cols) */}
          <div className="lg:col-span-7">
            {activeTab === 'chat' ? (
              <ChatView
                activeDoc={activeDoc}
                onOpenCitation={setActiveCitation}
              />
            ) : (
              <McqView activeDoc={activeDoc} />
            )}
          </div>
        </div>
      </main>

      {/* Citation Inspector Modal */}
      <SourceModal
        citation={activeCitation}
        documentFilename={activeDoc?.filename}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
}

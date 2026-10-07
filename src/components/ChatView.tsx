import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  FileText,
  BookmarkCheck,
  Trash2,
  Loader2,
  Bot,
  User,
  Info,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { sendChat } from '../services/api';
import { DocumentMetadata, ChatMessage, SourceCitation } from '../types';

interface ChatViewProps {
  activeDoc: DocumentMetadata | null;
  onOpenCitation: (citation: SourceCitation) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  activeDoc,
  onOpenCitation,
}) => {
  const [mode, setMode] = useState<'general' | 'document'>('document');
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcoming message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: 'Hello! I am your AI-StudyMate. You can ask me general engineering questions, or select "Ask My Document" to retrieve grounded answers with page-level citations from your uploaded PDFs.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mode: 'general',
        },
      ]);
    }
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputMessage).trim();
    if (!textToSend || loading) return;

    if (mode === 'document' && !activeDoc) {
      const warningMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: '⚠️ Please upload or select a processed PDF document before asking document-grounded questions.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: 'document',
        error: true,
      };
      setMessages((prev) => [...prev, warningMsg]);
      return;
    }

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      mode,
      document_id: mode === 'document' ? activeDoc?.document_id : null,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await sendChat(
        textToSend,
        mode,
        mode === 'document' ? activeDoc?.document_id : null
      );

      if (!res.success || !res.data) {
        throw new Error(res.error?.message || 'Chat generation failed');
      }

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: res.data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode,
        document_id: mode === 'document' ? activeDoc?.document_id : null,
        sources: res.data.sources,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errResponse: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: `Error: ${err.message || 'Failed to generate response. Please verify backend status.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode,
        error: true,
      };
      setMessages((prev) => [...prev, errResponse]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `reset_${Date.now()}`,
        sender: 'assistant',
        text: 'Chat history cleared. What engineering topic or document question would you like to explore?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode,
      },
    ]);
  };

  const samplePrompts =
    mode === 'document'
      ? [
          'Summarize the core engineering formulas in this document.',
          'Explain the main methodology described in this PDF.',
          'What are the key technical assumptions made?',
          'What are the primary conclusions and results?',
        ]
      : [
          'Explain the difference between Laplace and Fourier transforms.',
          'How does negative feedback stabilize an operational amplifier?',
          'Explain the Carnot cycle efficiency formula and its physical significance.',
          'Derive the Navier-Stokes equations at a conceptual level.',
        ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-[700px] overflow-hidden">
      {/* Top Header / Mode Switcher */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Mode Tabs */}
          <div className="bg-slate-200/70 p-1 rounded-xl flex items-center gap-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode('document')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === 'document'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Ask My Document (RAG)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('general')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                mode === 'general'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>General AI</span>
            </button>
          </div>
        </div>

        {/* Right Tools: Active Doc Info & Clear Button */}
        <div className="flex items-center gap-2">
          {mode === 'document' && (
            <div className="text-xs text-slate-500 truncate max-w-[220px]">
              {activeDoc ? (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <BookmarkCheck className="h-3 w-3 text-emerald-600" />
                  {activeDoc.filename}
                </span>
              ) : (
                <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Select a document first
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={handleClearChat}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer text-xs flex items-center gap-1"
            title="Clear Chat History"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Mode Advisory Banner if Document mode without Doc */}
      {mode === 'document' && !activeDoc && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>Document Mode Active:</strong> You haven't selected a PDF yet. Please upload a document on the left to ask grounded questions.
            </span>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isInsufficientContext =
            !isUser &&
            msg.text.includes(
              "I couldn't find enough relevant information in the uploaded document"
            );

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                isUser ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-semibold ${
                  isUser
                    ? 'bg-slate-900 text-white'
                    : msg.error
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-indigo-600 text-white shadow-xs'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-xs'
                    : msg.error
                    ? 'bg-rose-50 border border-rose-200 text-rose-800 rounded-tl-xs'
                    : 'bg-slate-50 border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-2xs'
                }`}
              >
                {/* Text Content */}
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Insufficient Context Guidance */}
                {isInsufficientContext && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
                    <div>
                      <strong>RAG Grounding Note:</strong> AI-StudyMate adheres strictly to the contents of your PDF to prevent hallucinations. You can try rephrasing your query, searching for specific terms in your textbook, or switching to <strong>General AI</strong> mode.
                    </div>
                  </div>
                )}

                {/* Sources & Page Citations for Document Mode */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/80">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                      <BookmarkCheck className="h-3.5 w-3.5 text-indigo-600" /> Grounding Citations:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onOpenCitation(src)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-medium transition-colors cursor-pointer group"
                          title="Click to view full retrieved context"
                        >
                          <span>Page {src.page}</span>
                          <span className="text-indigo-400">•</span>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            {(src.relevance_score * 100).toFixed(0)}%
                          </span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100 ml-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamp & Mode tag */}
                <div
                  className={`mt-1.5 text-[10px] flex items-center justify-end gap-1.5 ${
                    isUser ? 'text-slate-400' : 'text-slate-400'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  <span>•</span>
                  <span className="uppercase">{msg.mode}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-slate-600 flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
              <span>
                {mode === 'document'
                  ? 'Performing FAISS vector search & synthesizing grounded response...'
                  : 'Gemini reasoning & generating response...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/40">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-medium text-slate-400 shrink-0">Try:</span>
          {samplePrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <div className="p-3 sm:p-4 border-t border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                mode === 'document'
                  ? activeDoc
                    ? `Ask anything about ${activeDoc.filename}... (Enter to send)`
                    : 'Select a document to ask grounded questions...'
                  : 'Ask any engineering concept, formula, or problem... (Enter to send)'
              }
              disabled={loading}
              className="w-full resize-none p-3 pr-10 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

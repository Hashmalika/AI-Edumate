export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface DocumentMetadata {
  document_id: string;
  filename: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  pages_count: number;
  chunks_count: number;
  file_size: number;
  created_at: string;
  error_message?: string | null;
}

export interface SourceCitation {
  page: number;
  chunk_id: string;
  relevance_score: number;
  snippet?: string | null;
}

export interface ChatResponse {
  answer: string;
  sources: SourceCitation[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  mode: 'general' | 'document';
  document_id?: string | null;
  sources?: SourceCitation[];
  error?: boolean;
}

export interface McqSource {
  page: number;
  chunk_id: string;
}

export interface McqItem {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  source?: McqSource | null;
}

export interface McqResponse {
  questions: McqItem[];
}

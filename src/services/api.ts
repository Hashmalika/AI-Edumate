import {
  ApiResponse,
  DocumentMetadata,
  ChatResponse,
  McqResponse,
} from '../types';

const BASE_URL = '/api';

/**
 * Standard request helper with robust error parsing
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      if (json && json.error) {
        return json as ApiResponse<T>;
      }
      return {
        success: false,
        data: null,
        error: {
          code: `HTTP_${res.status}`,
          message: json?.detail || res.statusText || 'Unknown server error',
        },
      };
    }

    return json as ApiResponse<T>;
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: {
        code: 'NETWORK_ERROR',
        message: err.message || 'Network request failed. Please check connection.',
      },
    };
  }
}

/**
 * Uploads an engineering PDF file (multipart/form-data)
 */
export async function uploadPDF(file: File): Promise<ApiResponse<DocumentMetadata>> {
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest<DocumentMetadata>('/upload', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Retrieves the list of all uploaded documents
 */
export async function getDocuments(): Promise<ApiResponse<DocumentMetadata[]>> {
  return apiRequest<DocumentMetadata[]>('/documents', {
    method: 'GET',
  });
}

/**
 * Retrieves the processing status and metadata of a specific document
 */
export async function getDocumentStatus(
  documentId: string
): Promise<ApiResponse<DocumentMetadata>> {
  return apiRequest<DocumentMetadata>(`/documents/${encodeURIComponent(documentId)}`, {
    method: 'GET',
  });
}

/**
 * Sends a message in either General AI or Grounded Document RAG mode
 */
export async function sendChat(
  message: string,
  mode: 'general' | 'document',
  documentId?: string | null
): Promise<ApiResponse<ChatResponse>> {
  return apiRequest<ChatResponse>('/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: message.trim(),
      mode,
      document_id: mode === 'document' ? documentId : null,
    }),
  });
}

/**
 * Generates MCQs either from general engineering knowledge or grounded in a document
 */
export async function generateMCQs(
  mode: 'general' | 'document',
  documentId?: string | null,
  numberOfQuestions: number = 5,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<ApiResponse<McqResponse>> {
  return apiRequest<McqResponse>('/mcq', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode,
      document_id: mode === 'document' ? documentId : null,
      number_of_questions: numberOfQuestions,
      difficulty,
    }),
  });
}

/**
 * System health check
 */
export async function getHealth(): Promise<ApiResponse<{ status: string; service: string }>> {
  return apiRequest<{ status: string; service: string }>('/health', {
    method: 'GET',
  });
}

# AI-StudyMate 🎓

**AI-StudyMate** is an AI study assistant engineered for technical students and engineers. Upload engineering textbooks, lecture notes, or research papers in PDF format to ask grounded questions via Retrieval-Augmented Generation (RAG) with exact page-level citations, generate practice multiple-choice questions (MCQs), or switch into general AI mode for broader technical problem solving.

---

## 🏗️ Architecture

```
                                  +-------------------+
                                  |    React Client   |
                                  |    (Vite SPA)     |
                                  +---------+---------+
                                            |
                                 HTTP /api  | (Proxy / Node server.ts)
                                            v
                            +-------------------------------+
                            |     FastAPI Python Backend    |
                            |   (Pydantic Input/Output)     |
                            +---------------+---------------+
                                            |
                +---------------------------+---------------------------+
                |                                                       |
                v                                                       v
      +-------------------+                                   +-------------------+
      |   PyMuPDF (fitz)  |                                   |  Google GenAI SDK |
      |  Page Extraction  |                                   | (gemini-3.1-flash |
      |  & Word Chunking  |                                   |  & embeddings)    |
      +---------+---------+                                   +---------+---------+
                |                                                       |
                v                                                       v
      +-------------------+                                   +-------------------+
      |  FAISS FlatIP     | <====== Normalized Embeddings ===== |  gemini-embedding |
      |  Vector Index     |             (3072 dims)           |   -2-preview      |
      +-------------------+                                   +-------------------+
```

---

## 🛠️ Tech Stack

- **Frontend**:
  - React 19, TypeScript, Vite
  - Tailwind CSS for modern responsive dashboard styling
  - Lucide React icons
  - Centralized API service (`src/services/api.ts`)
- **Backend**:
  - Python 3.11+, FastAPI, Uvicorn
  - Pydantic v2 for strict request and response validation
  - PyMuPDF (`pymupdf`) for page-aware PDF text extraction
  - FAISS (`faiss-cpu`) for dense vector similarity indexing
  - NumPy for vector normalization
- **AI & Models**:
  - Google GenAI SDK (`google-genai` Python library)
  - **Generation**: `gemini-3.1-flash-lite` (with automatic fallback to `gemini-3.8-flash`)
  - **Retrieval Embeddings**: `gemini-embedding-2-preview` (3072-dimensional semantic vectors)

---

## 🔑 Environment Variables

Create a `.env` file in the root directory (never commit secrets to version control):

```bash
# Required: Gemini API Key for generation and embeddings
GEMINI_API_KEY="your-gemini-api-key"

# Optional: Preferred chat model (defaults to gemini-3.1-flash-lite)
GEMINI_CHAT_MODEL="gemini-3.1-flash-lite"

# Optional: Embedding model (defaults to gemini-embedding-2-preview)
GEMINI_EMBEDDING_MODEL="gemini-embedding-2-preview"
```

---

## 🚀 Setup & How to Run

### 1. Install Dependencies

**Frontend / Node dependencies:**
```bash
npm install
```

**Backend / Python dependencies:**
```bash
pip3 install fastapi uvicorn pydantic python-multipart pymupdf google-genai faiss-cpu numpy python-dotenv
```

### 2. Run the Full-Stack Application

The applet includes an integrated full-stack runner (`server.ts`) that orchestrates both Python FastAPI and the Vite frontend:

```bash
npm run dev
```

This boots:
1. Python FastAPI on `http://127.0.0.1:8001`
2. React Vite dev server / proxy on `http://0.0.0.0:3000`

### 3. Running Backend Standalone (Optional for Debugging)

```bash
npm run backend
# or:
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8001 --reload
```

---

## 📡 API Endpoints

All responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Failure envelope:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

### 1. `GET /api/health`
Checks server and RAG engine health.

### 2. `POST /api/upload`
- **Request**: `multipart/form-data` with key `file` (`.pdf` only, up to 20MB).
- **Processing**:
  1. Extracts text page-by-page preserving 1-indexed page numbers.
  2. Creates overlapping chunks (~350 words, 70-word overlap).
  3. Generates 3072-dim embeddings via `gemini-embedding-2-preview`.
  4. Builds a normalized `faiss.IndexFlatIP` vector index.
  5. Persists index and chunk mappings to disk.

### 3. `GET /api/documents`
Retrieves list of all uploaded documents with metadata (pages, chunks, file size, status).

### 4. `GET /api/documents/{document_id}`
Returns status and metadata for a specific document.

### 5. `POST /api/chat`
- **Request**:
  ```json
  {
    "message": "What is Fourier's Law of Thermal Conduction?",
    "mode": "document",
    "document_id": "doc_fece2ee8"
  }
  ```
- **Modes**:
  - `general`: Directly answers from Gemini without retrieval (`sources: []`).
  - `document`: Embeds question -> FAISS cosine similarity search -> top-$k$ retrieval -> prompt injection defense -> grounded Gemini generation -> returns answer and page citations (`sources: [{ page, chunk_id, relevance_score }]`).
  - **Grounding Safety**: If retrieved chunks lack sufficient facts, safely returns: *"I couldn't find enough relevant information in the uploaded document to answer this question."*

### 6. `POST /api/mcq`
- **Request**:
  ```json
  {
    "mode": "document",
    "document_id": "doc_fece2ee8",
    "number_of_questions": 5,
    "difficulty": "medium"
  }
  ```
- **Response**: Exactly 4 options per question, verified correct answer, pedagogical explanation, and page citation when in document mode.

---

## 🧠 Normal LLM vs. RAG: What's the Difference?

| Feature | Standard LLM (General AI) | RAG (Ask My Document) |
| :--- | :--- | :--- |
| **Knowledge Source** | Pre-training data (static, generic) | Specific uploaded engineering PDF |
| **Page Citations** | None (cannot cite your course material) | Exact 1-indexed page citations with % relevance |
| **Hallucination Risk** | High for niche formulas or specific course conventions | Minimal; model is constrained to retrieved context |
| **Out-of-Scope Handling** | May guess or fabricate an answer | Returns safe fallback when document lacks evidence |
| **MCQ Practice** | Generic engineering questions | Targeted test questions drawn directly from your syllabus |

---

## 🛡️ Security & Prompt Injection Defense

1. **Untrusted Data Boundary**: Retrieved text from PDFs is treated as untrusted student data, wrapped inside explicit delimiters (`=== BEGIN UNTRUSTED RETRIEVED DOCUMENT CONTEXT ===`).
2. **System Instruction Guard**: The model is explicitly commanded to treat document text as reference material and never obey instructions or overrides embedded inside the PDF.
3. **Backend-Only Secrets**: The `GEMINI_API_KEY` is kept strictly on the backend. No secrets are ever exposed in client bundles or network responses.
4. **Input & Upload Sanitization**: Validates file MIME type, file size limit (20MB), and verifies that PDF has extractable text.

---

## 🧪 Testing Instructions

Run the automated test suite covering all 10 core functional and negative requirements:

```bash
python3 test_app.py
```

The test suite validates:
1. `/api/health` status
2. Multi-page engineering PDF upload & RAG indexing
3. Document listing & metadata persistence
4. General AI chat (unretrieved)
5. Grounded RAG document query with page citations
6. Unrelated query safe fallback (grounding defense)
7. 4-option document MCQ generation with page citations
8. 4-option general MCQ generation
9. Request validation rejection (empty messages, missing IDs)
10. Malformed / non-PDF file rejection

---

## 📦 Production Deployment

For production environments:
```bash
npm run build
npm start
```
`server.ts` statically serves the optimized Vite `dist/` bundle while proxying API requests to the Python FastAPI service.

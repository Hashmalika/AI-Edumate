import os
import uuid
import datetime
import logging
from typing import List, Optional
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend.config import MAX_FILE_SIZE_BYTES, UPLOAD_DIR
from backend.schemas import (
    ApiResponse,
    ApiError,
    DocumentMetadata,
    ChatRequest,
    ChatResponse,
    McqRequest,
    McqResponse,
)
from backend.services.doc_store import doc_store
from backend.services.pdf_service import extract_and_chunk_pdf
from backend.services.rag_service import (
    build_vector_store,
    answer_document_query,
    answer_general_query,
    generate_mcqs_service,
)

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai_studymate")

app = FastAPI(
    title="AI-StudyMate API",
    description="RAG-powered AI Study Assistant with PDF Extraction, Semantic Search, and MCQ Generation",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Exception Handlers -----------------

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_msgs = []
    for err in exc.errors():
        loc = " -> ".join([str(x) for x in err.get("loc", []) if x != "body"])
        msg = err.get("msg", "Invalid input")
        error_msgs.append(f"{loc}: {msg}" if loc else msg)
    combined_message = "; ".join(error_msgs) or "Request validation failed"
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": combined_message
            }
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code = "HTTP_ERROR"
    if exc.status_code == 404:
        code = "NOT_FOUND"
    elif exc.status_code == 400:
        code = "BAD_REQUEST"
    elif exc.status_code == 422:
        code = "UNPROCESSABLE_ENTITY"
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": code,
                "message": exc.detail
            }
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error processing {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "data": None,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc) or "An unexpected server error occurred"
            }
        }
    )

# ----------------- Routes -----------------

@app.get("/api/health", response_model=ApiResponse[dict])
@app.get("/health", response_model=ApiResponse[dict])
async def health_check():
    return ApiResponse(
        success=True,
        data={"status": "healthy", "service": "AI-StudyMate", "timestamp": datetime.datetime.utcnow().isoformat()},
        error=None
    )

@app.post("/api/upload", response_model=ApiResponse[DocumentMetadata])
async def upload_pdf(file: UploadFile = File(...)):
    # 1. Validate file format
    filename = file.filename or "uploaded.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported. Please upload a .pdf document."
        )

    # 2. Read content and validate size
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}"
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty (0 bytes)."
        )

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
        )

    # 3. Generate unique document ID and persist PDF
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    doc_dir = doc_store.get_doc_dir(doc_id)
    saved_pdf_path = doc_dir / filename

    with open(saved_pdf_path, "wb") as f:
        f.write(content)

    created_at = datetime.datetime.utcnow().isoformat()
    meta = DocumentMetadata(
        document_id=doc_id,
        filename=filename,
        status="processing",
        file_size=len(content),
        created_at=created_at
    )
    doc_store.add_document(meta)

    # 4. Extract text and build RAG vector store
    try:
        chunks, total_pages = extract_and_chunk_pdf(saved_pdf_path, doc_id)
        build_vector_store(doc_id, chunks)

        doc_store.update_status(
            document_id=doc_id,
            status="processed",
            pages_count=total_pages,
            chunks_count=len(chunks)
        )
        updated_meta = doc_store.get_document(doc_id)
        return ApiResponse(success=True, data=updated_meta, error=None)

    except ValueError as ve:
        error_msg = str(ve)
        doc_store.update_status(document_id=doc_id, status="failed", error_message=error_msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg)
    except Exception as e:
        error_msg = f"Document processing failed: {str(e)}"
        doc_store.update_status(document_id=doc_id, status="failed", error_message=error_msg)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_msg)

@app.get("/api/documents", response_model=ApiResponse[List[DocumentMetadata]])
async def list_documents():
    docs = doc_store.list_documents()
    return ApiResponse(success=True, data=docs, error=None)

@app.get("/api/documents/{document_id}", response_model=ApiResponse[DocumentMetadata])
async def get_document_status(document_id: str):
    doc = doc_store.get_document(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{document_id}' not found."
        )
    return ApiResponse(success=True, data=doc, error=None)

@app.post("/api/chat", response_model=ApiResponse[ChatResponse])
async def chat_endpoint(request: ChatRequest):
    if request.mode == "general":
        try:
            response = answer_general_query(request.message)
            return ApiResponse(success=True, data=response, error=None)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"General AI chat failed: {str(e)}"
            )

    # Document mode
    doc = doc_store.get_document(request.document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{request.document_id}' does not exist."
        )
    if doc.status != "processed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document '{doc.filename}' is not ready for querying (current status: {doc.status})."
        )

    try:
        response = answer_document_query(request.document_id, request.message)
        return ApiResponse(success=True, data=response, error=None)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document retrieval query failed: {str(e)}"
        )

@app.post("/api/mcq", response_model=ApiResponse[McqResponse])
async def mcq_endpoint(request: McqRequest):
    if request.mode == "document":
        doc = doc_store.get_document(request.document_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document '{request.document_id}' not found."
            )
        if doc.status != "processed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Document '{doc.filename}' is not ready for MCQ generation (current status: {doc.status})."
            )

    try:
        response = generate_mcqs_service(
            mode=request.mode,
            document_id=request.document_id,
            num_questions=request.number_of_questions,
            difficulty=request.difficulty or "medium"
        )
        return ApiResponse(success=True, data=response, error=None)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MCQ generation failed: {str(e)}"
        )

import logging
from typing import List, Dict, Any, Tuple
from pathlib import Path
import pymupdf
from backend.config import CHUNK_TARGET_WORDS, CHUNK_OVERLAP_WORDS

logger = logging.getLogger(__name__)

class DocumentChunk:
    def __init__(self, document_id: str, page: int, chunk_id: str, text: str):
        self.document_id = document_id
        self.page = page
        self.chunk_id = chunk_id
        self.text = text

    def to_dict(self) -> Dict[str, Any]:
        return {
            "document_id": self.document_id,
            "page": self.page,
            "chunk_id": self.chunk_id,
            "text": self.text,
        }

def extract_and_chunk_pdf(pdf_path: Path, document_id: str) -> Tuple[List[DocumentChunk], int]:
    """
    Extracts text page-by-page using PyMuPDF and creates page-aware overlapping chunks.
    Returns (chunks, total_pages).
    Raises ValueError if the PDF is unreadable, corrupt, or contains no extractable text.
    """
    if not pdf_path.exists():
        raise ValueError(f"File not found: {pdf_path}")

    try:
        doc = pymupdf.open(str(pdf_path))
    except Exception as e:
        raise ValueError(f"Failed to open PDF file: {str(e)}")

    total_pages = len(doc)
    if total_pages == 0:
        doc.close()
        raise ValueError("The uploaded PDF has 0 pages")

    all_chunks: List[DocumentChunk] = []
    total_extracted_chars = 0
    global_chunk_idx = 0

    try:
        for page_idx in range(total_pages):
            page_num = page_idx + 1  # 1-indexed page number
            page = doc[page_idx]
            page_text = page.get_text("text").strip()

            if not page_text:
                continue

            total_extracted_chars += len(page_text)

            # Split page text into words for clean overlapping chunks
            words = page_text.split()
            if not words:
                continue

            # If page is short, make it a single chunk
            if len(words) <= CHUNK_TARGET_WORDS:
                chunk_id = f"{document_id}_p{page_num}_c{global_chunk_idx}"
                all_chunks.append(DocumentChunk(
                    document_id=document_id,
                    page=page_num,
                    chunk_id=chunk_id,
                    text=" ".join(words)
                ))
                global_chunk_idx += 1
            else:
                start = 0
                step = CHUNK_TARGET_WORDS - CHUNK_OVERLAP_WORDS
                if step <= 0:
                    step = CHUNK_TARGET_WORDS // 2

                while start < len(words):
                    end = min(start + CHUNK_TARGET_WORDS, len(words))
                    chunk_words = words[start:end]
                    chunk_text = " ".join(chunk_words)

                    chunk_id = f"{document_id}_p{page_num}_c{global_chunk_idx}"
                    all_chunks.append(DocumentChunk(
                        document_id=document_id,
                        page=page_num,
                        chunk_id=chunk_id,
                        text=chunk_text
                    ))
                    global_chunk_idx += 1

                    if end >= len(words):
                        break
                    start += step

    finally:
        doc.close()

    if total_extracted_chars < 20 or len(all_chunks) == 0:
        raise ValueError("PDF contains no extractable text or is purely scanned/empty without OCR text")

    logger.info(f"Processed doc {document_id}: {total_pages} pages, {len(all_chunks)} chunks, {total_extracted_chars} characters extracted.")
    return all_chunks, total_pages

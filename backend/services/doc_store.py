import json
import logging
from typing import Dict, Optional, List
from pathlib import Path
from backend.config import UPLOAD_DIR
from backend.schemas import DocumentMetadata

logger = logging.getLogger(__name__)

DOC_INDEX_FILE = UPLOAD_DIR / "documents.json"

class DocumentStore:
    def __init__(self):
        self._documents: Dict[str, DocumentMetadata] = {}
        self._load()

    def _load(self):
        if DOC_INDEX_FILE.exists():
            try:
                with open(DOC_INDEX_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        meta = DocumentMetadata(**item)
                        self._documents[meta.document_id] = meta
            except Exception as e:
                logger.error(f"Failed to load documents index: {e}")

    def _save(self):
        try:
            with open(DOC_INDEX_FILE, "w", encoding="utf-8") as f:
                json.dump([doc.model_dump() for doc in self._documents.values()], f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save documents index: {e}")

    def add_document(self, metadata: DocumentMetadata) -> DocumentMetadata:
        self._documents[metadata.document_id] = metadata
        self._save()
        return metadata

    def update_status(self, document_id: str, status: str, pages_count: int = 0, chunks_count: int = 0, error_message: Optional[str] = None):
        if document_id in self._documents:
            doc = self._documents[document_id]
            doc.status = status
            if pages_count > 0:
                doc.pages_count = pages_count
            if chunks_count > 0:
                doc.chunks_count = chunks_count
            if error_message:
                doc.error_message = error_message
            self._save()

    def get_document(self, document_id: str) -> Optional[DocumentMetadata]:
        return self._documents.get(document_id)

    def list_documents(self) -> List[DocumentMetadata]:
        # Return sorted by created_at descending
        return sorted(self._documents.values(), key=lambda d: d.created_at, reverse=True)

    def get_doc_dir(self, document_id: str) -> Path:
        d = UPLOAD_DIR / document_id
        d.mkdir(parents=True, exist_ok=True)
        return d

# Global document store instance
doc_store = DocumentStore()

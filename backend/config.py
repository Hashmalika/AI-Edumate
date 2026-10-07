import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Maximum upload file size: 20MB
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Supported models
# Primary model for text/chat/MCQs (gemini-3.1-flash-lite has separate quota and ultra-fast latency; falls back to gemini-3.8-flash)
PRIMARY_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "gemini-3.1-flash-lite")
FALLBACK_CHAT_MODEL = "gemini-3.8-flash"
EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-2-preview")

# Embedding dimensions for gemini-embedding-2-preview
EMBEDDING_DIM = 3072

# RAG configuration
TOP_K_RETRIEVAL = 4
SIMILARITY_THRESHOLD = 0.35  # Cosine similarity threshold for normalized vectors
CHUNK_TARGET_WORDS = 350     # Target words per chunk
CHUNK_OVERLAP_WORDS = 70     # Overlap words

from typing import List, Optional, Literal, Generic, TypeVar, Any
from pydantic import BaseModel, Field, model_validator

T = TypeVar("T")

# Standard Error Schema
class ApiError(BaseModel):
    code: str
    message: str

# Standard API Wrapper
class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[ApiError] = None

# Document metadata schema
class DocumentMetadata(BaseModel):
    document_id: str
    filename: str
    status: Literal["uploaded", "processing", "processed", "failed"]
    pages_count: int = 0
    chunks_count: int = 0
    file_size: int = 0
    created_at: str
    error_message: Optional[str] = None

# Chat request schema
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User message cannot be empty")
    mode: Literal["general", "document"] = Field(..., description="Chat mode: general or document")
    document_id: Optional[str] = Field(None, description="Required when mode is 'document'")

    @model_validator(mode="after")
    def validate_mode_and_doc(self):
        msg = self.message.strip() if self.message else ""
        if not msg:
            raise ValueError("Message cannot be empty or only whitespace")
        if self.mode == "document" and not self.document_id:
            raise ValueError("document_id is required when mode is 'document'")
        return self

# Source citation in RAG response
class SourceCitation(BaseModel):
    page: int
    chunk_id: str
    relevance_score: float
    snippet: Optional[str] = None

# Chat response schema
class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation] = Field(default_factory=list)

# MCQ Source citation
class McqSource(BaseModel):
    page: int
    chunk_id: str

# Single MCQ Item
class McqItem(BaseModel):
    question: str = Field(..., min_length=1)
    options: List[str] = Field(..., min_length=4, max_length=4)
    correct_answer: str = Field(..., min_length=1)
    explanation: str = Field(..., min_length=1)
    source: Optional[McqSource] = None

    @model_validator(mode="after")
    def validate_mcq_structure(self):
        # Validate options: exactly 4 distinct, non-empty options
        if len(self.options) != 4:
            raise ValueError("Each MCQ question must contain exactly 4 options")
        for idx, opt in enumerate(self.options):
            if not opt or not str(opt).strip():
                raise ValueError(f"Option {idx+1} cannot be empty")

        # Validate that correct_answer is in options
        clean_opts = [str(o).strip().lower() for o in self.options]
        clean_ans = str(self.correct_answer).strip().lower()
        
        # If the model provided letter index (A, B, C, D) instead of text:
        letter_map = {"a": 0, "b": 1, "c": 2, "d": 3}
        if clean_ans in letter_map and len(self.options) == 4:
            self.correct_answer = self.options[letter_map[clean_ans]]
            clean_ans = self.correct_answer.strip().lower()

        if clean_ans not in clean_opts:
            # Check for partial prefix like "A) Option text"
            matched = False
            for opt in self.options:
                if clean_ans == opt.strip().lower():
                    matched = True
                    break
            if not matched:
                raise ValueError(f"Correct answer '{self.correct_answer}' does not match any of the 4 options: {self.options}")

        return self

# MCQ Request Schema
class McqRequest(BaseModel):
    mode: Literal["general", "document"] = Field(..., description="Mode: general or document")
    document_id: Optional[str] = Field(None, description="Required when mode is 'document'")
    number_of_questions: int = Field(default=5, ge=1, le=10)
    difficulty: Optional[Literal["easy", "medium", "hard"]] = "medium"

    @model_validator(mode="after")
    def validate_doc_requirement(self):
        if self.mode == "document" and not self.document_id:
            raise ValueError("document_id is required when mode is 'document'")
        return self

# MCQ Response Schema
class McqResponse(BaseModel):
    questions: List[McqItem] = Field(default_factory=list)

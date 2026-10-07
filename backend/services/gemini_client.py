import os
import json
import logging
import time
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
from google.genai.errors import ClientError, APIError

from backend.config import (
    GEMINI_API_KEY,
    PRIMARY_CHAT_MODEL,
    FALLBACK_CHAT_MODEL,
    EMBEDDING_MODEL,
)

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        if not GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY is not set in environment or .env file.")
        self.client = genai.Client(
            api_key=GEMINI_API_KEY,
            http_options={"headers": {"User-Agent": "aistudio-build"}}
        )

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Embeds a list of texts using the official Google GenAI SDK.
        Calls embed_content per chunk to produce distinct individual vectors.
        """
        if not texts:
            return []

        all_embeddings: List[List[float]] = []
        for text in texts:
            try:
                response = self.client.models.embed_content(
                    model=EMBEDDING_MODEL,
                    contents=text,
                )
                if hasattr(response, "embeddings") and response.embeddings:
                    all_embeddings.append(response.embeddings[0].values)
                elif hasattr(response, "embedding") and response.embedding:
                    all_embeddings.append(response.embedding.values)
                else:
                    raise ValueError("No embeddings returned by Gemini embedding model")
            except Exception as e:
                logger.error(f"Error generating embedding: {e}")
                raise e

        return all_embeddings

    def embed_query(self, query: str) -> List[float]:
        """
        Embeds a single query string for semantic retrieval.
        """
        embeddings = self.embed_texts([query])
        if not embeddings:
            raise ValueError("Failed to generate embedding for query")
        return embeddings[0]

    def generate_chat_response(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        prefer_model: Optional[str] = None
    ) -> str:
        """
        Generates text response from Gemini with automatic fallback on quota exhaustion (429).
        """
        models_to_try = [prefer_model or PRIMARY_CHAT_MODEL]
        if FALLBACK_CHAT_MODEL not in models_to_try:
            models_to_try.append(FALLBACK_CHAT_MODEL)

        last_error = None
        for model_name in models_to_try:
            try:
                # Use minimal thinking for flash-lite, or low thinking for 3.8-flash for speed
                thinking_level = types.ThinkingLevel.MINIMAL if "lite" in model_name else types.ThinkingLevel.LOW
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.3,
                    thinking_config=types.ThinkingConfig(thinking_level=thinking_level),
                )
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config,
                )
                text = response.text
                if text is None:
                    raise ValueError(f"Model {model_name} returned empty text")
                return text.strip()
            except (ClientError, APIError) as e:
                err_str = str(e)
                logger.warning(f"Gemini call with {model_name} failed: {err_str}")
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    last_error = e
                    continue
                raise e
            except Exception as e:
                logger.error(f"Unexpected error calling Gemini {model_name}: {e}")
                last_error = e
                continue

        raise last_error or RuntimeError("All Gemini chat models failed")

    def generate_structured_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        prefer_model: Optional[str] = None
    ) -> Any:
        """
        Generates structured JSON from Gemini using response_mime_type="application/json".
        """
        models_to_try = [prefer_model or PRIMARY_CHAT_MODEL]
        if FALLBACK_CHAT_MODEL not in models_to_try:
            models_to_try.append(FALLBACK_CHAT_MODEL)

        last_error = None
        for model_name in models_to_try:
            try:
                thinking_level = types.ThinkingLevel.MINIMAL if "lite" in model_name else types.ThinkingLevel.LOW
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2,
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(thinking_level=thinking_level),
                )
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config,
                )
                raw_text = response.text
                if not raw_text:
                    raise ValueError("Model returned empty text for structured JSON request")

                # Parse JSON
                cleaned_text = raw_text.strip()
                if cleaned_text.startswith("```json"):
                    cleaned_text = cleaned_text[7:]
                if cleaned_text.startswith("```"):
                    cleaned_text = cleaned_text[3:]
                if cleaned_text.endswith("```"):
                    cleaned_text = cleaned_text[:-3]
                cleaned_text = cleaned_text.strip()

                parsed = json.loads(cleaned_text)
                return parsed
            except (ClientError, APIError) as e:
                err_str = str(e)
                logger.warning(f"Structured JSON call with {model_name} failed: {err_str}")
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    last_error = e
                    continue
                raise e
            except json.JSONDecodeError as e:
                logger.error(f"Failed to decode model JSON output: {raw_text}")
                raise ValueError(f"Model output was not valid JSON: {str(e)}")
            except Exception as e:
                logger.error(f"Error generating structured JSON with {model_name}: {e}")
                last_error = e
                continue

        raise last_error or RuntimeError("All Gemini structured models failed")

# Global singleton
gemini_service = GeminiService()

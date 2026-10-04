"""
Gemini AI service layer for JalRakshak.

Uses google-generativeai (google.generativeai) which is already installed.
All Gemini interactions are isolated here — no other module touches the
API key or the SDK client directly.
"""

from __future__ import annotations

import logging
import warnings
from typing import Any, Dict, List, Optional

# Suppress the deprecation FutureWarning from the google.generativeai package
# so it does not pollute server logs.
with warnings.catch_warnings():
    warnings.simplefilter("ignore", FutureWarning)
    import google.generativeai as genai

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Model name ────────────────────────────────────────────────────────────────
GEMINI_MODEL = "gemini-1.5-flash"

# ── Lazy-initialised model ────────────────────────────────────────────────────
_model: Optional[genai.GenerativeModel] = None


def _get_model() -> genai.GenerativeModel:
    """Return (and cache) the configured GenerativeModel instance."""
    global _model
    if _model is None:
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. "
                "Add it to backend/.env and restart the server."
            )
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", FutureWarning)
            genai.configure(api_key=api_key)
            _model = genai.GenerativeModel(GEMINI_MODEL)
        logger.info("Gemini model '%s' initialised.", GEMINI_MODEL)
    return _model


# ── Error classification ──────────────────────────────────────────────────────

class GeminiError(Exception):
    """Raised when a Gemini API call fails in a known, classifiable way."""

    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.status_code = status_code


def _classify_error(exc: Exception) -> GeminiError:
    """Map exceptions to friendly GeminiError messages with HTTP status codes."""
    exc_type = type(exc).__name__
    exc_str = str(exc).lower()

    # ── Network / connectivity errors (check FIRST before API errors) ─────────
    network_keywords = ("connection", "timeout", "network", "unreachable", "reset", "eof")
    if any(kw in exc_str for kw in network_keywords):
        return GeminiError(
            "Network error communicating with Gemini. "
            "Please check your internet connection and try again.",
            status_code=503,
        )

    # ── Try to import google.api_core exceptions for precise matching ─────────
    try:
        from google.api_core import exceptions as gapi_exc

        if isinstance(exc, (gapi_exc.Unauthenticated, gapi_exc.PermissionDenied)):
            exc_str_full = str(exc)
            if "SERVICE_DISABLED" in exc_str_full or "has not been used" in exc_str_full:
                # Extract activation URL if present
                url = "https://console.developers.google.com/apis/api/generativelanguage.googleapis.com/"
                import re
                match = re.search(r"https://console\.developers\.google\.com[^\s\"']+", exc_str_full)
                if match:
                    url = match.group(0)
                return GeminiError(
                    f"Gemini API is not enabled on your Google Cloud project. "
                    f"Visit this URL to enable it, then wait ~2 minutes and retry: {url}",
                    status_code=403,
                )
            return GeminiError(
                "Gemini API key is invalid or lacks permission. "
                "Check GEMINI_API_KEY in backend/.env.",
                status_code=401,
            )
        if isinstance(exc, gapi_exc.ResourceExhausted):
            return GeminiError(
                "Gemini API quota or rate limit exceeded. "
                "Please wait a moment and try again.",
                status_code=429,
            )
        if isinstance(exc, gapi_exc.InvalidArgument):
            return GeminiError(
                f"Invalid request sent to Gemini: {exc}",
                status_code=400,
            )
        if isinstance(exc, gapi_exc.ServiceUnavailable):
            return GeminiError(
                "Gemini service is temporarily unavailable. Please retry shortly.",
                status_code=503,
            )
        if isinstance(exc, gapi_exc.GoogleAPICallError):
            return GeminiError(f"Gemini API error: {exc}", status_code=502)
    except ImportError:
        pass  # google.api_core not available, fall through to string-based matching

    # ── Fallback: string-based classification ─────────────────────────────────
    if any(kw in exc_str for kw in ("api_key", "unauthenticated", "permission denied", "invalid key")):
        return GeminiError(
            "Gemini API key is invalid or lacks permission. "
            "Check GEMINI_API_KEY in backend/.env.",
            status_code=401,
        )
    if any(kw in exc_str for kw in ("quota", "rate limit", "resource exhausted")):
        return GeminiError(
            "Gemini API quota or rate limit exceeded. Please wait and try again.",
            status_code=429,
        )

    return GeminiError(f"Unexpected Gemini error ({exc_type}): {exc}", status_code=500)


# ── Public helpers ────────────────────────────────────────────────────────────

def generate_text(prompt: str) -> str:
    """
    Send a plain-text prompt to Gemini and return the response text.

    Raises:
        GeminiError: on any Gemini-specific failure.
        RuntimeError: when the API key is missing.
    """
    try:
        model = _get_model()
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", FutureWarning)
            response = model.generate_content(prompt)
        return response.text
    except (GeminiError, RuntimeError):
        raise
    except Exception as exc:
        raise _classify_error(exc) from exc


def analyze_watershed_image(
    image_id: str,
    category: str,
    confidence: float,
    additional_context: Optional[str] = None,
) -> str:
    """
    Ask Gemini to provide an expert interpretation of a watershed detection result.
    Returns a plain-text explanation (1-3 sentences).
    """
    context_line = f"\nAdditional context: {additional_context}" if additional_context else ""
    prompt = (
        "You are an expert in watershed management and environmental monitoring in India. "
        "A computer vision model has analysed a field photograph and produced the following result:\n\n"
        f"Intervention type detected: {category}\n"
        f"Confidence score: {confidence:.1f}%{context_line}\n\n"
        "In 1-3 concise sentences, explain what this detection means for the watershed's health, "
        "what follow-up action a field officer should take, and any caution about the confidence level."
    )
    return generate_text(prompt)


def chat(
    messages: List[Dict[str, str]],
    system_instruction: Optional[str] = None,
) -> str:
    """
    Multi-turn conversation with Gemini.

    Args:
        messages: list of {"role": "user"|"model", "parts": "text"} dicts.
        system_instruction: optional system prompt string.

    Returns:
        The model's reply as a string.
    """
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", FutureWarning)

            api_key = settings.GEMINI_API_KEY
            if not api_key:
                raise RuntimeError("GEMINI_API_KEY is not set.")

            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                GEMINI_MODEL,
                system_instruction=system_instruction,
            )
            history = [
                {"role": m["role"], "parts": [m["parts"]]}
                for m in messages[:-1]
            ]
            session = model.start_chat(history=history)
            last_text = messages[-1].get("parts", "") if messages else ""
            response = session.send_message(last_text)
        return response.text
    except (GeminiError, RuntimeError):
        raise
    except Exception as exc:
        raise _classify_error(exc) from exc


def get_status() -> Dict[str, Any]:
    """
    Return Gemini availability status (no API call made — key presence only).
    Used by /health endpoint.
    """
    key_configured = bool(settings.GEMINI_API_KEY)
    return {
        "configured": key_configured,
        "model": GEMINI_MODEL,
        "status": "ready" if key_configured else "missing_api_key",
    }

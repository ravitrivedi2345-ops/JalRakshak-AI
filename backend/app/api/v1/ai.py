"""
AI / Gemini API routes for JalRakshak.

Exposes:
  POST /api/v1/ai/chat        — general chat with Gemini
  POST /api/v1/ai/analyze     — watershed-specific analysis prompt
  GET  /api/v1/ai/status      — Gemini configuration health
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.gemini_service import (
    GeminiError,
    analyze_watershed_image,
    chat,
    generate_text,
    get_status,
)

router = APIRouter(prefix="/ai", tags=["Gemini AI"])


# ── Request / Response schemas ────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str          # "user" or "model"
    parts: str         # message text


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    system_instruction: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    model: str = "gemini-1.5-flash"


class AnalyzeRequest(BaseModel):
    image_id: str
    category: str
    confidence: float
    additional_context: Optional[str] = None


class AnalyzeResponse(BaseModel):
    image_id: str
    insight: str
    model: str = "gemini-1.5-flash"


class PromptRequest(BaseModel):
    prompt: str


class PromptResponse(BaseModel):
    text: str
    model: str = "gemini-1.5-flash"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _gemini_http_error(exc: GeminiError) -> HTTPException:
    return HTTPException(status_code=exc.status_code, detail=str(exc))


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/status", response_model=Dict[str, Any])
def gemini_status():
    """Return Gemini configuration status (no API call made)."""
    return get_status()


@router.post("/prompt", response_model=PromptResponse)
def gemini_prompt(body: PromptRequest):
    """
    Send an arbitrary text prompt to Gemini and receive the response.
    Useful for quick integration testing.
    """
    try:
        text = generate_text(body.prompt)
        return PromptResponse(text=text)
    except GeminiError as exc:
        raise _gemini_http_error(exc)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post("/chat", response_model=ChatResponse)
def gemini_chat(body: ChatRequest):
    """
    Multi-turn conversation with Gemini.
    Pass the full message history; the model replies to the last user message.
    """
    try:
        messages = [m.model_dump() for m in body.messages]
        reply = chat(messages, system_instruction=body.system_instruction)
        return ChatResponse(reply=reply)
    except GeminiError as exc:
        raise _gemini_http_error(exc)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post("/analyze", response_model=AnalyzeResponse)
def gemini_analyze(body: AnalyzeRequest):
    """
    Ask Gemini to interpret a watershed CV detection result.
    Returns expert advice for field officers.
    """
    try:
        insight = analyze_watershed_image(
            image_id=body.image_id,
            category=body.category,
            confidence=body.confidence,
            additional_context=body.additional_context,
        )
        return AnalyzeResponse(image_id=body.image_id, insight=insight)
    except GeminiError as exc:
        raise _gemini_http_error(exc)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

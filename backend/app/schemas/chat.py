from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.message import CitationItem

class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str = Field(..., min_length=1, description="User's query")
    mode: Optional[str] = Field("auto", description="'general', 'rag', or 'auto'")
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None

class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    role: str = "assistant"
    content: str
    citations: Optional[List[CitationItem]] = None
    mode: str


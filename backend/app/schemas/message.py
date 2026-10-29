from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class CitationItem(BaseModel):
    document_id: str
    filename: str
    page: Optional[int] = None
    chunk_index: int
    snippet: str
    score: Optional[float] = None

class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1)
    role: str = "user"
    mode: Optional[str] = "general"

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    citations: Optional[List[CitationItem]] = None
    mode: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


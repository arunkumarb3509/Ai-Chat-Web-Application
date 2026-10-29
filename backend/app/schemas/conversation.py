from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.message import MessageResponse

class ConversationCreate(BaseModel):
    title: Optional[str] = Field("New Conversation", max_length=255)

class ConversationUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)

class ConversationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

class ConversationDetailResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

    model_config = ConfigDict(from_attributes=True)


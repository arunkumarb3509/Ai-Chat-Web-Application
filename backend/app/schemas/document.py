from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class DocumentResponse(BaseModel):
    id: str
    user_id: str
    filename: str
    file_type: str
    file_size: int
    chunk_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentUploadResponse(BaseModel):
    document: DocumentResponse
    message: str


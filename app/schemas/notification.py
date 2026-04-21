"""
Notification schemas
"""
from pydantic import BaseModel
from datetime import datetime

class NotificationResponse(BaseModel):
    id: int
    pharmacy_id: int
    message: str
    type: str
    is_read: int
    created_at: datetime
    
    class Config:
        from_attributes = True
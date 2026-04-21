"""
Medicine Request schemas
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MedicineRequestCreate(BaseModel):
    pharmacy_id: int
    medicine_name: str
    quantity: int
    urgency: str = "medium"
    notes: Optional[str] = None

class MedicineRequestResponse(BaseModel):
    id: int
    pharmacy_id: int
    medicine_name: str
    quantity: int
    urgency: str
    notes: Optional[str]
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

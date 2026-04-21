"""
Surplus listing schemas
"""
from pydantic import BaseModel
from datetime import datetime, date

class SurplusCreate(BaseModel):
    pharmacy_id: int
    medicine_name: str
    quantity: int
    expiry_date: date

class SurplusResponse(BaseModel):
    id: int
    pharmacy_id: int
    medicine_name: str
    quantity: int
    expiry_date: date
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True
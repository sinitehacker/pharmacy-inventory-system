"""
Order schemas for supplier orders
"""
from pydantic import BaseModel
from datetime import datetime

class OrderCreate(BaseModel):
    pharmacy_id: int
    medicine_name: str
    quantity: int
    order_type: str = "supplier_order"

class OrderResponse(BaseModel):
    id: int
    pharmacy_id: int
    medicine_name: str
    quantity: int
    status: str
    eta_days: int
    created_at: datetime
    
    class Config:
        from_attributes = True
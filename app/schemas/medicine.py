"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List

# Medicine schemas
class MedicineBase(BaseModel):
    name: str
    generic_name: Optional[str] = None
    category: Optional[str] = None
    manufacturer: Optional[str] = None

class MedicineCreate(MedicineBase):
    pass

class MedicineResponse(MedicineBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Batch schemas
class BatchBase(BaseModel):
    batch_number: str
    expiry_date: date
    quantity: int = Field(gt=0, description="Quantity must be greater than 0")
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None

class BatchCreate(BatchBase):
    medicine_id: int

class BatchResponse(BatchBase):
    id: int
    medicine_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Sale schemas
class SaleBase(BaseModel):
    medicine_id: int
    batch_id: Optional[int] = None
    quantity: int = Field(gt=0)
    sale_date: date
    price_per_unit: float
    total_amount: float

class SaleCreate(SaleBase):
    pass

class SaleResponse(SaleBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
"""
Pydantic schemas for pharmacy network
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# Pharmacy schemas
class PharmacyBase(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float
    phone: str
    email: Optional[str] = None
    password: Optional[str] = None

class PharmacyCreate(PharmacyBase):
    pass

class PharmacyResponse(PharmacyBase):
    id: int
    registered_at: datetime
    
    class Config:
        from_attributes = True

# Nearby pharmacy response (includes distance)
class NearbyPharmacyResponse(PharmacyResponse):
    distance_km: float
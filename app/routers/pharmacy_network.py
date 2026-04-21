"""
Pharmacy Network API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from math import radians, sin, cos, sqrt, atan2

from app.database.database import get_db
from app.models.pharmacy import Pharmacy
from app.models.surplus import SurplusListing
from app.schemas.pharmacy import (
    PharmacyCreate, PharmacyResponse,
    NearbyPharmacyResponse
)
from app.schemas.surplus import SurplusCreate, SurplusResponse

router = APIRouter(prefix="/api/pharmacy-network", tags=["Pharmacy Network"])

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c

@router.post("/register", response_model=PharmacyResponse)
async def register_pharmacy(
    pharmacy: PharmacyCreate,
    db: Session = Depends(get_db)
):
    db_pharmacy = Pharmacy(**pharmacy.model_dump())
    db.add(db_pharmacy)
    db.commit()
    db.refresh(db_pharmacy)
    return db_pharmacy

@router.get("/pharmacies", response_model=List[PharmacyResponse])
async def get_all_pharmacies(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    pharmacies = db.query(Pharmacy).offset(skip).limit(limit).all()
    return pharmacies

@router.get("/pharmacies/nearby", response_model=List[NearbyPharmacyResponse])
async def get_nearby_pharmacies(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(10),
    db: Session = Depends(get_db)
):
    all_pharmacies = db.query(Pharmacy).all()
    nearby = []
    for pharmacy in all_pharmacies:
        distance = calculate_distance(lat, lon, pharmacy.latitude, pharmacy.longitude)
        if distance <= radius_km:
            nearby.append({
                "id": pharmacy.id,
                "name": pharmacy.name,
                "address": pharmacy.address,
                "latitude": pharmacy.latitude,
                "longitude": pharmacy.longitude,
                "phone": pharmacy.phone,
                "email": pharmacy.email,
                "registered_at": pharmacy.registered_at,
                "distance_km": round(distance, 2)
            })
    nearby.sort(key=lambda x: x["distance_km"])
    return nearby

@router.post("/surplus", response_model=SurplusResponse)
async def add_surplus(
    surplus: SurplusCreate,
    db: Session = Depends(get_db)
):
    pharmacy = db.query(Pharmacy).filter(Pharmacy.id == surplus.pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    db_surplus = SurplusListing(
        pharmacy_id=surplus.pharmacy_id,
        medicine_name=surplus.medicine_name,
        quantity=surplus.quantity,
        expiry_date=surplus.expiry_date,
        status="active"
    )
    db.add(db_surplus)
    db.commit()
    db.refresh(db_surplus)
    return db_surplus

@router.get("/surplus", response_model=List[SurplusResponse])
async def get_surplus(
    medicine_name: Optional[str] = Query(None),
    status: str = Query("active"),
    db: Session = Depends(get_db)
):
    query = db.query(SurplusListing).filter(SurplusListing.status == status)
    if medicine_name:
        query = query.filter(SurplusListing.medicine_name.ilike(f"%{medicine_name}%"))
    return query.all()
"""
Matching API Routes - Smart redistribution and recommendations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.database import get_db
from app.services.matching_service import MatchingService
from app.models.pharmacy import Pharmacy

router = APIRouter(prefix="/api/matching", tags=["Matching"])

@router.get("/surplus/{pharmacy_id}")
async def get_surplus(
    pharmacy_id: int,
    db: Session = Depends(get_db)
):
    """Get surplus items for a specific pharmacy"""
    service = MatchingService(db)
    surplus = service.get_surplus_for_pharmacy(pharmacy_id)
    return {
        "pharmacy_id": pharmacy_id,
        "total_surplus_items": len(surplus),
        "surplus_items": surplus
    }

@router.get("/reorder/{pharmacy_id}")
async def get_reorder_recommendations(
    pharmacy_id: int,
    db: Session = Depends(get_db)
):
    """Get reorder recommendations for a specific pharmacy"""
    service = MatchingService(db)
    recommendations = service.get_reorder_recommendations(pharmacy_id)
    return {
        "pharmacy_id": pharmacy_id,
        "total_recommendations": len(recommendations),
        "recommendations": recommendations
    }

@router.get("/matches")
async def get_smart_matches(
    pharmacy_id: int = Query(..., description="Your pharmacy ID"),
    lat: float = Query(..., description="Your latitude"),
    lon: float = Query(..., description="Your longitude"),
    radius_km: float = Query(20, description="Search radius in km"),
    db: Session = Depends(get_db)
):
    """Get smart redistribution matches with nearby pharmacies"""
    service = MatchingService(db)
    matches = service.get_smart_matches(pharmacy_id, lat, lon, radius_km)
    return {
        "total_matches": len(matches),
        "matches": matches
    }

@router.get("/nearby/{pharmacy_id}")
async def get_nearby_with_surplus(
    pharmacy_id: int,
    radius_km: float = Query(10),
    db: Session = Depends(get_db)
):
    """Get nearby pharmacies and their surplus"""
    pharmacy = db.query(Pharmacy).filter(Pharmacy.id == pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    service = MatchingService(db)
    nearby = service.get_nearby_pharmacies(pharmacy.latitude, pharmacy.longitude, radius_km)
    
    # Get surplus for each nearby pharmacy
    result = []
    for p in nearby:
        if p["id"] != pharmacy_id:
            surplus = service.get_surplus_for_pharmacy(p["id"])
            result.append({
                "pharmacy": p,
                "surplus_items": surplus[:5]
            })
    
    return result
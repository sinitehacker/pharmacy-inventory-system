"""
Matching Explanation API
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.database.database import get_db
from app.models.medicine import Medicine, Batch
from app.models.pharmacy import Pharmacy
from app.services.matching_service import MatchingService

router = APIRouter(prefix="/api/matching-explanation", tags=["Matching Explanation"])

@router.get("/explain/{match_id}")
async def explain_match(
    match_id: int,
    pharmacy_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """Explain why a match was created"""
    
    # This would fetch the actual match details
    # For demo, return a structured explanation
    
    return {
        "match_id": match_id,
        "explanation": {
            "reason": "Surplus available and demand exists",
            "surplus_calculation": "Stock (500) - Predicted Demand (300) - Safety Stock (50) = 150 surplus",
            "demand_calculation": "Requested quantity (100) < Available surplus (150)",
            "expiry_check": "Expiry date (2026-12-31) > 60 days - SAFE",
            "distance_check": "Distance (6.3 km) within acceptable range",
            "verdict": "MATCH CONFIRMED - Redistribution recommended"
        }
    }
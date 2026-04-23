"""
Decision API Routes - Simplified version
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.database.database import get_db
from app.models.medicine import Medicine, Batch

router = APIRouter(prefix="/api/decisions", tags=["Decisions"])

@router.get("/inventory-analysis/{pharmacy_id}")
async def analyze_inventory(
    pharmacy_id: int,
    db: Session = Depends(get_db)
):
    """Analyze all inventory for a pharmacy"""
    try:
        medicines = db.query(Medicine).filter(Medicine.pharmacy_id == pharmacy_id).all()
        
        results = []
        for medicine in medicines:
            batches = db.query(Batch).filter(
                Batch.medicine_id == medicine.id,
                Batch.pharmacy_id == pharmacy_id
            ).all()
            
            total_stock = sum(b.quantity for b in batches)
            
            # Simple calculation without ML
            avg_daily_demand = 30  # Default value
            reorder_point = 50
            safety_stock = 10
            predicted_demand = avg_daily_demand * 30
            surplus = max(0, total_stock - predicted_demand - safety_stock)
            
            results.append({
                "medicine_id": medicine.id,
                "medicine_name": medicine.name,
                "current_stock": total_stock,
                "avg_daily_demand": avg_daily_demand,
                "predicted_30_day_demand": predicted_demand,
                "reorder_point": reorder_point,
                "safety_stock": safety_stock,
                "surplus": surplus,
                "reorder_needed": total_stock < reorder_point,
                "suggested_order": (reorder_point - total_stock + 50) if total_stock < reorder_point else 0
            })
        
        return {
            "pharmacy_id": pharmacy_id,
            "total_medicines": len(results),
            "analysis": results
        }
    except Exception as e:
        return {"error": str(e), "details": "Check backend logs"}
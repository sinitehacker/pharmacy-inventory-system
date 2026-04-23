"""
Expiry Risk API - Direct calculation based on actual data
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.database.database import get_db
from app.models.medicine import Medicine, Batch, Sale

router = APIRouter(prefix="/api/expiry-risk", tags=["Expiry Risk"])

@router.get("/{pharmacy_id}")
async def get_expiry_risk(
    pharmacy_id: int,
    db: Session = Depends(get_db)
):
    """Calculate expiry risk for all medicines in a pharmacy"""
    medicines = db.query(Medicine).filter(Medicine.pharmacy_id == pharmacy_id).all()
    
    high_risk_count = 0
    medium_risk_count = 0
    low_risk_count = 0
    risk_details = []
    
    for medicine in medicines:
        batches = db.query(Batch).filter(
            Batch.medicine_id == medicine.id,
            Batch.pharmacy_id == pharmacy_id
        ).all()
        
        for batch in batches:
            days_until_expiry = (batch.expiry_date - datetime.now().date()).days
            
            # Get sales rate for this medicine
            sales = db.query(Sale).filter(
                Sale.medicine_id == medicine.id,
                Sale.pharmacy_id == pharmacy_id
            ).all()
            
            if len(sales) > 0:
                total_sold = sum(s.quantity for s in sales)
                if len(sales) > 1:
                    days_range = max(1, (max(s.sale_date for s in sales) - min(s.sale_date for s in sales)).days)
                else:
                    days_range = 1
                sales_rate = total_sold / days_range
            else:
                sales_rate = 10
            
            # Calculate days to sell current stock
            days_to_sell = batch.quantity / max(sales_rate, 1)
            
            # Determine risk level
            if days_until_expiry <= 30 or days_to_sell > days_until_expiry:
                risk_level = "High"
                high_risk_count += 1
            elif days_until_expiry <= 90:
                risk_level = "Medium"
                medium_risk_count += 1
            else:
                risk_level = "Low"
                low_risk_count += 1
            
            risk_details.append({
                "medicine_name": medicine.name,
                "batch_id": batch.id,
                "current_stock": batch.quantity,
                "expiry_date": str(batch.expiry_date),
                "days_until_expiry": days_until_expiry,
                "sales_rate": round(sales_rate, 2),
                "days_to_sell": round(days_to_sell, 2),
                "risk_level": risk_level,
                "recommendation": "Immediate action required" if risk_level == "High" else "Monitor closely" if risk_level == "Medium" else "No action needed"
            })
    
    return {
        "pharmacy_id": pharmacy_id,
        "summary": {
            "high_risk": high_risk_count,
            "medium_risk": medium_risk_count,
            "low_risk": low_risk_count,
            "total_batches": high_risk_count + medium_risk_count + low_risk_count
        },
        "details": risk_details
    }
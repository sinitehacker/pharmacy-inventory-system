"""
ML-Enhanced Dashboard API - With Health Score Explanation
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.database.database import get_db
from app.models.medicine import Medicine, Batch, Sale
from app.services.health_score import HealthScoreCalculator
from app.services.decision_service import DecisionService

router = APIRouter(prefix="/api/ml-dashboard", tags=["ML Dashboard"])

@router.get("/summary/{pharmacy_id}")
async def get_ml_dashboard_summary(
    pharmacy_id: int,
    db: Session = Depends(get_db)
):
    try:
        medicines = db.query(Medicine).filter(Medicine.pharmacy_id == pharmacy_id).all()
        
        total_stock = 0
        total_high_risk = 0
        total_medium_risk = 0
        total_reorder_needed = 0
        total_surplus_units = 0
        surplus_medicines_set = set()
        medicine_insights = []
        
        for medicine in medicines:
            batches = db.query(Batch).filter(
                Batch.medicine_id == medicine.id,
                Batch.pharmacy_id == pharmacy_id
            ).all()
            
            current_stock = sum(b.quantity for b in batches)
            total_stock += current_stock
            
            # Get sales data
            sales = db.query(Sale).filter(
                Sale.medicine_id == medicine.id,
                Sale.pharmacy_id == pharmacy_id
            ).order_by(Sale.sale_date.desc()).limit(30).all()
            
            if len(sales) > 0:
                total_sold = sum(s.quantity for s in sales)
                avg_daily_demand = total_sold / len(sales)
            else:
                if pharmacy_id == 1:
                    avg_daily_demand = 20
                elif pharmacy_id == 2:
                    avg_daily_demand = 10
                else:
                    avg_daily_demand = 6
            
            avg_daily_demand = min(max(avg_daily_demand, 5), 30)
            
            # Decision calculations
            reorder_point = DecisionService.calculate_reorder_point(avg_daily_demand, pharmacy_id)
            safety_stock = DecisionService.calculate_safety_stock(avg_daily_demand, pharmacy_id)
            predicted_30 = int(avg_daily_demand * 30)
            surplus = DecisionService.calculate_surplus(current_stock, predicted_30, safety_stock)
            
            if surplus > 0:
                total_surplus_units += surplus
                surplus_medicines_set.add(medicine.name)
            
            if current_stock < reorder_point:
                total_reorder_needed += 1
            
            # Expiry risk - FIXED: Use 30 and 60 day thresholds
            if len(sales) > 0:
                sales_rate = sum(s.quantity for s in sales) / max(len(sales), 1)
            else:
                sales_rate = 5
            
            for batch in batches:
                days_left = (batch.expiry_date - datetime.now().date()).days
                
                # FIXED EXPIRY RISK LOGIC
                # High risk: expiring in <= 30 days
                if days_left <= 30:
                    total_high_risk += 1
                # Medium risk: expiring in 31-60 days
                elif days_left <= 60:
                    total_medium_risk += 1
                # Low risk: more than 60 days - no addition
            
            factor = 2.0 if pharmacy_id == 2 else (1.5 if pharmacy_id == 1 else 1.8)
            medicine_insights.append({
                "medicine_id": medicine.id,
                "medicine_name": medicine.name,
                "current_stock": current_stock,
                "avg_daily_demand": round(avg_daily_demand, 1),
                "predicted_30_day_demand": predicted_30,
                "reorder_point": reorder_point,
                "safety_stock": safety_stock,
                "surplus": surplus,
                "reorder_needed": current_stock < reorder_point,
                "reorder_formula": f"ROP = {round(avg_daily_demand)} × 3 × {factor} = {reorder_point}"
            })
        
        surplus_count = len(surplus_medicines_set)
        score, explanation = HealthScoreCalculator.calculate_health_score(
            len(medicines), total_high_risk, total_reorder_needed, surplus_count
        )
        
        return {
            "pharmacy_id": pharmacy_id,
            "total_medicines": len(medicines),
            "total_stock": total_stock,
            "ml_insights": {
                "total_high_risk_batches": total_high_risk,
                "total_medium_risk_batches": total_medium_risk,
                "medicines_needing_reorder": total_reorder_needed,
                "total_surplus_units": total_surplus_units,
                "surplus_medicines_count": surplus_count,
                "health_score": score,
                "health_score_explanation": explanation
            },
            "medicine_insights": medicine_insights
        }
    except Exception as e:
        return {"error": str(e), "details": "Check backend logs"}
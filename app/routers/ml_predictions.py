"""
ML Prediction API Routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.database.database import get_db
from app.models.medicine import Medicine, Batch, Sale
from app.models.pharmacy import Pharmacy
from app.ml.demand_forecast import DemandForecaster
from app.ml.expiry_risk import ExpiryRiskPredictor

router = APIRouter(prefix="/api/ml", tags=["ML Predictions"])

# Initialize ML models
demand_forecaster = DemandForecaster()
expiry_predictor = ExpiryRiskPredictor()

@router.get("/train/{pharmacy_id}")
async def train_models(
    pharmacy_id: int,
    db: Session = Depends(get_db)
):
    """
    Train ML models using historical sales data for a pharmacy
    """
    # Get sales data for the pharmacy
    sales = db.query(Sale).filter(Sale.pharmacy_id == pharmacy_id).all()
    
    if len(sales) < 30:
        return {"message": "Need at least 30 days of sales data to train models"}
    
    # Convert to DataFrame
    import pandas as pd
    sales_data = pd.DataFrame([{
        'date': s.sale_date,
        'quantity_sold': s.quantity,
        'medicine_id': s.medicine_id
    } for s in sales])
    
    # Get medicines
    medicines = db.query(Medicine).filter(Medicine.pharmacy_id == pharmacy_id).all()
    
    results = {}
    for medicine in medicines:
        med_sales = sales_data[sales_data['medicine_id'] == medicine.id]
        if len(med_sales) >= 30:
            result = demand_forecaster.train(med_sales, medicine.name)
            if result:
                results[medicine.name] = result
    
    return {
        "message": f"Trained models for {len(results)} medicines",
        "results": results
    }

@router.get("/predict-demand/{medicine_id}")
async def predict_demand(
    medicine_id: int,
    pharmacy_id: int = Query(..., description="Pharmacy ID"),
    db: Session = Depends(get_db)
):
    """
    Predict demand for a specific medicine using ML
    """
    medicine = db.query(Medicine).filter(
        Medicine.id == medicine_id,
        Medicine.pharmacy_id == pharmacy_id
    ).first()
    
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    # Get recent sales for this medicine
    sales = db.query(Sale).filter(
        Sale.medicine_id == medicine_id,
        Sale.pharmacy_id == pharmacy_id
    ).order_by(Sale.sale_date.desc()).limit(30).all()
    
    recent_sales = [s.quantity for s in sales]
    
    # Get current stock
    batches = db.query(Batch).filter(
        Batch.medicine_id == medicine_id,
        Batch.pharmacy_id == pharmacy_id
    ).all()
    current_stock = sum(b.quantity for b in batches)
    
    # Predict
    prediction = demand_forecaster.predict(medicine.name, current_stock, recent_sales)
    
    # Calculate reorder point
    reorder_point = demand_forecaster.calculate_reorder_point(prediction['average_daily_demand'])
    
    return {
        "medicine_id": medicine_id,
        "medicine_name": medicine.name,
        "current_stock": current_stock,
        "prediction": prediction,
        "reorder_point": reorder_point,
        "reorder_needed": current_stock < reorder_point,
        "suggested_order": reorder_point - current_stock + 50 if current_stock < reorder_point else 0
    }

@router.get("/expiry-risk/{batch_id}")
async def predict_expiry_risk(
    batch_id: int,
    pharmacy_id: int = Query(..., description="Pharmacy ID"),
    db: Session = Depends(get_db)
):
    """
    Predict expiry risk for a specific batch using ML
    """
    batch = db.query(Batch).filter(
        Batch.id == batch_id,
        Batch.pharmacy_id == pharmacy_id
    ).first()
    
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    medicine = db.query(Medicine).filter(Medicine.id == batch.medicine_id).first()
    
    # Get sales rate for this medicine
    sales = db.query(Sale).filter(
        Sale.medicine_id == batch.medicine_id,
        Sale.pharmacy_id == pharmacy_id
    ).all()
    
    if len(sales) > 0:
        total_quantity = sum(s.quantity for s in sales)
        days_range = max(1, (max(s.sale_date for s in sales) - min(s.sale_date for s in sales)).days)
        sales_rate = total_quantity / days_range
    else:
        sales_rate = 10
    
    # Predict demand
    recent_sales = [s.quantity for s in sales[-30:]] if sales else []
    demand_prediction = demand_forecaster.predict(medicine.name, batch.quantity, recent_sales)
    predicted_demand = demand_prediction['total_30_day_forecast']
    
    days_until_expiry = (batch.expiry_date - datetime.now().date()).days
    
    # Predict expiry risk
    risk_level, probability = expiry_predictor.predict(
        medicine.name,
        batch.quantity,
        days_until_expiry,
        predicted_demand,
        sales_rate
    )
    
    return {
        "batch_id": batch_id,
        "medicine_name": medicine.name,
        "current_stock": batch.quantity,
        "days_until_expiry": days_until_expiry,
        "predicted_30_day_demand": predicted_demand,
        "risk_level": risk_level,
        "risk_probability": round(probability, 2),
        "recommendation": "Immediate action required" if risk_level == "High" else "Monitor closely" if risk_level == "Medium" else "No immediate action"
    }
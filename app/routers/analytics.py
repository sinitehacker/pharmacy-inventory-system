"""
Analytics API Routes - Exposes Person B's data to frontend
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime

from app.services.analytics_service import AnalyticsService
from app.services.advisory_engine import AdvisoryEngine

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# Initialize services
analytics_service = AnalyticsService()
advisory_engine = AdvisoryEngine()

@router.get("/dashboard")
async def get_dashboard():
    """Get dashboard summary with key metrics"""
    return advisory_engine.get_dashboard_summary()

@router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics"""
    return analytics_service.get_dashboard_stats()

@router.get("/risk-report")
async def get_full_risk_report():
    """Get complete risk report from analytics engine"""
    report = analytics_service.load_risk_report()
    if not report:
        raise HTTPException(status_code=404, detail="Risk report not available")
    return report

@router.get("/medicines")
async def get_all_medicines():
    """Get all medicines with their analytics data"""
    medicines = analytics_service.get_all_medicines()
    return medicines

@router.get("/medicines/{medicine_name}")
async def get_medicine_analytics(medicine_name: str):
    """Get analytics for a specific medicine"""
    result = analytics_service.get_medicine_analytics(medicine_name)
    if not result:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return result

@router.get("/high-risk")
async def get_high_risk_medicines():
    """Get all high-risk medicines"""
    return analytics_service.get_high_risk_medicines()

@router.get("/expiry-alerts")
async def get_expiry_alerts(
    days: Optional[int] = Query(30, description="Days threshold for expiry alerts")
):
    """Get medicines expiring within specified days"""
    return analytics_service.get_expiry_alerts(days)

@router.get("/forecast/{medicine_name}")
async def get_forecast_summary(medicine_name: str):
    """Get forecast summary for a medicine"""
    result = analytics_service.get_forecast_summary(medicine_name)
    if not result:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return result

@router.get("/advisories")
async def get_advisories():
    """Get all advisory messages"""
    return advisory_engine.generate_all_advisories()
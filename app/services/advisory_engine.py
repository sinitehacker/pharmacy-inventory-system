"""
Advisory Engine - Generates actionable advice from analytics
"""
from typing import List, Dict
from datetime import datetime
from app.services.analytics_service import AnalyticsService

class AdvisoryEngine:
    """
    Rule-based advisory engine that generates practical advice
    """
    
    def __init__(self):
        self.analytics = AnalyticsService()
    
    def generate_all_advisories(self) -> List[Dict]:
        """Generate all advisory messages"""
        advisories = []
        
        # 1. CRITICAL: Expiring in 30 days
        critical_expiry = self.analytics.get_expiry_alerts(30)
        for alert in critical_expiry:
            advisories.append({
                "id": f"critical_{alert['batch_id']}",
                "type": "CRITICAL_EXPIRY",
                "priority": "HIGH",
                "medicine": alert['medicine_name'],
                "title": "⚠️ CRITICAL: Medicine Expiring Soon!",
                "message": f"{alert['medicine_name']} (Batch: {alert['batch_name']}) expires in {alert['days_until_expiry']} days. {alert['current_stock']} units remaining.",
                "action": "IMMEDIATE ACTION: Offer 40-50% discount or transfer to another pharmacy",
                "details": {
                    "current_stock": alert['current_stock'],
                    "days_to_sell": alert['estimated_days_to_sell'],
                    "expiry_date": alert['expiry_date']
                }
            })
        
        # 2. WARNING: Expiring in 31-90 days
        warning_expiry = self.analytics.get_expiry_alerts(90)
        warning_expiry = [a for a in warning_expiry if a['days_until_expiry'] > 30]
        for alert in warning_expiry:
            advisories.append({
                "id": f"warning_{alert['batch_id']}",
                "type": "EXPIRY_WARNING",
                "priority": "MEDIUM",
                "medicine": alert['medicine_name'],
                "title": "⚠️ Expiry Warning",
                "message": f"{alert['medicine_name']} expires in {alert['days_until_expiry']} days. Plan promotional pricing.",
                "action": "Consider 20-30% discount or bundle with fast-moving items",
                "details": {
                    "current_stock": alert['current_stock'],
                    "expiry_date": alert['expiry_date']
                }
            })
        
        # 3. HIGH RISK from Person B's engine
        high_risk = self.analytics.get_high_risk_medicines()
        for item in high_risk:
            batch = item['batch']
            # Avoid duplicates if already added from expiry alerts
            if not any(a.get('id') == f"critical_{batch['batch_id']}" for a in advisories):
                advisories.append({
                    "id": f"risk_{batch['batch_id']}",
                    "type": "HIGH_RISK",
                    "priority": "HIGH",
                    "medicine": item['medicine_name'],
                    "title": "📊 High Risk Detected",
                    "message": batch.get('risk_message', 'This batch requires immediate attention'),
                    "action": "Review stock levels and consider immediate action",
                    "details": {
                        "current_stock": batch.get('current_stock'),
                        "days_until_expiry": batch.get('days_until_expiry'),
                        "estimated_days_to_sell": batch.get('estimated_days_to_sell')
                    }
                })
        
        # 4. REORDER recommendations based on forecast
        medicines = self.analytics.get_all_medicines()
        for med in medicines:
            forecast = med.get('forecast_summary', {})
            if forecast:
                total_forecast = forecast.get('total_30_day_forecast', 0)
                # Check actual stock from batches
                batches = med.get('batches', [])
                total_stock = sum(b.get('current_stock', 0) for b in batches)
                
                if total_stock < total_forecast * 0.3 and total_forecast > 0:
                    advisories.append({
                        "id": f"reorder_{med['medicine_name']}",
                        "type": "REORDER",
                        "priority": "MEDIUM",
                        "medicine": med['medicine_name'],
                        "title": "📦 Low Stock Alert",
                        "message": f"{med['medicine_name']} stock is low ({total_stock} units). Expected demand: {total_forecast} units next 30 days.",
                        "action": f"Consider reordering {total_forecast - total_stock} units soon",
                        "details": {
                            "current_stock": total_stock,
                            "forecast_demand": total_forecast,
                            "average_daily_demand": forecast.get('average_daily_demand', 0)
                        }
                    })
        
        # Sort by priority: HIGH > MEDIUM > LOW
        priority_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        advisories.sort(key=lambda x: priority_order.get(x['priority'], 3))
        
        return advisories
    
    def get_dashboard_summary(self) -> Dict:
        """Get dashboard summary with key metrics and top advisories"""
        advisories = self.generate_all_advisories()
        
        # Count by type
        summary = {
            "total_alerts": len(advisories),
            "critical_alerts": len([a for a in advisories if a['type'] == 'CRITICAL_EXPIRY']),
            "warning_alerts": len([a for a in advisories if a['type'] == 'EXPIRY_WARNING']),
            "high_risk": len([a for a in advisories if a['type'] == 'HIGH_RISK']),
            "reorder_needed": len([a for a in advisories if a['type'] == 'REORDER']),
            "top_advisories": advisories[:5]  # Top 5 for dashboard
        }
        
        return summary
"""
Analytics Service - Reads Person B's JSON output and provides structured data
"""
import json
import os
from typing import Dict, List, Optional
from pathlib import Path
from datetime import datetime, timedelta

class AnalyticsService:
    """
    Service to read and serve Person B's analytics data
    """
    
    def __init__(self):
        # Path to your mock JSON in forecasting/data_test
        self.project_root = Path(__file__).parent.parent.parent
        self.risk_report_path = self.project_root / "data" / "final_risk_report.json"
        self.config_path = self.project_root / "forecasting" / "risk_config.json"
        
    def load_risk_report(self) -> Dict:
        """Load the latest risk report from JSON"""
        try:
            if not self.risk_report_path.exists():
                print(f"⚠️ Risk report not found at {self.risk_report_path}")
                return {}
                
            with open(self.risk_report_path, 'r') as f:
                data = json.load(f)
                return data
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON in risk report: {e}")
            return {}
        except Exception as e:
            print(f"❌ Error loading risk report: {e}")
            return {}
    
    def get_all_medicines(self) -> List[Dict]:
        """Get all medicines with their analytics data"""
        report = self.load_risk_report()
        
        if not report:
            return []
        
        # Handle different possible structures
        if isinstance(report, list):
            return report
        elif isinstance(report, dict) and 'medicines' in report:
            return report['medicines']
        elif isinstance(report, dict):
            # Convert dict of medicines to list
            return [{"medicine_name": k, **v} for k, v in report.items()]
        
        return []
    
    def get_medicine_analytics(self, medicine_name: str) -> Optional[Dict]:
        """Get analytics for a specific medicine"""
        medicines = self.get_all_medicines()
        for med in medicines:
            if med.get('medicine_name', '').lower() == medicine_name.lower():
                return med
        return None
    
    def get_high_risk_medicines(self) -> List[Dict]:
        """Get all medicines with high-risk batches"""
        medicines = self.get_all_medicines()
        high_risk = []
        
        for med in medicines:
            batches = med.get('batches', [])
            for batch in batches:
                if batch.get('risk_level') == 'High':
                    high_risk.append({
                        "medicine_name": med.get('medicine_name'),
                        "forecast_summary": med.get('forecast_summary', {}),
                        "batch": batch
                    })
        
        return high_risk
    
    def get_expiry_alerts(self, days_threshold: int = 30) -> List[Dict]:
        """Get medicines expiring within threshold days"""
        medicines = self.get_all_medicines()
        alerts = []
        
        for med in medicines:
            batches = med.get('batches', [])
            for batch in batches:
                days_until_expiry = batch.get('days_until_expiry', 999)
                if 0 <= days_until_expiry <= days_threshold:
                    alerts.append({
                        "medicine_name": med.get('medicine_name'),
                        "batch_id": batch.get('batch_id'),
                        "batch_name": batch.get('batch_name'),
                        "expiry_date": batch.get('expiry_date'),
                        "days_until_expiry": days_until_expiry,
                        "current_stock": batch.get('current_stock'),
                        "estimated_days_to_sell": batch.get('estimated_days_to_sell'),
                        "risk_level": batch.get('risk_level'),
                        "risk_message": batch.get('risk_message')
                    })
        
        # Sort by closest expiry first
        alerts.sort(key=lambda x: x['days_until_expiry'])
        return alerts
    
    def get_forecast_summary(self, medicine_name: str) -> Dict:
        """Get forecast summary for a medicine"""
        medicine = self.get_medicine_analytics(medicine_name)
        if medicine:
            return medicine.get('forecast_summary', {})
        return {}
    
    def get_dashboard_stats(self) -> Dict:
        """Get summary statistics for dashboard"""
        medicines = self.get_all_medicines()
        expiry_alerts = self.get_expiry_alerts(90)
        high_risk = self.get_high_risk_medicines()
        
        # Calculate total stock value (if available)
        total_medicines = len(medicines)
        total_high_risk = len(high_risk)
        total_expiry_risk = len([a for a in expiry_alerts if a['days_until_expiry'] <= 30])
        
        # Calculate average forecast accuracy (using MAE)
        total_mae = 0
        medicines_with_mae = 0
        for med in medicines:
            forecast = med.get('forecast_summary', {})
            if 'MAE' in forecast:
                total_mae += forecast['MAE']
                medicines_with_mae += 1
        
        avg_mae = round(total_mae / medicines_with_mae, 2) if medicines_with_mae > 0 else 0
        
        return {
            "total_medicines": total_medicines,
            "high_risk_medicines": total_high_risk,
            "expiring_in_30_days": total_expiry_risk,
            "expiring_in_90_days": len(expiry_alerts),
            "average_forecast_error": avg_mae,
            "last_updated": datetime.now().isoformat()
        }
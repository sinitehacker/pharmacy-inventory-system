# forecasting/risk_calculator.py
import pandas as pd
import os
from datetime import datetime
import json

class RiskCalculator:
    """
    Calculates expiry risk per batch using forecasted demand.
    Can load either raw or preprocessed inventory.
    """
    def __init__(self, data_dir, forecaster):
        self.data_dir = data_dir
        self.forecaster = forecaster
        self.today = datetime.now().date()
        self.inventory_df = None
        
        # Load configuration (FIX ADDED HERE)
        config_path = os.path.join(data_dir, '..', 'risk_config.json')
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        else:
            # Default config if file not found
            self.config = {
                'absolute_expiry_alert_days': 180,
                'absolute_alert_risk_level': 'Medium'
            }
    
    def load_inventory(self, preprocessed=False):
        """Load inventory data. If preprocessed, expect cleaned columns."""
        if preprocessed:
            path = os.path.join(self.data_dir, 'inventory_cleaned.csv')
        else:
            path = os.path.join(self.data_dir, 'inventory_data.csv')
        
        self.inventory_df = pd.read_csv(path)
        if not preprocessed:
            self.inventory_df['expiry_date'] = pd.to_datetime(self.inventory_df['expiry_date']).dt.date
        else:
            self.inventory_df['expiry_date'] = pd.to_datetime(self.inventory_df['expiry_date']).dt.date
        
        print(f"✅ Loaded inventory: {len(self.inventory_df)} records")
        return self.inventory_df
    
    def calculate_risk_for_batch(self, row, avg_daily):
        """Apply refined risk rules and add friendly message."""
        expiry = row['expiry_date']
        days_until = (expiry - self.today).days
        if days_until < 0:
            days_until = 0
        
        stock = row['current_stock']
        if avg_daily <= 0:
            est_days = float('inf')
        else:
            est_days = stock / avg_daily
        
        # Determine risk level
        if est_days > days_until:
            risk = "High"
        elif est_days >= 0.75 * days_until:
            risk = "Medium"
        else:
            risk = "Low"

        # Absolute expiry alert (overrides risk if days until expiry <= threshold)
        # FIX ADDED HERE: Use self.config with default fallback
        alert_days = self.config.get('absolute_expiry_alert_days')
        alert_level = self.config.get('absolute_alert_risk_level', 'Medium')
        if alert_days and days_until <= alert_days:
            risk = alert_level
        
        # Friendly message mapping
        risk_messages = {
    "High": "⚠️ This batch is expiring soon. Please consider discounting or transferring to avoid waste.",
    "Medium": "🟡 This batch requires attention. Monitor usage and plan ahead.",
    "Low": "✅ This batch is in good standing. No immediate action needed."
        }
        risk_msg = risk_messages.get(risk, risk)
        
        return {
            'batch_id': row['batch_id'],
            'batch_name': row.get('batch_name', row['batch_id']),  # fallback if not present
            'current_stock': int(stock),
            'days_until_expiry': days_until,
            'expiry_date': str(expiry),
            'forecasted_daily_demand': int(round(avg_daily)) if avg_daily is not None else None,
            'estimated_days_to_sell': int(round(est_days)) if est_days != float('inf') else None,
            'risk_level': risk,
            'risk_message': risk_msg
        }
    
    def generate_report(self):
        """Produce full risk report with overall risk per medicine."""
        if self.inventory_df is None:
            self.load_inventory()
        
        medicines = self.inventory_df['medicine_name'].unique()
        report = []
        
        for med in medicines:
            avg_daily = self.forecaster.get_avg_daily_forecast(med)
            if avg_daily is None:
                print(f"⚠️ No forecast for {med}, skipping risk.")
                continue
            
            med_inv = self.inventory_df[self.inventory_df['medicine_name'] == med]
            batches = []
            for _, row in med_inv.iterrows():
                batch_risk = self.calculate_risk_for_batch(row, avg_daily)
                batches.append(batch_risk)
            
            # Overall risk: High if any batch High, else Medium if any Medium, else Low
            overall = "Low"
            if any(b['risk_level'] == 'High' for b in batches):
                overall = "High"
            elif any(b['risk_level'] == 'Medium' for b in batches):
                overall = "Medium"
            
            report.append({
                'medicine_name': med,
                'overall_risk': overall,
                'batches': batches
            })
        
        return report
    
    def save_report(self, report, filename='risk_report.json'):
        path = os.path.join(self.data_dir, filename)
        with open(path, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"✅ Risk report saved to {path}")
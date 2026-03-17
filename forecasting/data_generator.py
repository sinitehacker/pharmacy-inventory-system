import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os

print("Current working directory:", os.getcwd())
print("Script location:", os.path.dirname(os.path.abspath(__file__)))

class PharmacyDataGenerator:
    """
    Generates synthetic Indian pharmacy sales data for ~1000 days
    with realistic medicine names, categories, and seasonal patterns.
    """
    
    def __init__(self, start_date='2022-01-01', num_days=1000):
        self.start_date = datetime.strptime(start_date, '%Y-%m-%d')
        self.num_days = num_days
        self.dates = [self.start_date + timedelta(days=i) for i in range(num_days)]
        
        # 50 Indian medicines with categories and base daily sales
        self.medicines = {
            # Pain/fever
            'Paracetamol': {'category': 'pain', 'base_daily': 25, 'seasonal': True},
            'Dolo 650': {'category': 'pain', 'base_daily': 20, 'seasonal': True},
            'Combiflam': {'category': 'pain', 'base_daily': 15, 'seasonal': True},
            'Aspirin': {'category': 'pain', 'base_daily': 10, 'seasonal': False},
            # Antibiotics
            'Amoxicillin': {'category': 'antibiotic', 'base_daily': 12, 'seasonal': False},
            'Azithromycin': {'category': 'antibiotic', 'base_daily': 8, 'seasonal': True},
            'Ciprofloxacin': {'category': 'antibiotic', 'base_daily': 7, 'seasonal': False},
            'Doxycycline': {'category': 'antibiotic', 'base_daily': 6, 'seasonal': False},
            # Allergy
            'Cetirizine': {'category': 'allergy', 'base_daily': 18, 'seasonal': True},
            'Levocetirizine': {'category': 'allergy', 'base_daily': 14, 'seasonal': True},
            'Fexofenadine': {'category': 'allergy', 'base_daily': 10, 'seasonal': True},
            # Gastric
            'Omeprazole': {'category': 'gastric', 'base_daily': 16, 'seasonal': False},
            'Pantoprazole': {'category': 'gastric', 'base_daily': 14, 'seasonal': False},
            'Ranitidine': {'category': 'gastric', 'base_daily': 12, 'seasonal': False},
            # Diabetes
            'Metformin': {'category': 'diabetes', 'base_daily': 30, 'seasonal': False},
            'Glimepiride': {'category': 'diabetes', 'base_daily': 18, 'seasonal': False},
            'Pioglitazone': {'category': 'diabetes', 'base_daily': 12, 'seasonal': False},
            # BP
            'Amlodipine': {'category': 'bp', 'base_daily': 22, 'seasonal': False},
            'Losartan': {'category': 'bp', 'base_daily': 18, 'seasonal': False},
            'Metoprolol': {'category': 'bp', 'base_daily': 15, 'seasonal': False},
            # Supplements
            'Vitamin D': {'category': 'supplement', 'base_daily': 28, 'seasonal': True},
            'Calcium': {'category': 'supplement', 'base_daily': 20, 'seasonal': False},
            'Multivitamin': {'category': 'supplement', 'base_daily': 25, 'seasonal': False},
            # Cold/flu
            'Coldact': {'category': 'cold', 'base_daily': 12, 'seasonal': True},
            'Sinarest': {'category': 'cold', 'base_daily': 10, 'seasonal': True},
            'Vicks Action 500': {'category': 'cold', 'base_daily': 14, 'seasonal': True},
            # Ayurvedic
            'Chyawanprash': {'category': 'ayurvedic', 'base_daily': 8, 'seasonal': True},
            'Triphala': {'category': 'ayurvedic', 'base_daily': 6, 'seasonal': False},
            # Add more to reach 50 (you can extend this list)
        }
        # Ensure we have 50; if less, duplicate some with variations
        while len(self.medicines) < 50:
            for name in list(self.medicines.keys()):
                new_name = name + " Plus"
                if new_name not in self.medicines:
                    self.medicines[new_name] = self.medicines[name].copy()
                    self.medicines[new_name]['base_daily'] = int(self.medicines[name]['base_daily'] * 0.9)
                    if len(self.medicines) >= 50:
                        break
    
    def generate_sales_data(self):
        """Generate daily sales data for all medicines"""
        all_records = []
        
        for medicine, properties in self.medicines.items():
            for date in self.dates:
                base = properties['base_daily']
                day_of_week = date.weekday()
                weekend_factor = 1.3 if day_of_week >= 5 else 1.0
                month = date.month
                
                # Seasonal patterns for India
                seasonal_factor = 1.0
                if properties['seasonal']:
                    # Allergy: March-April (spring), September-October (autumn)
                    if medicine in ['Cetirizine', 'Levocetirizine', 'Fexofenadine']:
                        seasonal_factor = 1.6 if month in [3,4,9,10] else 0.9
                    # Cold/flu: December-February (winter), July-August (monsoon?)
                    elif medicine in ['Coldact', 'Sinarest', 'Vicks Action 500']:
                        seasonal_factor = 1.5 if month in [12,1,2,7,8] else 0.9
                    # Pain: more in monsoon (humidity) and winter
                    elif medicine in ['Paracetamol', 'Dolo 650', 'Combiflam']:
                        seasonal_factor = 1.3 if month in [6,7,8,12,1] else 1.0
                    # Supplements: more in winter
                    elif medicine == 'Vitamin D':
                        seasonal_factor = 1.4 if month in [11,12,1,2] else 0.9
                    # Antibiotics: slight increase in monsoon
                    elif medicine in ['Azithromycin']:
                        seasonal_factor = 1.2 if month in [6,7,8,9] else 1.0
                
                daily_sales = int(base * weekend_factor * seasonal_factor * 
                                 random.uniform(0.7, 1.3))
                daily_sales = max(1, daily_sales)
                
                record = {
                    'date': date.strftime('%Y-%m-%d'),
                    'medicine_name': medicine,
                    'category': properties['category'],
                    'daily_sales': daily_sales,
                }
                all_records.append(record)
        
        df = pd.DataFrame(all_records)
        return df
    
    def add_inventory_data(self, sales_df):
        """Generate inventory with current stock and expiry dates (no precomputed days)"""
        inventory_records = []
        current_date = self.dates[-1]  # last date in dataset
        medicines = sales_df['medicine_name'].unique()
        
        for medicine in medicines:
            medicine_sales = sales_df[sales_df['medicine_name'] == medicine]
            avg_daily_sales = medicine_sales['daily_sales'].mean()
            
            # Total stock for this medicine (spread across 3 batches)
            total_stock = int(avg_daily_sales * random.randint(20, 60))  # 20-60 days of stock
            
            for batch in range(3):
                # Random expiry from 15 to 365 days from now
                days_to_expiry = random.choice([15, 30, 45, 60, 90, 180, 270, 365])
                expiry_date = current_date + timedelta(days=days_to_expiry)
                
                # Batch size (roughly 1/3 of total)
                if batch < 2:
                    batch_size = total_stock // 3
                else:
                    batch_size = total_stock - 2 * (total_stock // 3)
                
                # Create human‑readable batch name
                batch_id = f"{medicine[:3]}_{batch}_{current_date.strftime('%Y%m')}"
                batch_name = f"Batch {batch+1} (exp {expiry_date.strftime('%b %Y')})"
                
                inventory_records.append({
                    'medicine_name': medicine,
                    'batch_id': batch_id,
                    'batch_name': batch_name,
                    'current_stock': batch_size,
                    'expiry_date': expiry_date.strftime('%Y-%m-%d'),
                })
        
        inventory_df = pd.DataFrame(inventory_records)
        return inventory_df
    
    def save_datasets(self, sales_df, inventory_df):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(script_dir, '..', 'data')
        os.makedirs(data_dir, exist_ok=True)
        
        sales_path = os.path.join(data_dir, 'sales_data.csv')
        inventory_path = os.path.join(data_dir, 'inventory_data.csv')
        
        sales_df.to_csv(sales_path, index=False)
        inventory_df.to_csv(inventory_path, index=False)
        
        print(f"✅ Datasets saved to {data_dir}")
        print(f"   Sales records: {len(sales_df)}")
        print(f"   Inventory records: {len(inventory_df)}")

if __name__ == "__main__":
    generator = PharmacyDataGenerator()
    sales_data = generator.generate_sales_data()
    inventory_data = generator.add_inventory_data(sales_data)
    generator.save_datasets(sales_data, inventory_data)
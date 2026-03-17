# forecasting/preprocess.py
import pandas as pd
import os
from datetime import datetime

class DataPreprocessor:
    """
    Explicitly preprocesses raw sales and inventory data.
    Each step is printed so the user can see the transformation.
    """
    
    def __init__(self, data_dir):
        self.data_dir = data_dir
        self.raw_sales = None
        self.raw_inventory = None
        self.cleaned_sales = None
        self.cleaned_inventory = None
    
    def load_raw_data(self):
        """Load raw CSV files."""
        print("\n📂 Step 1: Loading raw data...")
        sales_path = os.path.join(self.data_dir, 'sales_data.csv')
        inventory_path = os.path.join(self.data_dir, 'inventory_data.csv')
        
        self.raw_sales = pd.read_csv(sales_path)
        self.raw_inventory = pd.read_csv(inventory_path)
        
        print(f"   Raw sales: {len(self.raw_sales)} rows, columns: {list(self.raw_sales.columns)}")
        print(f"   Raw inventory: {len(self.raw_inventory)} rows, columns: {list(self.raw_inventory.columns)}")
        return self.raw_sales, self.raw_inventory
    
    def preprocess_sales(self):
        """Clean and prepare sales data for Prophet."""
        print("\n🔄 Step 2: Preprocessing sales data...")
        df = self.raw_sales.copy()
        
        # Convert date column to datetime
        print("   - Converting 'date' to datetime")
        df['date'] = pd.to_datetime(df['date'])
        
        # Prophet requires columns 'ds' and 'y'
        print("   - Renaming columns: date → ds, daily_sales → y")
        df = df.rename(columns={'date': 'ds', 'daily_sales': 'y'})
        
        # Ensure no missing values
        print("   - Checking for missing values")
        if df.isnull().sum().any():
            print("     ⚠️ Missing values found – dropping rows")
            df = df.dropna()
        else:
            print("     ✅ No missing values")
        
        # Sort by date
        df = df.sort_values('ds')
        
        self.cleaned_sales = df
        print(f"   ✅ Sales data ready. Shape: {df.shape}, columns: {list(df.columns)}")
        return self.cleaned_sales
    
    def preprocess_inventory(self):
        """Clean inventory data and add derived features."""
        print("\n🔄 Step 3: Preprocessing inventory data...")
        df = self.raw_inventory.copy()
        
        # Convert expiry_date to datetime
        print("   - Converting 'expiry_date' to datetime")
        df['expiry_date'] = pd.to_datetime(df['expiry_date']).dt.date
        
        # Calculate days until expiry dynamically
        today = datetime.now().date()
        print(f"   - Calculating days until expiry (today = {today})")
        df['days_until_expiry'] = (pd.to_datetime(df['expiry_date']) - pd.Timestamp(today)).dt.days
        df['days_until_expiry'] = df['days_until_expiry'].clip(lower=0)  # no negative
        
        # Ensure batch_name exists (create if missing)
        if 'batch_name' not in df.columns:
            print("   - Creating human‑readable batch_name")
            df['batch_name'] = df.apply(
                lambda row: f"Batch {row.name+1} (exp {row['expiry_date']})", axis=1
            )
        
        self.cleaned_inventory = df
        print(f"   ✅ Inventory data ready. Shape: {df.shape}, columns: {list(df.columns)}")
        return self.cleaned_inventory
    
    def save_cleaned_data(self):
        """Optional: save cleaned versions for inspection."""
        print("\n💾 Step 4: Saving cleaned data (optional)...")
        sales_clean_path = os.path.join(self.data_dir, 'sales_cleaned.csv')
        inv_clean_path = os.path.join(self.data_dir, 'inventory_cleaned.csv')
        
        self.cleaned_sales.to_csv(sales_clean_path, index=False)
        self.cleaned_inventory.to_csv(inv_clean_path, index=False)
        
        print(f"   ✅ Cleaned sales saved to {sales_clean_path}")
        print(f"   ✅ Cleaned inventory saved to {inv_clean_path}")
    
    def run_all(self):
        """Execute full preprocessing pipeline."""
        print("="*50)
        print("🔧 DATA PREPROCESSING PIPELINE")
        print("="*50)
        self.load_raw_data()
        self.preprocess_sales()
        self.preprocess_inventory()
        self.save_cleaned_data()
        print("\n✅ Preprocessing complete!\n")
        return self.cleaned_sales, self.cleaned_inventory

if __name__ == "__main__":
    # Test run
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, '..', 'data')
    preprocessor = DataPreprocessor(data_dir)
    preprocessor.run_all()
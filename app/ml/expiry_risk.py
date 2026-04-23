"""
Expiry Risk Prediction using Logistic Regression
"""
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
import joblib
import os

class ExpiryRiskPredictor:
    """
    Predicts if a medicine batch will expire before being sold
    Output: 0 = Safe, 1 = High expiry risk
    """
    def __init__(self):
        self.model = None
        self.models_dir = "app/ml/models"
        os.makedirs(self.models_dir, exist_ok=True)
    
    def prepare_features(self, inventory_data, sales_data):
        """
        Prepare features for classification:
        - current_stock
        - predicted_demand (30 days)
        - days_until_expiry
        - sales_rate (units per day)
        """
        df = inventory_data.copy()
        
        # Calculate sales rate from historical data
        if len(sales_data) > 0:
            sales_rate = sales_data['quantity_sold'].mean()
        else:
            sales_rate = 10
        
        # Create features
        df['sales_rate'] = sales_rate
        df['stock_to_demand_ratio'] = df['current_stock'] / (df['predicted_demand'] + 1)
        df['expiry_to_sales_ratio'] = df['days_until_expiry'] / (df['sales_rate'] + 1)
        
        # Target: 1 if expiry < days_to_sell, else 0
        days_to_sell = df['current_stock'] / (df['sales_rate'] + 1)
        df['target'] = (df['days_until_expiry'] < days_to_sell).astype(int)
        
        feature_cols = ['current_stock', 'predicted_demand', 'days_until_expiry', 
                       'sales_rate', 'stock_to_demand_ratio', 'expiry_to_sales_ratio']
        
        return df[feature_cols], df['target']
    
    def train(self, inventory_data, sales_data, medicine_name):
        """
        Train Logistic Regression model for expiry risk
        """
        X, y = self.prepare_features(inventory_data, sales_data)
        
        if len(X) < 10:
            print(f"Not enough data for {medicine_name} expiry risk model")
            return None
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        model = LogisticRegression(random_state=42)
        model.fit(X_train, y_train)
        
        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"⚠️ {medicine_name}: Expiry Risk Model Accuracy = {accuracy:.2f}")
        
        # Save model
        model_path = os.path.join(self.models_dir, f"{medicine_name.replace(' ', '_')}_risk.joblib")
        joblib.dump({"model": model, "accuracy": accuracy}, model_path)
        
        return {"accuracy": accuracy}
    
    def predict(self, medicine_name, current_stock, days_until_expiry, predicted_demand, sales_rate=10):
        """
        Predict expiry risk for a batch
        Returns: risk_level (High/Medium/Low) and probability
        """
        model_path = os.path.join(self.models_dir, f"{medicine_name.replace(' ', '_')}_risk.joblib")
        
        if not os.path.exists(model_path):
            # Fallback logic if model not trained
            days_to_sell = current_stock / (sales_rate + 1)
            if days_until_expiry <= 30 or days_to_sell > days_until_expiry:
                return "High", 0.8
            elif days_until_expiry <= 90:
                return "Medium", 0.5
            else:
                return "Low", 0.2
        
        model_data = joblib.load(model_path)
        model = model_data["model"]
        
        # Prepare features
        stock_to_demand_ratio = current_stock / (predicted_demand + 1)
        expiry_to_sales_ratio = days_until_expiry / (sales_rate + 1)
        
        features = np.array([[
            current_stock, predicted_demand, days_until_expiry,
            sales_rate, stock_to_demand_ratio, expiry_to_sales_ratio
        ]])
        
        probability = model.predict_proba(features)[0][1]
        
        if probability > 0.7:
            risk_level = "High"
        elif probability > 0.3:
            risk_level = "Medium"
        else:
            risk_level = "Low"
        
        return risk_level, probability
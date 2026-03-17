# forecasting/forecast_model.py
import pandas as pd
from prophet import Prophet
from sklearn.metrics import mean_absolute_error
from datetime import datetime, timedelta
import os
import warnings
warnings.filterwarnings('ignore')

class Forecaster:
    """
    Handles Prophet forecasting for all medicines with train/test split and MAE.
    Can load either raw or preprocessed data.
    """
    def __init__(self, data_dir):
        self.data_dir = data_dir
        self.sales_df = None
        self.models = {}          # trained Prophet models (on full data)
        self.forecasts = {}        # future 30-day forecast DataFrames
        self.mae_scores = {}       # MAE per medicine
    
    def load_data(self, preprocessed=False):
        """Load sales data. If preprocessed=True, assume columns ds and y already."""
        if preprocessed:
            path = os.path.join(self.data_dir, 'sales_cleaned.csv')
        else:
            path = os.path.join(self.data_dir, 'sales_data.csv')
        
        self.sales_df = pd.read_csv(path)
        if not preprocessed:
            self.sales_df['date'] = pd.to_datetime(self.sales_df['date'])
            self.sales_df = self.sales_df.rename(columns={'date': 'ds', 'daily_sales': 'y'})
        else:
            self.sales_df['ds'] = pd.to_datetime(self.sales_df['ds'])
        
        print(f"✅ Loaded sales data: {len(self.sales_df)} records")
        return self.sales_df
    
    def _train_test_split(self, medicine_df, test_days=30):
        """Split medicine data into train (all but last test_days) and test."""
        train = medicine_df.iloc[:-test_days].copy()
        test = medicine_df.iloc[-test_days:].copy()
        return train, test
    
    def _train_prophet(self, train_df):
        """Train Prophet on given dataframe with columns ds, y."""
        model = Prophet(yearly_seasonality=True, weekly_seasonality=True)
        model.fit(train_df)
        return model
    
    def _compute_mae(self, medicine_name):
        """For a given medicine, compute MAE on last 30 days."""
        med_df = self.sales_df[self.sales_df['medicine_name'] == medicine_name].copy()
        if len(med_df) < 60:
            return None  # not enough data
        
        train, test = self._train_test_split(med_df)
        train_prophet = train[['ds', 'y']]
        test_prophet = test[['ds']]
        
        model = self._train_prophet(train_prophet)
        forecast = model.predict(test_prophet)
        mae = mean_absolute_error(test['y'], forecast['yhat'])
        return mae
    
    def _forecast_future(self, medicine_name, periods=30):
        """Retrain on full data and forecast next `periods` days."""
        med_df = self.sales_df[self.sales_df['medicine_name'] == medicine_name].copy()
        full_prophet = med_df[['ds', 'y']]
        
        model = self._train_prophet(full_prophet)
        self.models[medicine_name] = model
        
        last_date = med_df['ds'].max()
        future_dates = pd.date_range(start=last_date + timedelta(days=1), periods=periods)
        future_df = pd.DataFrame({'ds': future_dates})
        forecast = model.predict(future_df)
        return forecast[['ds', 'yhat']]
    
    def run_all(self):
        """Compute MAE and future forecast for every medicine."""
        medicines = self.sales_df['medicine_name'].unique()
        print(f"\n📊 Processing {len(medicines)} medicines...")
        
        for med in medicines:
            # MAE
            mae = self._compute_mae(med)
            if mae is not None:
                self.mae_scores[med] = round(mae, 2)
            else:
                self.mae_scores[med] = None
            
            # Future forecast
            try:
                fcst = self._forecast_future(med)
                self.forecasts[med] = fcst
                print(f"   ✅ {med}: MAE={self.mae_scores[med]}")
            except Exception as e:
                print(f"   ❌ {med}: failed - {e}")
        
        print("\n✅ Forecasting complete.")
        return self.forecasts
    
    def get_avg_daily_forecast(self, medicine_name):
        """Return average daily demand from future forecast."""
        fcst = self.forecasts.get(medicine_name)
        if fcst is None:
            return None
        return fcst['yhat'].mean()
    
    def get_total_forecast(self, medicine_name):
        fcst = self.forecasts.get(medicine_name)
        if fcst is None:
            return None
        return fcst['yhat'].sum()
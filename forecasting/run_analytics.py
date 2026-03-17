# forecasting/run_analytics_with_preprocessing.py
import os
import json
from preprocess import DataPreprocessor
from forecast_model import Forecaster
from risk_calculator import RiskCalculator

def main():
    print("\n" + "="*60)
    print("📊 PHARMACY ANALYTICS PIPELINE (with explicit preprocessing)")
    print("="*60)
    
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    
    # 1. Preprocess data
    preprocessor = DataPreprocessor(data_dir)
    cleaned_sales, cleaned_inventory = preprocessor.run_all()
    
    # 2. Forecasting using preprocessed data
    print("\n" + "="*50)
    print("🔮 FORECASTING ENGINE")
    print("="*50)
    forecaster = Forecaster(data_dir)
    forecaster.load_data(preprocessed=True)  # use cleaned sales
    forecaster.run_all()
    
    # 3. Risk calculation using preprocessed inventory
    print("\n" + "="*50)
    print("⚠️ RISK CALCULATOR")
    print("="*50)
    risk_calc = RiskCalculator(data_dir, forecaster)
    risk_calc.load_inventory(preprocessed=True)  # use cleaned inventory
    risk_report = risk_calc.generate_report()
    
    # 4. Build final output
    final_output = []
    for med, fcst_df in forecaster.forecasts.items():
        if fcst_df is None:
            continue
        summary = {
            'medicine_name': med,
            'forecast_summary': {
                'average_daily_demand': int(round(fcst_df['yhat'].mean())),
                'total_30_day_forecast': int(round(fcst_df['yhat'].sum())),
                'MAE': forecaster.mae_scores.get(med)
            },
            'batches': next(
                (item['batches'] for item in risk_report if item['medicine_name'] == med),
                []
            )
        }
        final_output.append(summary)
    
    output_path = os.path.join(data_dir, 'final_risk_report.json')
    with open(output_path, 'w') as f:
        json.dump(final_output, f, indent=2)
    
    print("\n" + "="*50)
    print("✅ FINAL REPORT GENERATED: data/final_risk_report.json")
    print("="*50)

if __name__ == "__main__":
    main()
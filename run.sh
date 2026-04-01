#!/bin/bash

echo "🚀 Starting Pharmacy Inventory System..."

# Activate virtual environment
source venv/bin/activate

# Check if Person B's JSON exists
if [ ! -f "forecasting/data_test/final_risk_report.json" ]; then
    echo "⚠️ Warning: final_risk_report.json not found!"
    echo "Please run Person B's analytics first:"
    echo "cd forecasting && python run_analytics.py"
fi

# Run FastAPI with uvicorn
echo "📡 Starting server at http://localhost:8000"
echo "📖 API docs available at http://localhost:8000/docs"

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

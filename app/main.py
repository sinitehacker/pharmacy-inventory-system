"""
Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import inventory, analytics, pharmacy_network, matching, orders, notifications, auth, decisions, ml_dashboard, ml_predictions
from app.routers import expiry_risk
from app.routers import ml_metrics
from app.routers import transfer_requests
from app.database.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI
app = FastAPI(
    title="Pharmacy Inventory System",
    description="Adaptive Pharmacy Inventory Optimization & Waste Reduction System",
    version="1.0.0"
)

# Configure CORS (for frontend integration)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(inventory.router)
app.include_router(analytics.router)
app.include_router(pharmacy_network.router)
app.include_router(matching.router)
app.include_router(orders.router)
app.include_router(notifications.router)
app.include_router(auth.router)
app.include_router(decisions.router)
app.include_router(ml_dashboard.router)
app.include_router(ml_predictions.router)
app.include_router(expiry_risk.router)
app.include_router(ml_metrics.router)
app.include_router(transfer_requests.router)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Pharmacy Inventory System API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/api/inventory/medicines",
            "/api/inventory/batches",
            "/api/inventory/sales",
            "/api/analytics/dashboard",
            "/api/analytics/risk-report",
            "/api/analytics/advisories"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
"""
Inventory API Routes - CRUD operations for medicines and batches
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.database import get_db
from app.models.medicine import Medicine, Batch, Sale
from app.schemas.medicine import (
    MedicineCreate, MedicineResponse,
    BatchCreate, BatchResponse,
    SaleCreate, SaleResponse
)

router = APIRouter(prefix="/api/inventory", tags=["inventory"])

# Medicine endpoints
@router.post("/medicines", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
async def create_medicine(
    medicine: MedicineCreate,
    db: Session = Depends(get_db)
):
    """Create a new medicine"""
    # Check if medicine already exists
    existing = db.query(Medicine).filter(Medicine.name == medicine.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Medicine already exists")
    
    db_medicine = Medicine(**medicine.model_dump())
    db.add(db_medicine)
    db.commit()
    db.refresh(db_medicine)
    return db_medicine

@router.get("/medicines", response_model=List[MedicineResponse])
async def get_medicines(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all medicines"""
    medicines = db.query(Medicine).offset(skip).limit(limit).all()
    return medicines

@router.get("/medicines/{medicine_id}", response_model=MedicineResponse)
async def get_medicine(medicine_id: int, db: Session = Depends(get_db)):
    """Get a specific medicine"""
    medicine = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine

# Batch endpoints
@router.post("/batches", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
async def create_batch(
    batch: BatchCreate,
    db: Session = Depends(get_db)
):
    """Add a new batch for a medicine"""
    # Verify medicine exists
    medicine = db.query(Medicine).filter(Medicine.id == batch.medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    db_batch = Batch(**batch.model_dump())
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch

@router.get("/batches/{medicine_id}", response_model=List[BatchResponse])
async def get_medicine_batches(medicine_id: int, db: Session = Depends(get_db)):
    """Get all batches for a medicine"""
    batches = db.query(Batch).filter(Batch.medicine_id == medicine_id).all()
    return batches

# Sale endpoints
@router.post("/sales", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def record_sale(
    sale: SaleCreate,
    db: Session = Depends(get_db)
):
    """Record a sale transaction"""
    # Verify medicine exists
    medicine = db.query(Medicine).filter(Medicine.id == sale.medicine_id).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    # If batch specified, verify and update stock
    if sale.batch_id:
        batch = db.query(Batch).filter(Batch.id == sale.batch_id).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        if batch.quantity < sale.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        
        # Update batch quantity
        batch.quantity -= sale.quantity
    
    db_sale = Sale(**sale.model_dump())
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    return db_sale

@router.get("/sales", response_model=List[SaleResponse])
async def get_sales(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all sales"""
    sales = db.query(Sale).offset(skip).limit(limit).all()
    return sales
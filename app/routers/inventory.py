from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.database.database import get_db
from app.models.medicine import Medicine, Batch, Sale
from app.schemas.medicine import (
    MedicineCreate, MedicineResponse,
    BatchCreate, BatchResponse,
    SaleCreate, SaleResponse
)

router = APIRouter(prefix="/api/inventory", tags=["inventory"])

# Helper to get pharmacy_id from request (in real app, from JWT token)
def get_pharmacy_id_from_token():
    # For now, we'll pass it as query param
    # In production, extract from JWT token
    return 1

@router.post("/medicines", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
async def create_medicine(
    medicine: MedicineCreate,
    pharmacy_id: int = Query(1, description="Pharmacy ID"),
    db: Session = Depends(get_db)
):
    """Create a new medicine for a specific pharmacy"""
    existing = db.query(Medicine).filter(
        Medicine.name == medicine.name,
        Medicine.pharmacy_id == pharmacy_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Medicine already exists for this pharmacy")
    
    db_medicine = Medicine(**medicine.model_dump(), pharmacy_id=pharmacy_id)
    db.add(db_medicine)
    db.commit()
    db.refresh(db_medicine)
    return db_medicine

@router.get("/medicines", response_model=List[MedicineResponse])
async def get_medicines(
    skip: int = 0,
    limit: int = Query(100, description="Number of records to return"),
    pharmacy_id: int = Query(1, description="Pharmacy ID"),
    db: Session = Depends(get_db)
):
    """Get all medicines for a specific pharmacy"""
    medicines = db.query(Medicine).options(joinedload(Medicine.batches)).filter(
        Medicine.pharmacy_id == pharmacy_id
    ).offset(skip).limit(limit).all()
    return medicines

@router.get("/medicines/{medicine_id}", response_model=MedicineResponse)
async def get_medicine(
    medicine_id: int,
    pharmacy_id: int = Query(1, description="Pharmacy ID"),
    db: Session = Depends(get_db)
):
    """Get a specific medicine for a pharmacy"""
    medicine = db.query(Medicine).options(joinedload(Medicine.batches)).filter(
        Medicine.id == medicine_id,
        Medicine.pharmacy_id == pharmacy_id
    ).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return medicine

@router.post("/batches", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
async def create_batch(
    batch: BatchCreate,
    pharmacy_id: int = Query(1, description="Pharmacy ID"),
    db: Session = Depends(get_db)
):
    """Add a new batch for a medicine"""
    medicine = db.query(Medicine).filter(
        Medicine.id == batch.medicine_id,
        Medicine.pharmacy_id == pharmacy_id
    ).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found for this pharmacy")
    
    db_batch = Batch(**batch.model_dump(), pharmacy_id=pharmacy_id)
    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch

@router.get("/batches/{medicine_id}", response_model=List[BatchResponse])
async def get_medicine_batches(
    medicine_id: int,
    pharmacy_id: int = Query(1, description="Pharmacy ID"),
    db: Session = Depends(get_db)
):
    """Get all batches for a medicine"""
    # Verify medicine belongs to this pharmacy
    medicine = db.query(Medicine).filter(
        Medicine.id == medicine_id,
        Medicine.pharmacy_id == pharmacy_id
    ).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found for this pharmacy")
    
    batches = db.query(Batch).filter(Batch.medicine_id == medicine_id).all()
    return batches

@router.delete("/batches/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_batch(
    batch_id: int,
    pharmacy_id: int = Query(1, description="Pharmacy ID"),
    db: Session = Depends(get_db)
):
    """Delete a batch"""
    batch = db.query(Batch).filter(
        Batch.id == batch_id,
        Batch.pharmacy_id == pharmacy_id
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    db.delete(batch)
    db.commit()
    return None

@router.post("/sales", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def record_sale(
    sale: SaleCreate,
    pharmacy_id: int = Query(1, description="Pharmacy ID"),
    db: Session = Depends(get_db)
):
    """Record a sale transaction"""
    # Verify medicine exists and belongs to pharmacy
    medicine = db.query(Medicine).filter(
        Medicine.id == sale.medicine_id,
        Medicine.pharmacy_id == pharmacy_id
    ).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found for this pharmacy")
    
    # If batch specified, verify and update stock
    if sale.batch_id:
        batch = db.query(Batch).filter(
            Batch.id == sale.batch_id,
            Batch.pharmacy_id == pharmacy_id
        ).first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        if batch.quantity < sale.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")
        
        # Update batch quantity
        batch.quantity -= sale.quantity
    
    db_sale = Sale(**sale.model_dump(), pharmacy_id=pharmacy_id)
    db.add(db_sale)
    db.commit()
    db.refresh(db_sale)
    return db_sale

@router.get("/sales", response_model=List[SaleResponse])
async def get_sales(
    skip: int = 0,
    limit: int = 100,
    pharmacy_id: int = Query(1, description="Pharmacy ID"),
    db: Session = Depends(get_db)
):
    """Get all sales for a pharmacy"""
    sales = db.query(Sale).filter(
        Sale.pharmacy_id == pharmacy_id
    ).offset(skip).limit(limit).all()
    return sales

@router.get("/sales/medicine/{medicine_id}", response_model=List[SaleResponse])
async def get_sales_by_medicine(
    medicine_id: int,
    pharmacy_id: int = Query(1, description="Pharmacy ID"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all sales for a specific medicine"""
    # Verify medicine belongs to pharmacy
    medicine = db.query(Medicine).filter(
        Medicine.id == medicine_id,
        Medicine.pharmacy_id == pharmacy_id
    ).first()
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found for this pharmacy")
    
    sales = db.query(Sale).filter(
        Sale.medicine_id == medicine_id,
        Sale.pharmacy_id == pharmacy_id
    ).offset(skip).limit(limit).all()
    return sales
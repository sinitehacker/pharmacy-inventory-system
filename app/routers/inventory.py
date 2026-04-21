from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import List

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
    limit: int = 100,
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
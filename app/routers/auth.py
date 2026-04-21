"""
Authentication API Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from app.database.database import get_db
from app.models.pharmacy import Pharmacy

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    pharmacy_id: int
    pharmacy_name: str
    message: str

@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    # Find pharmacy by email
    pharmacy = db.query(Pharmacy).filter(Pharmacy.email == login_data.email).first()
    
    if not pharmacy:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check password
    if pharmacy.password != login_data.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Simple token
    simple_token = f"token_{pharmacy.id}_{int(datetime.now().timestamp())}"
    
    return LoginResponse(
        access_token=simple_token,
        token_type="bearer",
        pharmacy_id=pharmacy.id,
        pharmacy_name=pharmacy.name,
        message="Login successful"
    )
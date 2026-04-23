"""
Transfer Request API Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database.database import get_db
from app.models.pharmacy import Pharmacy

router = APIRouter(prefix="/api/transfer-requests", tags=["Transfer Requests"])

# Pydantic models
class TransferRequestCreate(BaseModel):
    from_pharmacy_id: int
    to_pharmacy_id: int
    medicine_name: str
    quantity: int
    urgency: str = "medium"

class TransferRequestResponse(BaseModel):
    id: int
    from_pharmacy_id: int
    from_pharmacy_name: Optional[str] = None
    to_pharmacy_id: int
    medicine_name: str
    quantity: int
    status: str
    urgency: str
    created_at: str

# Initialize database table
def init_db():
    import sqlite3
    conn = sqlite3.connect('pharmacy_inventory.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transfer_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_pharmacy_id INTEGER NOT NULL,
            to_pharmacy_id INTEGER NOT NULL,
            medicine_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            urgency TEXT DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@router.post("/", response_model=TransferRequestResponse)
async def create_transfer_request(
    request_data: TransferRequestCreate,
    db: Session = Depends(get_db)
):
    """Create a transfer request from one pharmacy to another"""
    import sqlite3
    
    # Verify pharmacies exist
    from_pharmacy = db.query(Pharmacy).filter(Pharmacy.id == request_data.from_pharmacy_id).first()
    to_pharmacy = db.query(Pharmacy).filter(Pharmacy.id == request_data.to_pharmacy_id).first()
    
    if not from_pharmacy or not to_pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    conn = sqlite3.connect('pharmacy_inventory.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO transfer_requests (from_pharmacy_id, to_pharmacy_id, medicine_name, quantity, urgency)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        request_data.from_pharmacy_id,
        request_data.to_pharmacy_id,
        request_data.medicine_name,
        request_data.quantity,
        request_data.urgency
    ))
    
    transfer_id = cursor.lastrowid
    conn.commit()
    
    # Get the created record
    cursor.execute('SELECT id, from_pharmacy_id, to_pharmacy_id, medicine_name, quantity, status, urgency, created_at FROM transfer_requests WHERE id = ?', (transfer_id,))
    row = cursor.fetchone()
    conn.close()
    
    return {
        "id": row[0],
        "from_pharmacy_id": row[1],
        "from_pharmacy_name": from_pharmacy.name,
        "to_pharmacy_id": row[2],
        "medicine_name": row[3],
        "quantity": row[4],
        "status": row[5],
        "urgency": row[6],
        "created_at": row[7]
    }

@router.get("/incoming/{pharmacy_id}", response_model=List[TransferRequestResponse])
async def get_incoming_requests(
    pharmacy_id: int,
    db: Session = Depends(get_db)
):
    """Get pending transfer requests where pharmacy is the receiver"""
    import sqlite3
    
    conn = sqlite3.connect('pharmacy_inventory.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, from_pharmacy_id, to_pharmacy_id, medicine_name, quantity, status, urgency, created_at
        FROM transfer_requests
        WHERE to_pharmacy_id = ? AND status = 'pending'
        ORDER BY created_at DESC
    ''', (pharmacy_id,))
    
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    for row in rows:
        sender = db.query(Pharmacy).filter(Pharmacy.id == row[1]).first()
        result.append({
            "id": row[0],
            "from_pharmacy_id": row[1],
            "from_pharmacy_name": sender.name if sender else "Unknown",
            "to_pharmacy_id": row[2],
            "medicine_name": row[3],
            "quantity": row[4],
            "status": row[5],
            "urgency": row[6],
            "created_at": row[7]
        })
    
    return result

@router.put("/{request_id}/accept")
async def accept_transfer(request_id: int, db: Session = Depends(get_db)):
    """Accept a transfer request"""
    import sqlite3
    
    conn = sqlite3.connect('pharmacy_inventory.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT status FROM transfer_requests WHERE id = ?', (request_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Transfer request not found")
    
    if row[0] != 'pending':
        conn.close()
        raise HTTPException(status_code=400, detail="Transfer request already processed")
    
    cursor.execute('UPDATE transfer_requests SET status = "accepted" WHERE id = ?', (request_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Transfer accepted", "request_id": request_id}

@router.put("/{request_id}/reject")
async def reject_transfer(request_id: int, db: Session = Depends(get_db)):
    """Reject a transfer request"""
    import sqlite3
    
    conn = sqlite3.connect('pharmacy_inventory.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT status FROM transfer_requests WHERE id = ?', (request_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Transfer request not found")
    
    if row[0] != 'pending':
        conn.close()
        raise HTTPException(status_code=400, detail="Transfer request already processed")
    
    cursor.execute('UPDATE transfer_requests SET status = "rejected" WHERE id = ?', (request_id,))
    conn.commit()
    conn.close()
    
    return {"message": "Transfer rejected", "request_id": request_id}

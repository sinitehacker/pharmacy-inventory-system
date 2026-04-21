"""
Order API Routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database.database import get_db
from app.schemas.order import OrderCreate, OrderResponse
from app.models.pharmacy import Pharmacy
from app.models.order import Order
from app.models.notification import Notification

router = APIRouter(prefix="/api/orders", tags=["Orders"])

@router.post("/", response_model=OrderResponse)
async def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db)
):
    """Create a supplier order"""
    pharmacy = db.query(Pharmacy).filter(Pharmacy.id == order.pharmacy_id).first()
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    db_order = Order(
        pharmacy_id=order.pharmacy_id,
        medicine_name=order.medicine_name,
        quantity=order.quantity,
        order_type=order.order_type,
        status="pending",
        eta_days=3
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    notification = Notification(
        pharmacy_id=order.pharmacy_id,
        message=f"Order placed for {order.quantity} units of {order.medicine_name}. Order ID: #{db_order.id}. Expected delivery in 3 days.",
        type="order"
    )
    db.add(notification)
    db.commit()
    
    return db_order

@router.get("/{pharmacy_id}", response_model=List[OrderResponse])
async def get_orders(
    pharmacy_id: int,
    db: Session = Depends(get_db)
):
    """Get all orders for a pharmacy"""
    orders = db.query(Order).filter(Order.pharmacy_id == pharmacy_id).order_by(Order.created_at.desc()).all()
    return orders
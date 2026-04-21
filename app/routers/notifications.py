"""
Notification API Routes
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List

from app.database.database import get_db
from app.schemas.notification import NotificationResponse
from app.models.notification import Notification

class NotificationCreate(BaseModel):
    pharmacy_id: int
    message: str
    type: str = "info"

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("/{pharmacy_id}", response_model=List[NotificationResponse])
async def get_notifications(
    pharmacy_id: int,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    notifications = db.query(Notification).filter(
        Notification.pharmacy_id == pharmacy_id
    ).order_by(Notification.created_at.desc()).limit(limit).all()
    return notifications

@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db)
):
    notification = db.query(Notification).filter(Notification.id == notification_id).first()
    if notification:
        notification.is_read = 1
        db.commit()
    return {"message": "Notification marked as read"}

@router.post("/create")
async def create_notification(
    notification: NotificationCreate,
    db: Session = Depends(get_db)
):
    db_notification = Notification(
        pharmacy_id=notification.pharmacy_id,
        message=notification.message,
        type=notification.type,
        is_read=0
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    return {"message": "Notification created", "id": db_notification.id}
"""
Notification model
"""
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.database.database import Base

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    pharmacy_id = Column(Integer, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, default="info")
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
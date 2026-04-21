"""
Medicine Request model
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class MedicineRequest(Base):
    __tablename__ = "medicine_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=False)
    medicine_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    urgency = Column(String, default="medium")
    notes = Column(Text, nullable=True)
    status = Column(String, default="active")
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationship
    pharmacy = relationship("Pharmacy", back_populates="requests")
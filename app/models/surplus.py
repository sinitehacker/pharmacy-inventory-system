"""
Surplus Listing model
"""
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class SurplusListing(Base):
    __tablename__ = "surplus_listings"
    
    id = Column(Integer, primary_key=True, index=True)
    pharmacy_id = Column(Integer, ForeignKey("pharmacies.id"), nullable=False)
    medicine_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    expiry_date = Column(Date, nullable=False)
    status = Column(String, default="active")
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationship
    pharmacy = relationship("Pharmacy", back_populates="surplus_posts")
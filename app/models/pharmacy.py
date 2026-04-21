"""
Pharmacy Network Models
"""
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class Pharmacy(Base):
    """Registered pharmacies"""
    __tablename__ = "pharmacies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String, nullable=True)
    password = Column(String, nullable=True)
    registered_at = Column(DateTime, server_default=func.now())
    
    # Relationships - fixed class names
    surplus_posts = relationship("SurplusListing", back_populates="pharmacy")
    requests = relationship("MedicineRequest", back_populates="pharmacy")
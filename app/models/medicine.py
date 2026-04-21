"""
Medicine and Inventory models
"""
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.database import Base

class Medicine(Base):
    """Medicine master table"""
    __tablename__ = "medicines"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    generic_name = Column(String, nullable=True)
    category = Column(String, nullable=True)
    manufacturer = Column(String, nullable=True)
    pharmacy_id = Column(Integer, nullable=False, default=1)  # ADD THIS
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relationships
    batches = relationship("Batch", back_populates="medicine", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="medicine")

class Batch(Base):
    """Inventory batches for each medicine"""
    __tablename__ = "batches"
    
    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    batch_number = Column(String, nullable=False)
    expiry_date = Column(Date, nullable=False)
    quantity = Column(Integer, nullable=False)
    purchase_price = Column(Float, nullable=True)
    selling_price = Column(Float, nullable=True)
    pharmacy_id = Column(Integer, nullable=False, default=1)  # ADD THIS
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    medicine = relationship("Medicine", back_populates="batches")

class Sale(Base):
    """Sales transactions"""
    __tablename__ = "sales"
    
    id = Column(Integer, primary_key=True, index=True)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=True)
    quantity = Column(Integer, nullable=False)
    sale_date = Column(Date, nullable=False)
    price_per_unit = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    pharmacy_id = Column(Integer, nullable=False, default=1)  # ADD THIS
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    medicine = relationship("Medicine", back_populates="sales")
    batch = relationship("Batch")
"""
Order model
"""
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from app.database.database import Base

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    pharmacy_id = Column(Integer, nullable=False)
    medicine_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    order_type = Column(String, default="supplier_order")
    status = Column(String, default="pending")
    eta_days = Column(Integer, default=3)
    created_at = Column(DateTime, server_default=func.now())
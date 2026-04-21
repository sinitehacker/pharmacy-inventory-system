"""
Matching Service - Calculates surplus, demand, and redistribution matches
"""
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from math import radians, sin, cos, sqrt, atan2
from app.models.medicine import Medicine, Batch
from app.models.pharmacy import Pharmacy
from app.models.surplus import SurplusListing
from app.models.pharmacy_requests import MedicineRequest

class MatchingService:
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_distance(self, lat1, lon1, lat2, lon2):
        R = 6371
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        return R * c
    
    def calculate_surplus(self, stock, predicted_demand, safety_stock=30):
        surplus = stock - predicted_demand - safety_stock
        return max(0, surplus)
    
    def calculate_reorder_needed(self, stock, reorder_point=50):
        if stock < reorder_point:
            return reorder_point - stock + 50
        return 0
    
    def get_nearby_pharmacies(self, lat, lon, radius_km=10):
        all_pharmacies = self.db.query(Pharmacy).all()
        nearby = []
        for pharmacy in all_pharmacies:
            distance = self.calculate_distance(lat, lon, pharmacy.latitude, pharmacy.longitude)
            if distance <= radius_km:
                nearby.append({
                    "id": pharmacy.id,
                    "name": pharmacy.name,
                    "address": pharmacy.address,
                    "latitude": pharmacy.latitude,
                    "longitude": pharmacy.longitude,
                    "phone": pharmacy.phone,
                    "distance_km": round(distance, 2)
                })
        return sorted(nearby, key=lambda x: x["distance_km"])
    
    def get_smart_matches(self, pharmacy_id, lat, lon, radius_km=20):
        try:
            # Get nearby pharmacies (excluding self)
            nearby = self.get_nearby_pharmacies(lat, lon, radius_km)
            nearby_ids = [p["id"] for p in nearby if p["id"] != pharmacy_id]
            
            # Get current pharmacy
            current_pharmacy = self.db.query(Pharmacy).filter(Pharmacy.id == pharmacy_id).first()
            if not current_pharmacy:
                return []
            
            # Get current pharmacy's stock ONLY (filter by pharmacy_id)
            batches = self.db.query(Batch).filter(Batch.pharmacy_id == pharmacy_id).all()
            current_stock = {}
            for batch in batches:
                med = self.db.query(Medicine).filter(Medicine.id == batch.medicine_id).first()
                if med:
                    current_stock[med.name] = current_stock.get(med.name, 0) + batch.quantity
            
            # Get requests from nearby pharmacies
            requests = self.db.query(MedicineRequest).filter(
                MedicineRequest.pharmacy_id.in_(nearby_ids),
                MedicineRequest.status == "active"
            ).all()
            
            matches = []
            for req in requests:
                requesting_pharmacy = self.db.query(Pharmacy).filter(Pharmacy.id == req.pharmacy_id).first()
                if not requesting_pharmacy:
                    continue
                    
                current_qty = current_stock.get(req.medicine_name, 0)
                predicted_demand = 50
                surplus = self.calculate_surplus(current_qty, predicted_demand)
                
                if surplus >= req.quantity:
                    distance = self.calculate_distance(
                        lat, lon, 
                        requesting_pharmacy.latitude, 
                        requesting_pharmacy.longitude
                    )
                    matches.append({
                        "medicine": req.medicine_name,
                        "from_pharmacy": current_pharmacy.name,
                        "to_pharmacy": requesting_pharmacy.name,
                        "to_pharmacy_id": requesting_pharmacy.id,
                        "to_pharmacy_phone": requesting_pharmacy.phone,
                        "quantity_available": surplus,
                        "quantity_needed": req.quantity,
                        "urgency": req.urgency,
                        "distance_km": round(distance, 2),
                        "reason": f"You have surplus ({surplus} units available). They need {req.quantity} units."
                    })
            
            return sorted(matches, key=lambda x: x["urgency"] == "high", reverse=True)
        except Exception as e:
            print(f"Error in get_smart_matches: {e}")
            return []
    
    def get_surplus_for_pharmacy(self, pharmacy_id):
        # Filter batches by pharmacy_id - FIXED
        batches = self.db.query(Batch).filter(Batch.pharmacy_id == pharmacy_id).all()
        medicines = self.db.query(Medicine).all()
        med_map = {m.id: m.name for m in medicines}
        
        surplus_items = []
        for batch in batches:
            med_name = med_map.get(batch.medicine_id, "Unknown")
            predicted_demand = 50
            surplus = self.calculate_surplus(batch.quantity, predicted_demand)
            
            if surplus > 0:
                days_until_expiry = (batch.expiry_date - datetime.now().date()).days
                surplus_items.append({
                    "medicine_name": med_name,
                    "current_stock": batch.quantity,
                    "surplus_quantity": surplus,
                    "expiry_date": str(batch.expiry_date),
                    "days_until_expiry": days_until_expiry,
                    "expiry_safe": days_until_expiry > 60,
                    "suggested_action": "Offer to nearby pharmacies" if days_until_expiry > 60 else "Sell quickly or discount"
                })
        
        return surplus_items
    
    def get_reorder_recommendations(self, pharmacy_id):
        # Filter batches by pharmacy_id - FIXED
        batches = self.db.query(Batch).filter(Batch.pharmacy_id == pharmacy_id).all()
        medicines = self.db.query(Medicine).all()
        med_map = {m.id: m.name for m in medicines}
        
        recommendations = []
        for batch in batches:
            med_name = med_map.get(batch.medicine_id, "Unknown")
            reorder_needed = self.calculate_reorder_needed(batch.quantity)
            
            if reorder_needed > 0:
                recommendations.append({
                    "medicine_name": med_name,
                    "current_stock": batch.quantity,
                    "reorder_point": 50,
                    "suggested_order": reorder_needed,
                    "urgency": "High" if batch.quantity < 20 else "Medium",
                    "reason": f"Stock is below reorder point. Current: {batch.quantity}, Reorder at: 50"
                })
        
        return recommendations
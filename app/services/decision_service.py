class DecisionService:
    
    @staticmethod
    def calculate_reorder_point(avg_daily_demand: float, pharmacy_id: int = 1) -> int:
        if pharmacy_id == 1:  # Rama - surplus
            factor = 1.5
        elif pharmacy_id == 2:  # Lakshmi - shortage
            factor = 2.0
        else:  # Sai - expiry risk
            factor = 1.8
        rop = int(avg_daily_demand * 3 * factor)
        return max(20, min(rop, 100))
    
    @staticmethod
    def calculate_safety_stock(avg_daily_demand: float, pharmacy_id: int = 1) -> int:
        if pharmacy_id == 2:
            return int(max(10, min(avg_daily_demand * 1.2, 25)))
        return int(max(8, min(avg_daily_demand, 20)))
    
    @staticmethod
    def calculate_surplus(current_stock: int, predicted_demand: int, safety_stock: int) -> int:
        surplus = current_stock - predicted_demand - safety_stock
        return max(0, surplus)
    
    @staticmethod
    def calculate_reorder_quantity(current_stock: int, reorder_point: int, pharmacy_id: int = 1) -> int:
        if current_stock >= reorder_point:
            return 0
        suggested = (reorder_point * 2) - current_stock
        return min(150, max(50, suggested))
    
    @staticmethod
    def get_inventory_status(current_stock: int, reorder_point: int, avg_daily_demand: float) -> dict:
        if current_stock <= reorder_point:
            return {"status": "Reorder Needed", "color": "#ef4444"}
        elif current_stock > avg_daily_demand * 20:
            return {"status": "Surplus", "color": "#10b981"}
        elif current_stock > avg_daily_demand * 10:
            return {"status": "Good Stock", "color": "#22c55e"}
        else:
            return {"status": "Adequate", "color": "#3b82f6"}
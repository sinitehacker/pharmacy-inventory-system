"""
Health Score Calculator with explainable metrics
"""
class HealthScoreCalculator:
    
    @staticmethod
    def calculate_health_score(total_medicines, high_risk_count, low_stock_count, surplus_count):
        if total_medicines == 0:
            return 100, {}
        
        # Calculate percentages
        low_stock_pct = (low_stock_count / total_medicines) * 100
        high_risk_pct = (high_risk_count / total_medicines) * 100
        
        # Deductions (capped)
        low_stock_penalty = min(low_stock_pct * 1.0, 35)
        high_risk_penalty = min(high_risk_pct * 1.2, 40)
        
        # Calculate score (minimum 35%)
        score = 100 - low_stock_penalty - high_risk_penalty
        score = max(35, min(100, score))
        
        explanation = {
            "total_medicines": total_medicines,
            "low_stock_count": low_stock_count,
            "low_stock_percentage": round(low_stock_pct, 1),
            "high_risk_count": high_risk_count,
            "high_risk_percentage": round(high_risk_pct, 1),
            "surplus_count": surplus_count,
            "surplus_percentage": round((surplus_count / total_medicines) * 100, 1),
            "low_stock_penalty": round(low_stock_penalty, 1),
            "high_risk_penalty": round(high_risk_penalty, 1),
            "formula": f"100 - ({round(low_stock_pct,1)}% × 1) - ({round(high_risk_pct,1)}% × 1.2) = {round(score,1)}%",
            "score": round(score, 1)
        }
        
        return score, explanation
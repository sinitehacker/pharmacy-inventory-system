"""
Test script to verify all endpoints are working
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_root():
    """Test root endpoint"""
    response = requests.get(f"{BASE_URL}/")
    print(f"✅ Root: {response.status_code}")
    return response.json()

def test_dashboard():
    """Test dashboard endpoint"""
    response = requests.get(f"{BASE_URL}/api/analytics/dashboard")
    print(f"✅ Dashboard: {response.status_code}")
    return response.json()

def test_risk_report():
    """Test risk report endpoint"""
    response = requests.get(f"{BASE_URL}/api/analytics/risk-report")
    print(f"✅ Risk Report: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   - Found {len(data) if isinstance(data, list) else 1} medicine entries")
    return response.json()

def test_advisories():
    """Test advisories endpoint"""
    response = requests.get(f"{BASE_URL}/api/analytics/advisories")
    print(f"✅ Advisories: {response.status_code}")
    if response.status_code == 200:
        advisories = response.json()
        print(f"   - Total advisories: {len(advisories)}")
    return response.json()

def test_medicines():
    """Test medicines endpoint"""
    response = requests.get(f"{BASE_URL}/api/inventory/medicines")
    print(f"✅ Medicines: {response.status_code}")
    return response.json()

if __name__ == "__main__":
    print("\n=== Testing Pharmacy Inventory System API ===\n")
    
    try:
        test_root()
        test_dashboard()
        test_risk_report()
        test_advisories()
        test_medicines()
        
        print("\n✅ All tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Cannot connect to server. Make sure it's running:")
        print("   ./run.sh")
    except Exception as e:
        print(f"\n❌ Error: {e}")
"""
Simple test to verify API is working
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_connection():
    """Test if server is running"""
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"✅ Server is running! Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure it's running:")
        print("   ./run.sh")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_dashboard():
    """Test dashboard endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/analytics/dashboard")
        if response.status_code == 200:
            print(f"✅ Dashboard endpoint works!")
            data = response.json()
            print(f"   Total alerts: {data.get('total_alerts', 0)}")
        else:
            print(f"⚠️ Dashboard returned status: {response.status_code}")
    except Exception as e:
        print(f"❌ Dashboard error: {e}")

if __name__ == "__main__":
    print("\n=== Testing Pharmacy API ===\n")
    
    if test_connection():
        test_dashboard()
        print("\n✅ Test completed!")
    else:
        print("\n❌ Test failed - start the server first!")

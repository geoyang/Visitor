#!/usr/bin/env python3
"""
Test script to check device tokens and test theme endpoints
"""

import asyncio
import os

# Import MongoDB driver
try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ImportError:
    print("Installing motor (MongoDB async driver)...")
    os.system("pip3 install motor --break-system-packages")
    from motor.motor_asyncio import AsyncIOMotorClient

async def test_device_tokens():
    """Test device tokens and theme access"""
    
    # MongoDB connection
    MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://admin:devpassword@localhost:27017/visitor_management?authSource=admin')
    DATABASE_NAME = 'visitor_management'
    
    try:
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client[DATABASE_NAME]
        
        print(f"🔗 Connected to MongoDB: visitor_management database")
        
        devices_collection = db.devices
        companies_collection = db.companies
        
        # Get all devices
        devices_cursor = devices_collection.find({})
        devices = await devices_cursor.to_list(length=None)
        
        print(f"📱 Found {len(devices)} devices:")
        
        if not devices:
            print("❌ No devices found. Let's create a test device.")
            
            # Get first company
            company = await companies_collection.find_one({})
            if company:
                company_id = company.get("id") or str(company["_id"])
                company_name = company.get("name", "Unknown Company")
                
                # Create a test device
                test_device = {
                    "id": "test_device_001",
                    "name": "Test Device for Themes",
                    "company_id": company_id,
                    "location_id": "test_location",
                    "device_token": "test_device_token_123",
                    "status": "active",
                    "device_type": "tablet",
                    "last_seen": None,
                    "settings": {}
                }
                
                result = await devices_collection.insert_one(test_device)
                print(f"✅ Created test device: {test_device['name']}")
                print(f"   Company: {company_name}")
                print(f"   Device Token: {test_device['device_token']}")
                print(f"   Device ID: {test_device['id']}")
                
                return test_device['device_token']
            else:
                print("❌ No companies found to create device")
                return None
        else:
            # Show existing devices
            for device in devices[:3]:  # Show first 3
                device_token = device.get("device_token", "No token")
                device_name = device.get("name", "Unknown Device")
                company_id = device.get("company_id", "No company")
                
                print(f"   📱 {device_name}")
                print(f"      Token: {device_token}")
                print(f"      Company: {company_id}")
                print()
            
            # Return first device token for testing
            return devices[0].get("device_token")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error checking devices: {e}")
        return None

if __name__ == "__main__":
    print("🧪 Testing device tokens...")
    token = asyncio.run(test_device_tokens())
    
    if token:
        print(f"\n🔧 Test the theme endpoint with:")
        print(f"curl -X GET http://localhost:8000/device/themes -H \"X-Device-Token: {token}\"")
    else:
        print("\n❌ No valid device token found")
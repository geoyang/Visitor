#!/usr/bin/env python3
"""
Create a test device with proper token for theme testing
"""

import asyncio
import os
import secrets

# Import MongoDB driver
try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ImportError:
    print("Installing motor (MongoDB async driver)...")
    os.system("pip3 install motor --break-system-packages")
    from motor.motor_asyncio import AsyncIOMotorClient

async def create_test_device():
    """Create a test device with token"""
    
    # MongoDB connection
    MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://admin:devpassword@localhost:27017/visitor_management?authSource=admin')
    DATABASE_NAME = 'visitor_management'
    
    try:
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client[DATABASE_NAME]
        
        print(f"🔗 Connected to MongoDB: visitor_management database")
        
        devices_collection = db.devices
        companies_collection = db.companies
        
        # Get first company
        company = await companies_collection.find_one({})
        if not company:
            print("❌ No companies found")
            return
        
        company_id = company.get("id") or str(company["_id"])
        company_name = company.get("name", "Unknown Company")
        
        # Generate secure device token
        device_token = f"dev_{secrets.token_urlsafe(32)}"
        
        # Create test device with proper token
        test_device = {
            "id": f"theme_test_device_{int(asyncio.get_event_loop().time())}",
            "name": "Theme Test Device",
            "company_id": company_id,
            "location_id": "test_location_001",
            "device_token": device_token,
            "status": "active",
            "device_type": "tablet",
            "last_seen": None,
            "settings": {
                "theme_testing": True
            }
        }
        
        result = await devices_collection.insert_one(test_device)
        
        print(f"✅ Created test device successfully!")
        print(f"   Device Name: {test_device['name']}")
        print(f"   Company: {company_name} ({company_id})")
        print(f"   Device Token: {device_token}")
        print(f"   Device ID: {test_device['id']}")
        
        # Test the endpoint
        print(f"\n🧪 Test command:")
        print(f"curl -X GET http://localhost:8000/device/themes -H \"X-Device-Token: {device_token}\"")
        
        client.close()
        return device_token
        
    except Exception as e:
        print(f"❌ Error creating device: {e}")
        return None

if __name__ == "__main__":
    print("🚀 Creating test device with token...")
    asyncio.run(create_test_device())
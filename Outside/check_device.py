#!/usr/bin/env python3
"""
Check device DEVICE-1750008399 and its authentication setup
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

async def check_device():
    """Check device DEVICE-1750008399"""
    
    # MongoDB connection
    MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://admin:devpassword@localhost:27017/visitor_management?authSource=admin')
    DATABASE_NAME = 'visitor_management'
    
    try:
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client[DATABASE_NAME]
        
        print(f"🔗 Connected to MongoDB: visitor_management database")
        
        devices_collection = db.devices
        companies_collection = db.companies
        
        device_id = "DEVICE-1750008399"
        
        # Search for device by ID
        device = await devices_collection.find_one({"id": device_id})
        
        if not device:
            # Try searching by different fields
            device = await devices_collection.find_one({"device_id": device_id})
            
        if not device:
            # Try searching by name or partial match
            device = await devices_collection.find_one({"name": {"$regex": device_id, "$options": "i"}})
            
        if device:
            print(f"✅ Found device: {device.get('name', 'Unknown Name')}")
            print(f"   Device ID: {device.get('id', 'No ID')}")
            print(f"   Device Token: {device.get('device_token', 'NO TOKEN FOUND!')}")
            print(f"   Company ID: {device.get('company_id', 'No Company')}")
            print(f"   Status: {device.get('status', 'Unknown')}")
            print(f"   Type: {device.get('device_type', 'Unknown')}")
            
            # Get company info
            company_id = device.get('company_id')
            if company_id:
                company = await companies_collection.find_one({"id": company_id}) or \
                         await companies_collection.find_one({"_id": company_id})
                
                if company:
                    company_name = company.get('name', 'Unknown Company')
                    print(f"   Company: {company_name}")
                else:
                    print(f"   Company: ❌ Company {company_id} not found!")
            
            # Check if device has token
            device_token = device.get('device_token')
            if not device_token:
                print(f"\n❌ PROBLEM: Device has no device_token!")
                print(f"   This device cannot authenticate with the theme API.")
                
                # Generate a token for this device
                import secrets
                new_token = f"dev_{secrets.token_urlsafe(32)}"
                
                print(f"\n🔧 Generating device token...")
                await devices_collection.update_one(
                    {"_id": device["_id"]},
                    {"$set": {"device_token": new_token}}
                )
                print(f"   ✅ Added device token: {new_token}")
                device_token = new_token
            
            # Test the device token
            print(f"\n🧪 Test commands:")
            print(f"curl -X GET http://localhost:8000/device/themes -H \"X-Device-Token: {device_token}\"")
            
            return device_token
            
        else:
            print(f"❌ Device {device_id} not found in database!")
            
            # Show all devices to help identify the correct one
            print(f"\n📱 Available devices:")
            devices_cursor = devices_collection.find({})
            devices = await devices_cursor.to_list(length=20)
            
            for dev in devices:
                dev_id = dev.get('id', 'No ID')
                dev_name = dev.get('name', 'Unknown')
                dev_token = dev.get('device_token', 'No Token')
                print(f"   📱 {dev_name} (ID: {dev_id}) - Token: {'✅' if dev_token else '❌'}")
            
            return None
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error checking device: {e}")
        return None

if __name__ == "__main__":
    print("🔍 Checking device DEVICE-1750008399...")
    asyncio.run(check_device())
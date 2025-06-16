#!/usr/bin/env python3
"""
Fix device company association for DEVICE-1750008399
"""

import asyncio
import os
from bson import ObjectId

# Import MongoDB driver
try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ImportError:
    print("Installing motor (MongoDB async driver)...")
    os.system("pip3 install motor --break-system-packages")
    from motor.motor_asyncio import AsyncIOMotorClient

async def fix_device_company():
    """Fix device company association"""
    
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
        
        # Find the device
        device = await devices_collection.find_one({"device_id": device_id}) or \
                 await devices_collection.find_one({"id": device_id})
        
        if not device:
            # Search more broadly
            devices_cursor = devices_collection.find({})
            devices = await devices_cursor.to_list(length=100)
            
            print(f"Searching for device containing: {device_id}")
            for dev in devices:
                device_fields = [
                    str(dev.get('_id', '')),
                    dev.get('id', ''),
                    dev.get('device_id', ''),
                    dev.get('name', ''),
                ]
                
                if any(device_id in str(field) for field in device_fields):
                    device = dev
                    print(f"Found device by field match: {dev}")
                    break
        
        if not device:
            print(f"❌ Could not find device {device_id}")
            return
            
        print(f"✅ Found device:")
        print(f"   MongoDB ID: {device['_id']}")
        print(f"   Device ID: {device.get('id', 'No ID')}")
        print(f"   Device Token: {device.get('device_token', 'No Token')}")
        print(f"   Current Company ID: {device.get('company_id', 'No Company')}")
        
        # Check if company exists
        company_id = device.get('company_id')
        if company_id:
            # Try different company ID formats
            company = None
            
            # Try as string ID
            company = await companies_collection.find_one({"id": company_id})
            
            # Try as ObjectId
            if not company:
                try:
                    company = await companies_collection.find_one({"_id": ObjectId(company_id)})
                except:
                    pass
            
            # Try as string _id
            if not company:
                company = await companies_collection.find_one({"_id": company_id})
            
            if company:
                print(f"   ✅ Company found: {company.get('name', 'Unknown')}")
                company_real_id = company.get('id') or str(company['_id'])
                
                # Update device with correct company ID format
                if device.get('company_id') != company_real_id:
                    print(f"   🔧 Updating device company ID to: {company_real_id}")
                    await devices_collection.update_one(
                        {"_id": device["_id"]},
                        {"$set": {"company_id": company_real_id}}
                    )
                    print(f"   ✅ Device company ID updated")
                
            else:
                print(f"   ❌ Company {company_id} not found!")
                
                # Get first available company
                first_company = await companies_collection.find_one({})
                if first_company:
                    new_company_id = first_company.get('id') or str(first_company['_id'])
                    company_name = first_company.get('name', 'Unknown')
                    
                    print(f"   🔧 Assigning device to first available company:")
                    print(f"      Company: {company_name}")
                    print(f"      Company ID: {new_company_id}")
                    
                    await devices_collection.update_one(
                        {"_id": device["_id"]},
                        {"$set": {"company_id": new_company_id}}
                    )
                    print(f"   ✅ Device reassigned to company")
                    company_id = new_company_id
        
        # Get final device state
        device = await devices_collection.find_one({"_id": device["_id"]})
        device_token = device.get('device_token')
        
        print(f"\n🎯 Final device configuration:")
        print(f"   Device Token: {device_token}")
        print(f"   Company ID: {device.get('company_id')}")
        
        # Test the API
        if device_token:
            print(f"\n🧪 Test theme API:")
            print(f"curl -X GET http://localhost:8000/device/themes -H \"X-Device-Token: {device_token}\"")
            
            # Actually test it
            import subprocess
            test_cmd = [
                "curl", "-X", "GET", 
                "http://localhost:8000/device/themes",
                "-H", f"X-Device-Token: {device_token}"
            ]
            
            try:
                result = subprocess.run(test_cmd, capture_output=True, text=True, timeout=10)
                print(f"\n📋 API Test Result:")
                if result.returncode == 0:
                    if "error" in result.stdout.lower():
                        print(f"❌ API Error: {result.stdout}")
                    else:
                        import json
                        try:
                            themes = json.loads(result.stdout)
                            print(f"✅ Success: Found {len(themes)} themes")
                            for theme in themes[:2]:  # Show first 2
                                print(f"   - {theme.get('name', 'Unknown')} ({theme.get('category', 'unknown')})")
                        except json.JSONDecodeError:
                            print(f"Response: {result.stdout[:200]}...")
                else:
                    print(f"❌ Request failed: {result.stderr}")
            except Exception as e:
                print(f"❌ Test failed: {e}")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🔧 Fixing device company association...")
    asyncio.run(fix_device_company())
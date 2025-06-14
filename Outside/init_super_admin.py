#!/usr/bin/env python3
"""
Initialize super admin account for admin@eoyang.com
"""
import asyncio
import hashlib
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = "visitor_management"

async def create_super_admin():
    """Create super admin account"""
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    companies_collection = db.companies
    
    admin_email = "admin@eoyang.com"
    admin_password = "SuperAdmin123!"  # You should change this password
    
    # Check if super admin already exists
    existing_admin = await companies_collection.find_one({"account_email": admin_email})
    if existing_admin:
        print(f"Super admin {admin_email} already exists!")
        print(f"Account ID: {existing_admin['_id']}")
        print(f"Role: {existing_admin.get('role', 'company_admin')}")
        return
    
    # Hash password using the same method as in main.py
    password_hash = hashlib.sha256(admin_password.encode()).hexdigest()
    
    # Create super admin company account
    super_admin_data = {
        "name": "EoYang Systems Administration",
        "domain": "eoyang.com",
        "status": "active",
        "subscription_plan": "enterprise",
        "max_locations": 999,
        "max_devices_per_location": 999,
        "settings": {
            "is_super_admin": True,
            "can_manage_all_companies": True,
            "can_view_system_analytics": True
        },
        "account_email": admin_email,
        "password_hash": password_hash,
        "email_verified": True,
        "role": "super_admin",
        "registration_date": datetime.now(timezone.utc),
        "last_login": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Insert super admin
    result = await companies_collection.insert_one(super_admin_data)
    admin_id = str(result.inserted_id)
    
    print("✅ Super admin account created successfully!")
    print(f"Email: {admin_email}")
    print(f"Password: {admin_password}")
    print(f"Account ID: {admin_id}")
    print(f"Role: super_admin")
    print("\n🔒 IMPORTANT: Please change the password after first login!")
    print("You can now log in to the admin dashboard with these credentials.")
    
    await client.close()

if __name__ == "__main__":
    asyncio.run(create_super_admin())
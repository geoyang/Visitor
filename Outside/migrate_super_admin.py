"""
Migrate super admin from companies table to users table
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import hashlib
import secrets
from bson import ObjectId

MONGODB_URL = "mongodb://root:example@localhost:27017/"
DATABASE_NAME = "visitor_management"

def get_password_hash(password: str) -> str:
    """Hash a password for storing."""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token():
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)

async def migrate_super_admin():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    companies_collection = db.companies
    users_collection = db.users
    
    print("🔄 Starting super admin migration...")
    
    # Find the super admin account in companies collection
    admin_email = "admin@eoyang.com"
    super_admin_company = await companies_collection.find_one({"account_email": admin_email})
    
    if not super_admin_company:
        print("❌ Super admin not found in companies collection")
        return
    
    # Check if super admin already exists in users collection
    existing_user = await users_collection.find_one({"email": admin_email})
    if existing_user:
        print(f"✅ Super admin already exists in users collection with ID: {existing_user['_id']}")
        return
    
    # Create super admin in users collection
    super_admin_user = {
        "email": admin_email,
        "password_hash": super_admin_company.get("password_hash", get_password_hash("SuperAdmin123!")),
        "company_id": None,  # Super admin doesn't belong to a specific company
        "role": "super_admin",
        "email_verified": True,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "last_login": super_admin_company.get("last_login"),
        "settings": {
            "is_super_admin": True,
            "can_manage_all_companies": True,
            "can_view_system_analytics": True
        }
    }
    
    result = await users_collection.insert_one(super_admin_user)
    print(f"✅ Super admin migrated to users collection with ID: {result.inserted_id}")
    print(f"   Email: {admin_email}")
    print(f"   Role: super_admin")
    print(f"   Default password: SuperAdmin123! (change after login)")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_super_admin())
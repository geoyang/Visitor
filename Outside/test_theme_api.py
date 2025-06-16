#!/usr/bin/env python3
"""
Test script to verify theme API endpoints are working
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

async def test_theme_database():
    """Test that themes are accessible in the database"""
    
    # MongoDB connection
    MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://admin:devpassword@localhost:27017/visitor_management?authSource=admin')
    DATABASE_NAME = 'visitor_management'
    
    try:
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client[DATABASE_NAME]
        
        print(f"🔗 Connected to MongoDB: visitor_management database")
        
        themes_collection = db.themes
        companies_collection = db.companies
        
        # Get one company for testing
        company = await companies_collection.find_one({})
        if not company:
            print("❌ No companies found")
            return
            
        company_id = company.get("id") or str(company["_id"])
        company_name = company.get("name", "Unknown Company")
        
        print(f"🏢 Testing with company: {company_name} ({company_id})")
        
        # Get themes for this company
        themes_cursor = themes_collection.find({"companyId": company_id})
        themes = await themes_cursor.to_list(length=None)
        
        print(f"\n📋 Found {len(themes)} themes for {company_name}:")
        
        for theme in themes:
            print(f"   ✅ {theme['name']} (ID: {theme['id']})")
            print(f"      Category: {theme['category']}")
            print(f"      Status: {theme['status']}")
            print(f"      Primary Color: {theme['colors']['primary']}")
            print(f"      Created: {theme['createdAt']}")
            print()
        
        # Test total themes across all companies
        total_themes = await themes_collection.count_documents({})
        total_companies = await companies_collection.count_documents({})
        
        print(f"📊 Database Summary:")
        print(f"   Total themes: {total_themes}")
        print(f"   Total companies: {total_companies}")
        print(f"   Themes per company: {total_themes // total_companies if total_companies > 0 else 0}")
        
        # Test theme categories
        pipeline = [
            {"$group": {"_id": "$category", "count": {"$sum": 1}}}
        ]
        categories = await themes_collection.aggregate(pipeline).to_list(length=None)
        
        print(f"\n📈 Theme Categories:")
        for cat in categories:
            print(f"   {cat['_id']}: {cat['count']} themes")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error testing themes: {e}")
        raise

if __name__ == "__main__":
    print("🧪 Testing theme database integration...")
    asyncio.run(test_theme_database())
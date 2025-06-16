#!/usr/bin/env python3
"""
Setup script to initialize theme collections in visitor_management MongoDB database
"""

import asyncio
import os
import sys

# Try to import motor, install if not available
try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ImportError:
    print("Installing motor (MongoDB async driver)...")
    os.system("pip3 install motor")
    from motor.motor_asyncio import AsyncIOMotorClient

from datetime import datetime, timezone

async def setup_theme_collections():
    """Initialize theme collections with indexes and sample data"""
    
    # MongoDB connection - connecting to Docker instance with auth
    MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://admin:devpassword@localhost:27017/visitor_management?authSource=admin')
    DATABASE_NAME = 'visitor_management'
    
    print(f"🐳 Connecting to Docker MongoDB instance with authentication...")
    
    try:
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client[DATABASE_NAME]
        
        print(f"🔗 Connected to MongoDB: {MONGODB_URL}")
        print(f"📂 Database: {DATABASE_NAME}")
        
        # Collections
        themes_collection = db.themes
        theme_activations_collection = db.theme_activations
        
        # List existing collections
        existing_collections = await db.list_collection_names()
        print(f"📋 Existing collections: {existing_collections}")
        
        # Create indexes for themes collection
        print("\n🔧 Setting up themes collection indexes...")
        
        try:
            # Company isolation index
            await themes_collection.create_index([("companyId", 1)])
            print("✅ Created index: companyId")
            
            # Company + status index
            await themes_collection.create_index([("companyId", 1), ("status", 1)])
            print("✅ Created index: companyId + status")
            
            # Company + category index
            await themes_collection.create_index([("companyId", 1), ("category", 1)])
            print("✅ Created index: companyId + category")
            
            # Unique theme ID index
            await themes_collection.create_index([("id", 1)], unique=True)
            print("✅ Created index: id (unique)")
            
            # Created date index
            await themes_collection.create_index([("createdAt", -1)])
            print("✅ Created index: createdAt")
            
        except Exception as e:
            print(f"⚠️  Index creation warning: {e}")
        
        # Create indexes for theme_activations collection
        print("\n🔧 Setting up theme_activations collection indexes...")
        
        try:
            # One active theme per company
            await theme_activations_collection.create_index([("companyId", 1)], unique=True)
            print("✅ Created index: companyId (unique)")
            
            # Theme ID index
            await theme_activations_collection.create_index([("themeId", 1)])
            print("✅ Created index: themeId")
            
        except Exception as e:
            print(f"⚠️  Index creation warning: {e}")
        
        # Check collections again
        collections_after = await db.list_collection_names()
        print(f"\n📋 Collections after setup: {collections_after}")
        
        # Count documents in theme collections
        themes_count = await themes_collection.count_documents({})
        activations_count = await theme_activations_collection.count_documents({})
        
        print(f"\n📊 Collection Statistics:")
        print(f"   themes: {themes_count} documents")
        print(f"   theme_activations: {activations_count} documents")
        
        # Verify collections exist
        if 'themes' in collections_after:
            print("✅ themes collection is ready")
        else:
            print("❌ themes collection not found")
            
        if 'theme_activations' in collections_after:
            print("✅ theme_activations collection is ready")
        else:
            print("❌ theme_activations collection not found")
        
        print("\n🎉 Theme collections setup complete!")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error setting up theme collections: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("🚀 Setting up theme collections in visitor_management database...")
    asyncio.run(setup_theme_collections())
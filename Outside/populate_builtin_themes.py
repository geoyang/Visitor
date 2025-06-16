#!/usr/bin/env python3
"""
Script to populate the visitor_management database with built-in themes
"""

import asyncio
import os
from datetime import datetime, timezone

# Import MongoDB driver
try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ImportError:
    print("Installing motor (MongoDB async driver)...")
    os.system("pip3 install motor --break-system-packages")
    from motor.motor_asyncio import AsyncIOMotorClient

async def populate_builtin_themes():
    """Populate database with built-in themes for all companies"""
    
    # MongoDB connection
    MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://admin:devpassword@localhost:27017/visitor_management?authSource=admin')
    DATABASE_NAME = 'visitor_management'
    
    try:
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client[DATABASE_NAME]
        
        print(f"🔗 Connected to MongoDB: visitor_management database")
        
        themes_collection = db.themes
        companies_collection = db.companies
        
        # Get all companies
        companies_cursor = companies_collection.find({})
        companies = await companies_cursor.to_list(length=None)
        
        if not companies:
            print("❌ No companies found. Please create companies first.")
            return
            
        print(f"📋 Found {len(companies)} companies")
        
        # Built-in themes data (from React Native app)
        builtin_themes = [
            {
                "id": "hightech",
                "name": "High Tech",
                "description": "Built-in High Tech theme",
                "colors": {
                    "primary": "#0066ff",
                    "secondary": "#00d4aa", 
                    "background": "#f8fafc",
                    "surface": "#ffffff",
                    "text": "#1e293b",
                    "textSecondary": "#64748b",
                    "error": "#ef4444",
                    "warning": "#f59e0b",
                    "success": "#10b981",
                    "info": "#3b82f6",
                    "border": "#64748b",
                    "headerBackground": "#0066ff",
                    "headerText": "#ffffff",
                    "buttonBackground": "#0066ff",
                    "buttonText": "#ffffff",
                    "linkColor": "#0066ff"
                }
            },
            {
                "id": "lawfirm",
                "name": "Law Firm", 
                "description": "Built-in Law Firm theme",
                "colors": {
                    "primary": "#7c2d12",
                    "secondary": "#dc2626",
                    "background": "#fefefe",
                    "surface": "#ffffff", 
                    "text": "#1c1917",
                    "textSecondary": "#57534e",
                    "error": "#dc2626",
                    "warning": "#ea580c",
                    "success": "#16a34a",
                    "info": "#2563eb",
                    "border": "#57534e",
                    "headerBackground": "#7c2d12",
                    "headerText": "#ffffff",
                    "buttonBackground": "#7c2d12",
                    "buttonText": "#ffffff",
                    "linkColor": "#7c2d12"
                }
            },
            {
                "id": "metropolitan",
                "name": "Metropolitan",
                "description": "Built-in Metropolitan theme", 
                "colors": {
                    "primary": "#db2777",
                    "secondary": "#ec4899",
                    "background": "#fefefe",
                    "surface": "#ffffff",
                    "text": "#1f2937",
                    "textSecondary": "#6b7280",
                    "error": "#ef4444",
                    "warning": "#f59e0b",
                    "success": "#10b981",
                    "info": "#3b82f6",
                    "border": "#6b7280",
                    "headerBackground": "#db2777",
                    "headerText": "#ffffff",
                    "buttonBackground": "#db2777",
                    "buttonText": "#ffffff",
                    "linkColor": "#db2777"
                }
            },
            {
                "id": "zen",
                "name": "Calm Zen",
                "description": "Built-in Calm Zen theme",
                "colors": {
                    "primary": "#059669",
                    "secondary": "#10b981",
                    "background": "#f0fdf4",
                    "surface": "#ffffff",
                    "text": "#1f2937", 
                    "textSecondary": "#6b7280",
                    "error": "#dc2626",
                    "warning": "#ea580c",
                    "success": "#16a34a",
                    "info": "#0891b2",
                    "border": "#6b7280",
                    "headerBackground": "#059669",
                    "headerText": "#ffffff",
                    "buttonBackground": "#059669",
                    "buttonText": "#ffffff",
                    "linkColor": "#059669"
                }
            }
        ]
        
        # Common theme structure
        common_theme_data = {
            "fonts": {
                "primary": "System",
                "heading": "System", 
                "body": "System",
                "button": "System",
                "sizes": {
                    "xs": 10,
                    "sm": 12,
                    "md": 14,
                    "lg": 16,
                    "xl": 20,
                    "xxl": 24
                },
                "weights": {
                    "light": "300",
                    "regular": "400", 
                    "medium": "500",
                    "semibold": "600",
                    "bold": "700"
                }
            },
            "images": {
                "logo": "",
                "background": "",
                "welcomeImage": ""
            },
            "spacing": {
                "xs": 4,
                "sm": 8,
                "md": 16,
                "lg": 24,
                "xl": 32,
                "xxl": 48
            },
            "borderRadius": {
                "none": 0,
                "sm": 4,
                "md": 8,
                "lg": 12,
                "xl": 16,
                "full": 9999
            },
            "shadows": {
                "none": "none",
                "sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                "xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            },
            "animations": {
                "duration": {
                    "fast": 150,
                    "normal": 300,
                    "slow": 500
                },
                "easing": {
                    "linear": "linear",
                    "easeIn": "ease-in",
                    "easeOut": "ease-out",
                    "easeInOut": "ease-in-out"
                }
            },
            "formConfig": {
                "defaultFormIds": [],
                "formOrder": [],
                "hiddenFormIds": [],
                "formStyles": {}
            },
            "layoutConfig": {
                "showLogo": True,
                "logoPosition": "center",
                "showCompanyName": True,
                "showWelcomeMessage": True,
                "welcomeMessage": "Welcome!",
                "showDateTime": True,
                "showLocationInfo": True
            },
            "category": "default",
            "status": "active",
            "createdBy": "system",
            "version": 1
        }
        
        themes_created = 0
        themes_updated = 0
        
        # Create themes for each company
        for company in companies:
            company_id = company.get("id") or str(company["_id"])
            company_name = company.get("name", "Unknown Company")
            
            print(f"\n📝 Processing company: {company_name} ({company_id})")
            
            for theme_data in builtin_themes:
                # Create full theme document
                theme_doc = {
                    **common_theme_data,
                    "id": f"{theme_data['id']}_{company_id}",  # Make unique per company
                    "name": theme_data["name"],
                    "description": theme_data["description"],
                    "colors": theme_data["colors"],
                    "companyId": company_id,
                    "createdAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc)
                }
                
                # Check if theme already exists
                existing = await themes_collection.find_one({
                    "id": theme_doc["id"]
                })
                
                if existing:
                    # Update existing theme
                    await themes_collection.update_one(
                        {"id": theme_doc["id"]},
                        {"$set": {
                            **theme_doc,
                            "updatedAt": datetime.now(timezone.utc)
                        }}
                    )
                    themes_updated += 1
                    print(f"   ✅ Updated theme: {theme_data['name']}")
                else:
                    # Create new theme
                    await themes_collection.insert_one(theme_doc)
                    themes_created += 1
                    print(f"   ✅ Created theme: {theme_data['name']}")
        
        # Summary
        print(f"\n🎉 Built-in themes populated successfully!")
        print(f"   📊 {themes_created} themes created")
        print(f"   📊 {themes_updated} themes updated")
        print(f"   📊 {len(companies)} companies processed")
        
        # Show final count
        total_themes = await themes_collection.count_documents({})
        print(f"   📊 Total themes in database: {total_themes}")
        
        client.close()
        
    except Exception as e:
        print(f"❌ Error populating themes: {e}")
        raise

if __name__ == "__main__":
    print("🚀 Populating built-in themes in visitor_management database...")
    asyncio.run(populate_builtin_themes())
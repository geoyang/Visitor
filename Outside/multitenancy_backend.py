from fastapi import FastAPI, HTTPException, Depends, status, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import uvicorn
import json
from multitenancy_models import *

app = FastAPI(title="Visitor Management API - Multitenant", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = "visitor_management_mt"

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DATABASE_NAME]

# Collections
companies_collection = db.companies
locations_collection = db.locations
devices_collection = db.devices
users_collection = db.users
visitors_collection = db.visitors
forms_collection = db.forms
workflows_collection = db.workflows

# Security
security = HTTPBearer(auto_error=False)

# Helper functions for data transformation
def company_helper(company) -> dict:
    return {
        "id": str(company["_id"]),
        "name": company["name"],
        "slug": company["slug"],
        "domain": company.get("domain"),
        "logo_url": company.get("logo_url"),
        "status": company["status"],
        "settings": company.get("settings", {}),
        "subscription_plan": company.get("subscription_plan", "basic"),
        "max_locations": company.get("max_locations", 5),
        "max_devices_per_location": company.get("max_devices_per_location", 10),
        "created_at": company["created_at"],
        "updated_at": company["updated_at"],
        "locations_count": company.get("locations_count", 0),
        "devices_count": company.get("devices_count", 0),
        "active_visitors_count": company.get("active_visitors_count", 0),
    }

def location_helper(location) -> dict:
    return {
        "id": str(location["_id"]),
        "company_id": location["company_id"],
        "name": location["name"],
        "address": location.get("address"),
        "latitude": location.get("latitude"),
        "longitude": location.get("longitude"),
        "timezone": location.get("timezone", "UTC"),
        "status": location["status"],
        "settings": location.get("settings", {}),
        "working_hours": location.get("working_hours", {}),
        "contact_info": location.get("contact_info", {}),
        "created_at": location["created_at"],
        "updated_at": location["updated_at"],
        "company_name": location.get("company_name"),
        "devices_count": location.get("devices_count", 0),
        "active_visitors_count": location.get("active_visitors_count", 0),
    }

def device_helper(device) -> dict:
    last_seen = device.get("last_seen")
    is_online = False
    if last_seen:
        # Consider device online if last seen within 5 minutes
        time_diff = datetime.now(timezone.utc) - last_seen
        is_online = time_diff < timedelta(minutes=5)
    
    return {
        "id": str(device["_id"]),
        "company_id": device["company_id"],
        "location_id": device["location_id"],
        "name": device["name"],
        "device_type": device["device_type"],
        "device_id": device["device_id"],
        "status": device["status"],
        "last_seen": device.get("last_seen"),
        "ip_address": device.get("ip_address"),
        "user_agent": device.get("user_agent"),
        "app_version": device.get("app_version"),
        "settings": device.get("settings", {}),
        "assigned_forms": device.get("assigned_forms", []),
        "created_at": device["created_at"],
        "updated_at": device["updated_at"],
        "company_name": device.get("company_name"),
        "location_name": device.get("location_name"),
        "is_online": is_online,
    }

def visitor_helper_mt(visitor) -> dict:
    return {
        "id": str(visitor["_id"]),
        "company_id": visitor["company_id"],
        "location_id": visitor["location_id"],
        "device_id": visitor["device_id"],
        "form_id": visitor["form_id"],
        "data": visitor["data"],
        "check_in_time": visitor["check_in_time"],
        "check_out_time": visitor.get("check_out_time"),
        "status": visitor["status"],
        "host_notified": visitor.get("host_notified", False),
        "notes": visitor.get("notes"),
        # Denormalized fields
        "company_name": visitor.get("company_name"),
        "location_name": visitor.get("location_name"),
        "device_name": visitor.get("device_name"),
        # Extract common fields for easy access
        "full_name": visitor["data"].get("full_name"),
        "company": visitor["data"].get("company"),
        "email": visitor["data"].get("email"),
        "phone": visitor["data"].get("phone"),
        "host_name": visitor["data"].get("host_name"),
        "visit_purpose": visitor["data"].get("visit_purpose"),
    }

def form_helper_mt(form) -> dict:
    return {
        "id": str(form["_id"]),
        "company_id": form["company_id"],
        "name": form["name"],
        "description": form.get("description"),
        "fields": form["fields"],
        "is_active": form["is_active"],
        "is_global": form.get("is_global", False),
        "location_ids": form.get("location_ids", []),
        "created_at": form["created_at"],
        "updated_at": form["updated_at"],
        "company_name": form.get("company_name"),
    }

def user_helper(user) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
        "company_id": user.get("company_id"),
        "location_ids": user.get("location_ids", []),
        "is_active": user["is_active"],
        "last_login": user.get("last_login"),
        "created_at": user["created_at"],
        "updated_at": user["updated_at"],
        "company_name": user.get("company_name"),
    }

# Tenant resolution middleware
async def get_tenant_context(
    x_company_slug: Optional[str] = Header(None),
    x_company_id: Optional[str] = Header(None),
    request: Request = None
) -> TenantContext:
    """Extract tenant context from headers or subdomain"""
    
    company_id = None
    company_slug = None
    
    # Try to get company from headers first
    if x_company_id:
        company_id = x_company_id
    elif x_company_slug:
        company_slug = x_company_slug
    else:
        # Try to extract from subdomain if using subdomain-based routing
        host = request.headers.get("host", "")
        if "." in host:
            potential_slug = host.split(".")[0]
            if potential_slug not in ["www", "api", "admin"]:
                company_slug = potential_slug
    
    # Look up company
    if company_id:
        company = await companies_collection.find_one({"_id": ObjectId(company_id)})
    elif company_slug:
        company = await companies_collection.find_one({"slug": company_slug})
    else:
        raise HTTPException(status_code=400, detail="Company identification required")
    
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    if company["status"] != CompanyStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Company account is not active")
    
    return TenantContext(
        company_id=str(company["_id"]),
        company_slug=company["slug"]
    )

# Authentication middleware (simplified - implement proper JWT/OAuth)
async def get_current_user(
    tenant: TenantContext = Depends(get_tenant_context),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[dict]:
    """Get current authenticated user (simplified implementation)"""
    # In production, implement proper JWT token validation
    # For now, return None to allow unauthenticated access
    return None

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Visitor Management API - Multitenant", "version": "2.0.0"}

# Health check
@app.get("/health")
async def health_check():
    try:
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

# Company Management Endpoints
@app.post("/companies", response_model=CompanyResponse)
async def create_company(company: Company):
    """Create a new company (super admin only)"""
    try:
        # Check if slug is unique
        existing = await companies_collection.find_one({"slug": company.slug})
        if existing:
            raise HTTPException(status_code=400, detail="Company slug already exists")
        
        company_dict = company.dict()
        result = await companies_collection.insert_one(company_dict)
        
        new_company = await companies_collection.find_one({"_id": result.inserted_id})
        return company_helper(new_company)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/companies", response_model=List[CompanyResponse])
async def get_companies(limit: int = 100, skip: int = 0):
    """Get all companies (super admin only)"""
    try:
        # Aggregate to include counts
        pipeline = [
            {"$skip": skip},
            {"$limit": limit},
            {
                "$lookup": {
                    "from": "locations",
                    "localField": "_id",
                    "foreignField": "company_id",
                    "as": "locations"
                }
            },
            {
                "$lookup": {
                    "from": "devices",
                    "localField": "_id", 
                    "foreignField": "company_id",
                    "as": "devices"
                }
            },
            {
                "$lookup": {
                    "from": "visitors",
                    "let": {"company_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {"$match": {
                            "$expr": {"$eq": ["$company_id", "$$company_id"]},
                            "status": "checked_in"
                        }}
                    ],
                    "as": "active_visitors"
                }
            },
            {
                "$addFields": {
                    "locations_count": {"$size": "$locations"},
                    "devices_count": {"$size": "$devices"},
                    "active_visitors_count": {"$size": "$active_visitors"}
                }
            },
            {
                "$project": {
                    "locations": 0,
                    "devices": 0,
                    "active_visitors": 0
                }
            }
        ]
        
        companies_cursor = companies_collection.aggregate(pipeline)
        companies = await companies_cursor.to_list(length=limit)
        return [company_helper(company) for company in companies]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/companies/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: str):
    """Get a specific company"""
    try:
        # Use aggregation to include counts
        pipeline = [
            {"$match": {"_id": ObjectId(company_id)}},
            {
                "$lookup": {
                    "from": "locations",
                    "localField": "_id",
                    "foreignField": "company_id", 
                    "as": "locations"
                }
            },
            {
                "$lookup": {
                    "from": "devices",
                    "localField": "_id",
                    "foreignField": "company_id",
                    "as": "devices"
                }
            },
            {
                "$lookup": {
                    "from": "visitors",
                    "let": {"company_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {"$match": {
                            "$expr": {"$eq": ["$company_id", "$$company_id"]},
                            "status": "checked_in"
                        }}
                    ],
                    "as": "active_visitors"
                }
            },
            {
                "$addFields": {
                    "locations_count": {"$size": "$locations"},
                    "devices_count": {"$size": "$devices"},
                    "active_visitors_count": {"$size": "$active_visitors"}
                }
            },
            {
                "$project": {
                    "locations": 0,
                    "devices": 0, 
                    "active_visitors": 0
                }
            }
        ]
        
        result = await companies_collection.aggregate(pipeline).to_list(length=1)
        if not result:
            raise HTTPException(status_code=404, detail="Company not found")
        
        return company_helper(result[0])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Location Management Endpoints  
@app.post("/locations", response_model=LocationResponse)
async def create_location(
    location: Location,
    tenant: TenantContext = Depends(get_tenant_context)
):
    """Create a new location for the tenant company"""
    try:
        # Verify company exists and check limits
        company = await companies_collection.find_one({"_id": ObjectId(tenant.company_id)})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Check location limits
        existing_locations = await locations_collection.count_documents({"company_id": tenant.company_id})
        if existing_locations >= company.get("max_locations", 5):
            raise HTTPException(status_code=400, detail="Maximum locations limit reached")
        
        location_dict = location.dict()
        location_dict["company_id"] = tenant.company_id
        
        result = await locations_collection.insert_one(location_dict)
        new_location = await locations_collection.find_one({"_id": result.inserted_id})
        
        # Add company name
        new_location["company_name"] = company["name"]
        
        return location_helper(new_location)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/locations", response_model=List[LocationResponse])
async def get_locations(
    tenant: TenantContext = Depends(get_tenant_context),
    limit: int = 100,
    skip: int = 0
):
    """Get all locations for the tenant company"""
    try:
        pipeline = [
            {"$match": {"company_id": tenant.company_id}},
            {"$skip": skip},
            {"$limit": limit},
            {
                "$lookup": {
                    "from": "companies",
                    "localField": "company_id",
                    "foreignField": "_id",
                    "as": "company"
                }
            },
            {
                "$lookup": {
                    "from": "devices",
                    "localField": "_id",
                    "foreignField": "location_id",
                    "as": "devices"
                }
            },
            {
                "$lookup": {
                    "from": "visitors",
                    "let": {"location_id": {"$toString": "$_id"}},
                    "pipeline": [
                        {"$match": {
                            "$expr": {"$eq": ["$location_id", "$$location_id"]},
                            "status": "checked_in"
                        }}
                    ],
                    "as": "active_visitors"
                }
            },
            {
                "$addFields": {
                    "company_name": {"$arrayElemAt": ["$company.name", 0]},
                    "devices_count": {"$size": "$devices"},
                    "active_visitors_count": {"$size": "$active_visitors"}
                }
            },
            {
                "$project": {
                    "company": 0,
                    "devices": 0,
                    "active_visitors": 0
                }
            }
        ]
        
        locations_cursor = locations_collection.aggregate(pipeline)
        locations = await locations_cursor.to_list(length=limit)
        return [location_helper(location) for location in locations]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Device Management Endpoints
@app.post("/devices", response_model=DeviceResponse)
async def create_device(
    device: Device,
    tenant: TenantContext = Depends(get_tenant_context)
):
    """Register a new device for a location"""
    try:
        # Verify location belongs to tenant company
        location = await locations_collection.find_one({
            "_id": ObjectId(device.location_id),
            "company_id": tenant.company_id
        })
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Check device limits
        company = await companies_collection.find_one({"_id": ObjectId(tenant.company_id)})
        existing_devices = await devices_collection.count_documents({"location_id": device.location_id})
        if existing_devices >= company.get("max_devices_per_location", 10):
            raise HTTPException(status_code=400, detail="Maximum devices per location limit reached")
        
        # Check if device_id is unique within company
        existing_device = await devices_collection.find_one({
            "device_id": device.device_id,
            "company_id": tenant.company_id
        })
        if existing_device:
            raise HTTPException(status_code=400, detail="Device ID already exists in this company")
        
        device_dict = device.dict()
        device_dict["company_id"] = tenant.company_id
        device_dict["last_seen"] = datetime.now(timezone.utc)
        
        result = await devices_collection.insert_one(device_dict)
        new_device = await devices_collection.find_one({"_id": result.inserted_id})
        
        # Add denormalized fields
        new_device["company_name"] = company["name"]
        new_device["location_name"] = location["name"]
        
        return device_helper(new_device)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/devices", response_model=List[DeviceResponse])
async def get_devices(
    tenant: TenantContext = Depends(get_tenant_context),
    location_id: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all devices for the tenant company, optionally filtered by location"""
    try:
        match_filter = {"company_id": tenant.company_id}
        if location_id:
            match_filter["location_id"] = location_id
        
        pipeline = [
            {"$match": match_filter},
            {"$skip": skip},
            {"$limit": limit},
            {
                "$lookup": {
                    "from": "companies",
                    "localField": "company_id",
                    "foreignField": "_id",
                    "as": "company"
                }
            },
            {
                "$lookup": {
                    "from": "locations",
                    "localField": "location_id",
                    "foreignField": "_id",
                    "as": "location"
                }
            },
            {
                "$addFields": {
                    "company_name": {"$arrayElemAt": ["$company.name", 0]},
                    "location_name": {"$arrayElemAt": ["$location.name", 0]}
                }
            },
            {
                "$project": {
                    "company": 0,
                    "location": 0
                }
            }
        ]
        
        devices_cursor = devices_collection.aggregate(pipeline)
        devices = await devices_cursor.to_list(length=limit)
        return [device_helper(device) for device in devices]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Device heartbeat endpoint
@app.post("/devices/{device_id}/heartbeat")
async def device_heartbeat(
    device_id: str,
    heartbeat: DeviceHeartbeat,
    tenant: TenantContext = Depends(get_tenant_context)
):
    """Update device last seen timestamp and status"""
    try:
        update_data = {
            "last_seen": heartbeat.timestamp,
            "status": DeviceStatus.ACTIVE,
            "updated_at": datetime.now(timezone.utc)
        }
        
        if heartbeat.ip_address:
            update_data["ip_address"] = heartbeat.ip_address
        if heartbeat.user_agent:
            update_data["user_agent"] = heartbeat.user_agent
        if heartbeat.app_version:
            update_data["app_version"] = heartbeat.app_version
        
        result = await devices_collection.update_one(
            {
                "_id": ObjectId(device_id),
                "company_id": tenant.company_id
            },
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Device not found")
        
        return {"message": "Heartbeat recorded successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Visitor Management Endpoints (Multitenant)
@app.post("/visitors", response_model=VisitorResponseMT)
async def create_visitor_mt(
    visitor: VisitorDataMT,
    tenant: TenantContext = Depends(get_tenant_context)
):
    """Create a new visitor entry (multitenant)"""
    try:
        # Verify all IDs belong to the tenant company
        if visitor.company_id != tenant.company_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Verify location exists and belongs to company
        location = await locations_collection.find_one({
            "_id": ObjectId(visitor.location_id),
            "company_id": tenant.company_id
        })
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Verify device exists and belongs to location
        device = await devices_collection.find_one({
            "_id": ObjectId(visitor.device_id),
            "company_id": tenant.company_id,
            "location_id": visitor.location_id
        })
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Verify form exists and is accessible
        if visitor.form_id != "default":
            form = await forms_collection.find_one({
                "_id": ObjectId(visitor.form_id),
                "company_id": tenant.company_id,
                "is_active": True
            })
            if not form:
                raise HTTPException(status_code=404, detail="Form not found")
        
        visitor_dict = visitor.dict()
        result = await visitors_collection.insert_one(visitor_dict)
        
        # Get the created visitor with denormalized data
        pipeline = [
            {"$match": {"_id": result.inserted_id}},
            {
                "$lookup": {
                    "from": "companies",
                    "localField": "company_id",
                    "foreignField": "_id",
                    "as": "company"
                }
            },
            {
                "$lookup": {
                    "from": "locations",
                    "localField": "location_id",
                    "foreignField": "_id",
                    "as": "location"
                }
            },
            {
                "$lookup": {
                    "from": "devices",
                    "localField": "device_id",
                    "foreignField": "_id",
                    "as": "device"
                }
            },
            {
                "$addFields": {
                    "company_name": {"$arrayElemAt": ["$company.name", 0]},
                    "location_name": {"$arrayElemAt": ["$location.name", 0]},
                    "device_name": {"$arrayElemAt": ["$device.name", 0]}
                }
            },
            {
                "$project": {
                    "company": 0,
                    "location": 0,
                    "device": 0
                }
            }
        ]
        
        result_visitor = await visitors_collection.aggregate(pipeline).to_list(length=1)
        new_visitor = result_visitor[0] if result_visitor else None
        
        if not new_visitor:
            raise HTTPException(status_code=500, detail="Failed to retrieve created visitor")
        
        return visitor_helper_mt(new_visitor)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/visitors", response_model=List[VisitorResponseMT])
async def get_visitors_mt(
    tenant: TenantContext = Depends(get_tenant_context),
    location_id: Optional[str] = None,
    device_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all visitors for the tenant company with optional filtering"""
    try:
        match_filter = {"company_id": tenant.company_id}
        
        if location_id:
            match_filter["location_id"] = location_id
        if device_id:
            match_filter["device_id"] = device_id
        if status:
            match_filter["status"] = status
        
        pipeline = [
            {"$match": match_filter},
            {"$sort": {"check_in_time": -1}},
            {"$skip": skip},
            {"$limit": limit},
            {
                "$lookup": {
                    "from": "companies",
                    "localField": "company_id",
                    "foreignField": "_id",
                    "as": "company"
                }
            },
            {
                "$lookup": {
                    "from": "locations",
                    "localField": "location_id",
                    "foreignField": "_id",
                    "as": "location"
                }
            },
            {
                "$lookup": {
                    "from": "devices",
                    "localField": "device_id",
                    "foreignField": "_id",
                    "as": "device"
                }
            },
            {
                "$addFields": {
                    "company_name": {"$arrayElemAt": ["$company.name", 0]},
                    "location_name": {"$arrayElemAt": ["$location.name", 0]},
                    "device_name": {"$arrayElemAt": ["$device.name", 0]}
                }
            },
            {
                "$project": {
                    "company": 0,
                    "location": 0,
                    "device": 0
                }
            }
        ]
        
        visitors_cursor = visitors_collection.aggregate(pipeline)
        visitors = await visitors_cursor.to_list(length=limit)
        return [visitor_helper_mt(visitor) for visitor in visitors]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/visitors/active", response_model=List[VisitorResponseMT])
async def get_active_visitors_mt(
    tenant: TenantContext = Depends(get_tenant_context),
    location_id: Optional[str] = None
):
    """Get all currently checked-in visitors for the tenant company"""
    try:
        match_filter = {
            "company_id": tenant.company_id,
            "status": "checked_in"
        }
        
        if location_id:
            match_filter["location_id"] = location_id
        
        pipeline = [
            {"$match": match_filter},
            {"$sort": {"check_in_time": -1}},
            {
                "$lookup": {
                    "from": "companies",
                    "localField": "company_id",
                    "foreignField": "_id",
                    "as": "company"
                }
            },
            {
                "$lookup": {
                    "from": "locations",
                    "localField": "location_id",
                    "foreignField": "_id",
                    "as": "location"
                }
            },
            {
                "$lookup": {
                    "from": "devices",
                    "localField": "device_id",
                    "foreignField": "_id",
                    "as": "device"
                }
            },
            {
                "$addFields": {
                    "company_name": {"$arrayElemAt": ["$company.name", 0]},
                    "location_name": {"$arrayElemAt": ["$location.name", 0]},
                    "device_name": {"$arrayElemAt": ["$device.name", 0]}
                }
            },
            {
                "$project": {
                    "company": 0,
                    "location": 0,
                    "device": 0
                }
            }
        ]
        
        visitors_cursor = visitors_collection.aggregate(pipeline)
        visitors = await visitors_cursor.to_list(length=None)
        return [visitor_helper_mt(visitor) for visitor in visitors]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/visitors/{visitor_id}/checkout")
async def checkout_visitor_mt(
    visitor_id: str,
    tenant: TenantContext = Depends(get_tenant_context)
):
    """Check out a visitor (multitenant)"""
    try:
        update_data = {
            "status": "checked_out",
            "check_out_time": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        result = await visitors_collection.update_one(
            {
                "_id": ObjectId(visitor_id),
                "company_id": tenant.company_id
            },
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Visitor not found")
        
        return {"message": "Visitor checked out successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Form Management Endpoints (Multitenant)
@app.post("/forms", response_model=CustomFormResponseMT)
async def create_form_mt(
    form: CustomFormMT,
    tenant: TenantContext = Depends(get_tenant_context)
):
    """Create a new custom form for the tenant company"""
    try:
        form_dict = form.dict()
        form_dict["company_id"] = tenant.company_id
        
        # If location_ids specified, verify they belong to the company
        if form.location_ids:
            for location_id in form.location_ids:
                location = await locations_collection.find_one({
                    "_id": ObjectId(location_id),
                    "company_id": tenant.company_id
                })
                if not location:
                    raise HTTPException(status_code=400, detail=f"Location {location_id} not found")
        
        result = await forms_collection.insert_one(form_dict)
        
        # Get the created form with company name
        pipeline = [
            {"$match": {"_id": result.inserted_id}},
            {
                "$lookup": {
                    "from": "companies",
                    "localField": "company_id",
                    "foreignField": "_id",
                    "as": "company"
                }
            },
            {
                "$addFields": {
                    "company_name": {"$arrayElemAt": ["$company.name", 0]}
                }
            },
            {
                "$project": {
                    "company": 0
                }
            }
        ]
        
        result_form = await forms_collection.aggregate(pipeline).to_list(length=1)
        new_form = result_form[0] if result_form else None
        
        if not new_form:
            raise HTTPException(status_code=500, detail="Failed to retrieve created form")
        
        return form_helper_mt(new_form)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/forms", response_model=List[CustomFormResponseMT])
async def get_forms_mt(
    tenant: TenantContext = Depends(get_tenant_context),
    location_id: Optional[str] = None
):
    """Get all forms for the tenant company"""
    try:
        match_filter = {
            "company_id": tenant.company_id,
            "is_active": True
        }
        
        # If location_id provided, get forms that are global or assigned to that location
        if location_id:
            match_filter["$or"] = [
                {"is_global": True},
                {"location_ids": location_id}
            ]
        
        pipeline = [
            {"$match": match_filter},
            {
                "$lookup": {
                    "from": "companies",
                    "localField": "company_id",
                    "foreignField": "_id",
                    "as": "company"
                }
            },
            {
                "$addFields": {
                    "company_name": {"$arrayElemAt": ["$company.name", 0]}
                }
            },
            {
                "$project": {
                    "company": 0
                }
            }
        ]
        
        forms_cursor = forms_collection.aggregate(pipeline)
        forms = await forms_cursor.to_list(length=None)
        return [form_helper_mt(form) for form in forms]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Analytics Endpoints (Multitenant)
@app.get("/analytics/company", response_model=CompanyAnalytics)
async def get_company_analytics(
    tenant: TenantContext = Depends(get_tenant_context)
):
    """Get analytics for the tenant company"""
    try:
        total_visitors = await visitors_collection.count_documents({"company_id": tenant.company_id})
        active_visitors = await visitors_collection.count_documents({
            "company_id": tenant.company_id,
            "status": "checked_in"
        })
        
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_visitors = await visitors_collection.count_documents({
            "company_id": tenant.company_id,
            "check_in_time": {"$gte": today_start}
        })
        
        total_locations = await locations_collection.count_documents({"company_id": tenant.company_id})
        total_devices = await devices_collection.count_documents({"company_id": tenant.company_id})
        
        # Count online devices (last seen within 5 minutes)
        five_minutes_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
        online_devices = await devices_collection.count_documents({
            "company_id": tenant.company_id,
            "last_seen": {"$gte": five_minutes_ago}
        })
        
        return CompanyAnalytics(
            company_id=tenant.company_id,
            total_visitors=total_visitors,
            active_visitors=active_visitors,
            today_visitors=today_visitors,
            total_locations=total_locations,
            total_devices=total_devices,
            online_devices=online_devices
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/analytics/location/{location_id}", response_model=LocationAnalytics)
async def get_location_analytics(
    location_id: str,
    tenant: TenantContext = Depends(get_tenant_context)
):
    """Get analytics for a specific location"""
    try:
        # Verify location belongs to tenant company
        location = await locations_collection.find_one({
            "_id": ObjectId(location_id),
            "company_id": tenant.company_id
        })
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        total_visitors = await visitors_collection.count_documents({
            "company_id": tenant.company_id,
            "location_id": location_id
        })
        
        active_visitors = await visitors_collection.count_documents({
            "company_id": tenant.company_id,
            "location_id": location_id,
            "status": "checked_in"
        })
        
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_visitors = await visitors_collection.count_documents({
            "company_id": tenant.company_id,
            "location_id": location_id,
            "check_in_time": {"$gte": today_start}
        })
        
        total_devices = await devices_collection.count_documents({
            "company_id": tenant.company_id,
            "location_id": location_id
        })
        
        # Count online devices
        five_minutes_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
        online_devices = await devices_collection.count_documents({
            "company_id": tenant.company_id,
            "location_id": location_id,
            "last_seen": {"$gte": five_minutes_ago}
        })
        
        return LocationAnalytics(
            location_id=location_id,
            company_id=tenant.company_id,
            total_visitors=total_visitors,
            active_visitors=active_visitors,
            today_visitors=today_visitors,
            total_devices=total_devices,
            online_devices=online_devices
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Database initialization
@app.on_event("startup")
async def startup_event():
    """Initialize database and create indexes"""
    try:
        # Create indexes for better performance
        await companies_collection.create_index("slug", unique=True)
        await companies_collection.create_index("domain")
        await companies_collection.create_index("status")
        
        await locations_collection.create_index("company_id")
        await locations_collection.create_index([("company_id", 1), ("status", 1)])
        
        await devices_collection.create_index("company_id")
        await devices_collection.create_index("location_id")
        await devices_collection.create_index([("company_id", 1), ("device_id", 1)], unique=True)
        await devices_collection.create_index("last_seen")
        
        await visitors_collection.create_index("company_id")
        await visitors_collection.create_index("location_id")
        await visitors_collection.create_index("device_id")
        await visitors_collection.create_index([("company_id", 1), ("status", 1)])
        await visitors_collection.create_index("check_in_time")
        await visitors_collection.create_index("form_id")
        
        await forms_collection.create_index("company_id")
        await forms_collection.create_index([("company_id", 1), ("is_active", 1)])
        
        await users_collection.create_index("email", unique=True)
        await users_collection.create_index("company_id")
        await users_collection.create_index([("company_id", 1), ("role", 1)])
        
        print("Database indexes created successfully")
        
        # Create sample company if none exists (for testing)
        existing_companies = await companies_collection.count_documents({})
        if existing_companies == 0:
            sample_company = {
                "name": "ACME Corporation",
                "slug": "acme-corp",
                "domain": "acme.com",
                "status": CompanyStatus.ACTIVE,
                "settings": {
                    "theme": "blue",
                    "require_host_approval": True,
                    "auto_checkout_hours": 8
                },
                "subscription_plan": "professional",
                "max_locations": 10,
                "max_devices_per_location": 20,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            result = await companies_collection.insert_one(sample_company)
            company_id = str(result.inserted_id)
            
            # Create sample location
            sample_location = {
                "company_id": company_id,
                "name": "Main Office",
                "address": "123 Business Ave, Corporate City, CC 12345",
                "latitude": 40.7128,
                "longitude": -74.0060,
                "timezone": "America/New_York",
                "status": LocationStatus.ACTIVE,
                "settings": {},
                "working_hours": {
                    "monday": {"start": "09:00", "end": "17:00"},
                    "tuesday": {"start": "09:00", "end": "17:00"},
                    "wednesday": {"start": "09:00", "end": "17:00"},
                    "thursday": {"start": "09:00", "end": "17:00"},
                    "friday": {"start": "09:00", "end": "17:00"},
                    "saturday": {"start": "closed", "end": "closed"},
                    "sunday": {"start": "closed", "end": "closed"}
                },
                "contact_info": {
                    "phone": "+1-555-123-4567",
                    "email": "reception@acme.com"
                },
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            location_result = await locations_collection.insert_one(sample_location)
            location_id = str(location_result.inserted_id)
            
            # Create sample device
            sample_device = {
                "company_id": company_id,
                "location_id": location_id,
                "name": "Reception Tablet",
                "device_type": DeviceType.TABLET,
                "device_id": "TABLET-001-ACME",
                "status": DeviceStatus.ACTIVE,
                "last_seen": datetime.now(timezone.utc),
                "settings": {
                    "welcome_message": "Welcome to ACME Corporation",
                    "auto_photos": True,
                    "print_badges": True
                },
                "assigned_forms": [],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            await devices_collection.insert_one(sample_device)
            
            # Create sample form
            sample_form = {
                "company_id": company_id,
                "name": "ACME Visitor Form",
                "description": "Standard visitor check-in form for ACME Corporation",
                "fields": [
                    {"name": "full_name", "type": "text", "label": "Full Name", "required": True},
                    {"name": "company", "type": "text", "label": "Company", "required": True},
                    {"name": "email", "type": "email", "label": "Email", "required": True},
                    {"name": "phone", "type": "phone", "label": "Phone", "required": False},
                    {
                        "name": "visit_purpose",
                        "type": "select",
                        "label": "Purpose of Visit",
                        "required": True,
                        "options": ["Business Meeting", "Interview", "Delivery", "Maintenance", "Other"]
                    },
                    {"name": "host_name", "type": "text", "label": "Person to Visit", "required": True},
                    {"name": "notes", "type": "textarea", "label": "Additional Notes", "required": False}
                ],
                "is_active": True,
                "is_global": True,
                "location_ids": [],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            await forms_collection.insert_one(sample_form)
            
            print(f"Sample company 'ACME Corporation' created with ID: {company_id}")
            print("Use company slug 'acme-corp' in X-Company-Slug header to access this tenant")
            
    except Exception as e:
        print(f"Error during startup: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "multitenancy_backend:app",
        host="0.0.0.0",
        port=8001,  # Different port to run alongside existing API
        reload=True
    )
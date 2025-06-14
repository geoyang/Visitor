#!/usr/bin/env python3

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import json

app = FastAPI(title="Visitor Management API - Multitenant Test", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock data store
mock_companies = {
    "acme-corp": {
        "id": "1",
        "name": "ACME Corporation",
        "slug": "acme-corp",
        "status": "active",
        "locations": {
            "loc1": {
                "id": "loc1",
                "name": "Main Office",
                "address": "123 Business Ave, Corporate City, CC 12345",
                "devices": {
                    "device1": {
                        "id": "device1",
                        "name": "Reception Tablet",
                        "device_id": "TABLET-001-ACME",
                        "is_online": True
                    }
                }
            }
        }
    }
}

mock_visitors = []

@app.get("/")
async def root():
    return {"message": "Visitor Management API - Multitenant Test", "version": "2.0.0"}

@app.get("/health")
async def health_check(x_company_slug: Optional[str] = Header(None)):
    if x_company_slug and x_company_slug in mock_companies:
        return {"status": "healthy", "company": x_company_slug}
    elif x_company_slug:
        raise HTTPException(status_code=404, detail="Company not found")
    return {"status": "healthy"}

@app.get("/analytics/company")
async def get_company_analytics(x_company_slug: str = Header(...)):
    if x_company_slug not in mock_companies:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company = mock_companies[x_company_slug]
    return {
        "company_id": company["id"],
        "total_visitors": len(mock_visitors),
        "active_visitors": len([v for v in mock_visitors if v.get("status") == "checked_in"]),
        "today_visitors": len(mock_visitors),
        "total_locations": len(company["locations"]),
        "total_devices": sum(len(loc["devices"]) for loc in company["locations"].values()),
        "online_devices": sum(1 for loc in company["locations"].values() 
                            for dev in loc["devices"].values() if dev.get("is_online")),
    }

@app.get("/locations")
async def get_locations(x_company_slug: str = Header(...)):
    if x_company_slug not in mock_companies:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company = mock_companies[x_company_slug]
    locations = []
    for loc_id, loc_data in company["locations"].items():
        locations.append({
            "id": loc_id,
            "company_id": company["id"],
            "name": loc_data["name"],
            "address": loc_data.get("address", ""),
            "status": "active",
            "devices_count": len(loc_data["devices"]),
            "active_visitors_count": len([v for v in mock_visitors 
                                        if v.get("location_id") == loc_id and v.get("status") == "checked_in"]),
            "company_name": company["name"]
        })
    return locations

@app.get("/devices")
async def get_devices(
    x_company_slug: str = Header(...),
    location_id: Optional[str] = None
):
    if x_company_slug not in mock_companies:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company = mock_companies[x_company_slug]
    devices = []
    
    for loc_id, loc_data in company["locations"].items():
        if location_id and loc_id != location_id:
            continue
            
        for dev_id, dev_data in loc_data["devices"].items():
            devices.append({
                "id": dev_id,
                "company_id": company["id"],
                "location_id": loc_id,
                "name": dev_data["name"],
                "device_type": "tablet",
                "device_id": dev_data["device_id"],
                "status": "active",
                "is_online": dev_data.get("is_online", False),
                "company_name": company["name"],
                "location_name": loc_data["name"]
            })
    return devices

@app.post("/devices")
async def create_device(
    device_data: Dict[str, Any],
    x_company_slug: str = Header(...)
):
    if x_company_slug not in mock_companies:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company = mock_companies[x_company_slug]
    location_id = device_data.get("location_id")
    
    if location_id not in company["locations"]:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Create new device
    new_device_id = f"device_{len(company['locations'][location_id]['devices']) + 1}"
    new_device = {
        "id": new_device_id,
        "name": device_data.get("name", "New Device"),
        "device_id": device_data.get("device_id", f"DEV-{new_device_id}"),
        "is_online": True
    }
    
    company["locations"][location_id]["devices"][new_device_id] = new_device
    
    return {
        "id": new_device_id,
        "company_id": company["id"],
        "location_id": location_id,
        "name": new_device["name"],
        "device_type": "tablet",
        "device_id": new_device["device_id"],
        "status": "active",
        "is_online": True,
        "company_name": company["name"],
        "location_name": company["locations"][location_id]["name"]
    }

@app.post("/devices/{device_id}/heartbeat")
async def device_heartbeat(
    device_id: str,
    heartbeat_data: Dict[str, Any],
    x_company_slug: str = Header(...)
):
    if x_company_slug not in mock_companies:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Just return success for mock
    return {"message": "Heartbeat recorded successfully"}

@app.get("/forms")
async def get_forms(
    x_company_slug: str = Header(...),
    location_id: Optional[str] = None
):
    if x_company_slug not in mock_companies:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Return mock form
    return [{
        "id": "form1",
        "company_id": mock_companies[x_company_slug]["id"],
        "name": "ACME Visitor Form",
        "description": "Standard visitor form for ACME Corporation",
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
        "company_name": mock_companies[x_company_slug]["name"]
    }]

@app.post("/visitors")
async def create_visitor(
    visitor_data: Dict[str, Any],
    x_company_slug: str = Header(...)
):
    if x_company_slug not in mock_companies:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Create new visitor
    visitor_id = f"visitor_{len(mock_visitors) + 1}"
    new_visitor = {
        "id": visitor_id,
        "company_id": visitor_data.get("company_id"),
        "location_id": visitor_data.get("location_id"),
        "device_id": visitor_data.get("device_id"),
        "form_id": visitor_data.get("form_id"),
        "data": visitor_data.get("data", {}),
        "check_in_time": datetime.now(timezone.utc).isoformat(),
        "status": "checked_in",
        "company_name": mock_companies[x_company_slug]["name"],
        "location_name": "Main Office",
        "device_name": "Reception Tablet"
    }
    
    # Add extracted fields
    data = visitor_data.get("data", {})
    new_visitor.update({
        "full_name": data.get("full_name"),
        "company": data.get("company"),
        "email": data.get("email"),
        "phone": data.get("phone"),
        "host_name": data.get("host_name"),
        "visit_purpose": data.get("visit_purpose")
    })
    
    mock_visitors.append(new_visitor)
    return new_visitor

@app.get("/visitors/active")
async def get_active_visitors(
    x_company_slug: str = Header(...),
    location_id: Optional[str] = None
):
    if x_company_slug not in mock_companies:
        raise HTTPException(status_code=404, detail="Company not found")
    
    active_visitors = [v for v in mock_visitors if v.get("status") == "checked_in"]
    if location_id:
        active_visitors = [v for v in active_visitors if v.get("location_id") == location_id]
    
    return active_visitors

@app.put("/visitors/{visitor_id}/checkout")
async def checkout_visitor(
    visitor_id: str,
    x_company_slug: str = Header(...)
):
    if x_company_slug not in mock_companies:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Find and checkout visitor
    for visitor in mock_visitors:
        if visitor["id"] == visitor_id:
            visitor["status"] = "checked_out"
            visitor["check_out_time"] = datetime.now(timezone.utc).isoformat()
            return {"message": "Visitor checked out successfully"}
    
    raise HTTPException(status_code=404, detail="Visitor not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
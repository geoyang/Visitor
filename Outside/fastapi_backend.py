from fastapi import FastAPI, HTTPException, Depends, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import uvicorn
from enum import Enum

app = FastAPI(title="Visitor Management API", version="1.0.0")

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
DATABASE_NAME = "visitor_management"

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DATABASE_NAME]

# Collections
visitors_collection = db.visitors
forms_collection = db.forms
workflows_collection = db.workflows
companies_collection = db.companies
locations_collection = db.locations
devices_collection = db.devices

# Security
security = HTTPBearer(auto_error=False)

class VisitorStatus(str, Enum):
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    EXPIRED = "expired"

class FormFieldType(str, Enum):
    TEXT = "text"
    EMAIL = "email"
    PHONE = "phone"
    SELECT = "select"
    TEXTAREA = "textarea"
    DATE = "date"
    CHECKBOX = "checkbox"

# Pydantic models
class FormField(BaseModel):
    name: str
    type: FormFieldType
    label: str
    required: bool = False
    options: Optional[List[str]] = None
    validation: Optional[Dict[str, Any]] = None

class CustomForm(BaseModel):
    name: str
    description: Optional[str] = None
    fields: List[FormField]
    is_active: bool = True
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomFormResponse(CustomForm):
    id: str

class WorkflowAction(BaseModel):
    type: str  # email, sms, webhook, notification
    trigger: str  # on_checkin, on_checkout, scheduled
    config: Dict[str, Any]

class Workflow(BaseModel):
    name: str
    form_id: Optional[str] = None
    actions: List[WorkflowAction]
    is_active: bool = True
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

class WorkflowResponse(Workflow):
    id: str

class VisitorData(BaseModel):
    form_id: str
    data: Dict[str, Any]
    check_in_time: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    check_out_time: Optional[datetime] = None
    status: VisitorStatus = VisitorStatus.CHECKED_IN
    host_notified: bool = False
    notes: Optional[str] = None

class VisitorResponse(BaseModel):
    id: str
    form_id: str
    data: Dict[str, Any]
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    status: VisitorStatus
    host_notified: bool
    notes: Optional[str] = None

class VisitorUpdate(BaseModel):
    data: Optional[Dict[str, Any]] = None
    status: Optional[VisitorStatus] = None
    check_out_time: Optional[datetime] = None
    notes: Optional[str] = None

# Helper functions
def visitor_helper(visitor) -> dict:
    return {
        "id": str(visitor["_id"]),
        "form_id": visitor["form_id"],
        "data": visitor["data"],
        "check_in_time": visitor["check_in_time"],
        "check_out_time": visitor.get("check_out_time"),
        "status": visitor["status"],
        "host_notified": visitor.get("host_notified", False),
        "notes": visitor.get("notes"),
        # Extract common fields for easy access
        "full_name": visitor["data"].get("full_name"),
        "company": visitor["data"].get("company"),
        "email": visitor["data"].get("email"),
        "phone": visitor["data"].get("phone"),
        "host_name": visitor["data"].get("host_name"),
        "visit_purpose": visitor["data"].get("visit_purpose"),
    }

def form_helper(form) -> dict:
    return {
        "id": str(form["_id"]),
        "name": form["name"],
        "description": form.get("description"),
        "fields": form["fields"],
        "is_active": form["is_active"],
        "created_at": form["created_at"],
        "updated_at": form["updated_at"],
    }

def workflow_helper(workflow) -> dict:
    return {
        "id": str(workflow["_id"]),
        "name": workflow["name"],
        "form_id": workflow.get("form_id"),
        "actions": workflow["actions"],
        "is_active": workflow["is_active"],
        "created_at": workflow["created_at"],
    }

# API Routes

@app.get("/")
async def root():
    return {"message": "Visitor Management API", "version": "1.0.0"}

# Health check
@app.get("/health")
async def health_check():
    try:
        # Test database connection
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

# Visitor endpoints
@app.post("/visitors", response_model=VisitorResponse)
async def create_visitor(visitor: VisitorData):
    """Create a new visitor entry"""
    try:
        # Validate form exists
        if visitor.form_id != "default":
            form = await forms_collection.find_one({"_id": ObjectId(visitor.form_id)})
            if not form:
                raise HTTPException(status_code=404, detail="Form not found")
        
        visitor_dict = visitor.dict()
        result = await visitors_collection.insert_one(visitor_dict)
        
        # Get the created visitor
        new_visitor = await visitors_collection.find_one({"_id": result.inserted_id})
        
        # Trigger workflows
        await trigger_workflows(visitor.form_id, "on_checkin", new_visitor)
        
        return visitor_helper(new_visitor)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/visitors", response_model=List[VisitorResponse])
async def get_visitors(
    status: Optional[VisitorStatus] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all visitors with optional filtering"""
    query = {}
    if status:
        query["status"] = status
    
    visitors = await visitors_collection.find(query).skip(skip).limit(limit).to_list(length=limit)
    return [visitor_helper(visitor) for visitor in visitors]

@app.get("/visitors/active", response_model=List[VisitorResponse])
async def get_active_visitors():
    """Get all currently checked-in visitors"""
    visitors = await visitors_collection.find({"status": VisitorStatus.CHECKED_IN}).to_list(length=None)
    return [visitor_helper(visitor) for visitor in visitors]

@app.get("/visitors/{visitor_id}", response_model=VisitorResponse)
async def get_visitor(visitor_id: str):
    """Get a specific visitor by ID"""
    try:
        visitor = await visitors_collection.find_one({"_id": ObjectId(visitor_id)})
        if not visitor:
            raise HTTPException(status_code=404, detail="Visitor not found")
        return visitor_helper(visitor)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/visitors/{visitor_id}", response_model=VisitorResponse)
async def update_visitor(visitor_id: str, update_data: VisitorUpdate):
    """Update visitor information"""
    try:
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updated_at"] = datetime.now(timezone.utc)
        
        result = await visitors_collection.update_one(
            {"_id": ObjectId(visitor_id)},
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Visitor not found")
        
        updated_visitor = await visitors_collection.find_one({"_id": ObjectId(visitor_id)})
        return visitor_helper(updated_visitor)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/visitors/{visitor_id}/checkout")
async def checkout_visitor(visitor_id: str):
    """Check out a visitor"""
    try:
        update_data = {
            "status": VisitorStatus.CHECKED_OUT,
            "check_out_time": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        result = await visitors_collection.update_one(
            {"_id": ObjectId(visitor_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Visitor not found")
        
        # Get updated visitor for workflow triggers
        updated_visitor = await visitors_collection.find_one({"_id": ObjectId(visitor_id)})
        
        # Trigger workflows
        await trigger_workflows(updated_visitor["form_id"], "on_checkout", updated_visitor)
        
        return {"message": "Visitor checked out successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Form endpoints
@app.post("/forms", response_model=CustomFormResponse)
async def create_form(form: CustomForm):
    """Create a new custom form"""
    try:
        form_dict = form.dict()
        result = await forms_collection.insert_one(form_dict)
        
        new_form = await forms_collection.find_one({"_id": result.inserted_id})
        return form_helper(new_form)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/forms", response_model=List[CustomFormResponse])
async def get_forms():
    """Get all forms"""
    forms = await forms_collection.find({"is_active": True}).to_list(length=None)
    return [form_helper(form) for form in forms]

@app.get("/forms/{form_id}", response_model=CustomFormResponse)
async def get_form(form_id: str):
    """Get a specific form by ID"""
    try:
        form = await forms_collection.find_one({"_id": ObjectId(form_id)})
        if not form:
            raise HTTPException(status_code=404, detail="Form not found")
        return form_helper(form)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/forms/{form_id}", response_model=CustomFormResponse)
async def update_form(form_id: str, form_update: CustomForm):
    """Update a form"""
    try:
        update_dict = form_update.dict()
        update_dict["updated_at"] = datetime.now(timezone.utc)
        
        result = await forms_collection.update_one(
            {"_id": ObjectId(form_id)},
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Form not found")
        
        updated_form = await forms_collection.find_one({"_id": ObjectId(form_id)})
        return form_helper(updated_form)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/forms/{form_id}")
async def delete_form(form_id: str):
    """Soft delete a form"""
    try:
        result = await forms_collection.update_one(
            {"_id": ObjectId(form_id)},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Form not found")
        
        return {"message": "Form deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Multitenant Endpoints (for compatibility with new frontend)

@app.get("/analytics/company")
async def get_company_analytics(x_company_slug: Optional[str] = Header(None)):
    """Get company analytics - using mock data for compatibility"""
    # For backward compatibility, return mock data
    total_visitors = await visitors_collection.count_documents({})
    active_visitors = await visitors_collection.count_documents({"status": VisitorStatus.CHECKED_IN})
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_visitors = await visitors_collection.count_documents({
        "check_in_time": {"$gte": today_start}
    })
    
    return {
        "company_id": "default_company",
        "total_visitors": total_visitors,
        "active_visitors": active_visitors,
        "today_visitors": today_visitors,
        "total_locations": 1,
        "total_devices": 1,
        "online_devices": 1,
    }

@app.get("/locations")
async def get_locations(x_company_slug: Optional[str] = Header(None)):
    """Get locations - return mock data for compatibility"""
    return [{
        "id": "default_location",
        "company_id": "default_company",
        "name": "Main Office",
        "address": "123 Business Ave, Corporate City, CC 12345",
        "status": "active",
        "devices_count": 1,
        "active_visitors_count": await visitors_collection.count_documents({"status": VisitorStatus.CHECKED_IN}),
        "company_name": "Default Company"
    }]

@app.get("/devices")
async def get_devices(
    x_company_slug: Optional[str] = Header(None),
    location_id: Optional[str] = None
):
    """Get devices - return mock data for compatibility"""
    return [{
        "id": "default_device",
        "company_id": "default_company", 
        "location_id": "default_location",
        "name": "Main Tablet",
        "device_type": "tablet",
        "device_id": "TABLET-001",
        "status": "active",
        "is_online": True,
        "company_name": "Default Company",
        "location_name": "Main Office"
    }]

@app.post("/devices")
async def create_device(
    device_data: Dict[str, Any],
    x_company_slug: Optional[str] = Header(None)
):
    """Create device - return mock data for compatibility"""
    return {
        "id": "new_device",
        "company_id": "default_company",
        "location_id": device_data.get("location_id", "default_location"),
        "name": device_data.get("name", "New Device"),
        "device_type": "tablet",
        "device_id": device_data.get("device_id", "NEW-DEVICE"),
        "status": "active",
        "is_online": True,
        "company_name": "Default Company",
        "location_name": "Main Office"
    }

@app.post("/devices/{device_id}/heartbeat")
async def device_heartbeat(
    device_id: str,
    heartbeat_data: Dict[str, Any],
    x_company_slug: Optional[str] = Header(None)
):
    """Device heartbeat - return success for compatibility"""
    return {"message": "Heartbeat recorded successfully"}

# Workflow endpoints
@app.post("/workflows", response_model=WorkflowResponse)
async def create_workflow(workflow: Workflow):
    """Create a new workflow"""
    try:
        workflow_dict = workflow.dict()
        result = await workflows_collection.insert_one(workflow_dict)
        
        new_workflow = await workflows_collection.find_one({"_id": result.inserted_id})
        return workflow_helper(new_workflow)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/workflows", response_model=List[WorkflowResponse])
async def get_workflows():
    """Get all workflows"""
    workflows = await workflows_collection.find({"is_active": True}).to_list(length=None)
    return [workflow_helper(workflow) for workflow in workflows]

@app.get("/workflows/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: str):
    """Get a specific workflow by ID"""
    try:
        workflow = await workflows_collection.find_one({"_id": ObjectId(workflow_id)})
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        return workflow_helper(workflow)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Analytics endpoints
@app.get("/analytics/summary")
async def get_analytics_summary():
    """Get visitor analytics summary"""
    try:
        total_visitors = await visitors_collection.count_documents({})
        active_visitors = await visitors_collection.count_documents({"status": VisitorStatus.CHECKED_IN})
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_visitors = await visitors_collection.count_documents({
            "check_in_time": {"$gte": today_start}
        })
        
        return {
            "total_visitors": total_visitors,
            "active_visitors": active_visitors,
            "today_visitors": today_visitors,
            "timestamp": datetime.now(timezone.utc)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Workflow trigger function
async def trigger_workflows(form_id: str, trigger_type: str, visitor_data: dict):
    """Trigger workflows based on events"""
    try:
        # Find workflows for this form and trigger type
        query = {
            "is_active": True,
            "$or": [
                {"form_id": form_id},
                {"form_id": None}  # Global workflows
            ]
        }
        
        workflows = await workflows_collection.find(query).to_list(length=None)
        
        for workflow in workflows:
            for action in workflow["actions"]:
                if action["trigger"] == trigger_type:
                    await execute_workflow_action(action, visitor_data)
                    
    except Exception as e:
        print(f"Error triggering workflows: {e}")

async def execute_workflow_action(action: dict, visitor_data: dict):
    """Execute a specific workflow action"""
    try:
        action_type = action["type"]
        config = action["config"]
        
        if action_type == "email":
            await send_email_notification(config, visitor_data)
        elif action_type == "sms":
            await send_sms_notification(config, visitor_data)
        elif action_type == "webhook":
            await send_webhook(config, visitor_data)
        elif action_type == "notification":
            await send_push_notification(config, visitor_data)
            
    except Exception as e:
        print(f"Error executing workflow action: {e}")

async def send_email_notification(config: dict, visitor_data: dict):
    """Send email notification (placeholder implementation)"""
    # This would integrate with your email service (SendGrid, AWS SES, etc.)
    print(f"Email notification: {config['template']} to {config['recipient']}")
    pass

async def send_sms_notification(config: dict, visitor_data: dict):
    """Send SMS notification (placeholder implementation)"""
    # This would integrate with SMS service (Twilio, AWS SNS, etc.)
    print(f"SMS notification: {config['message']} to {config['phone']}")
    pass

async def send_webhook(config: dict, visitor_data: dict):
    """Send webhook (placeholder implementation)"""
    # This would make HTTP request to configured webhook URL
    print(f"Webhook: {config['url']} with data: {visitor_data}")
    pass

async def send_push_notification(config: dict, visitor_data: dict):
    """Send push notification (placeholder implementation)"""
    # This would integrate with push notification service
    print(f"Push notification: {config['title']} - {config['body']}")
    pass

# Database initialization
@app.on_event("startup")
async def startup_event():
    """Initialize database and create default forms"""
    try:
        # Create indexes for better performance
        await visitors_collection.create_index("status")
        await visitors_collection.create_index("check_in_time")
        await visitors_collection.create_index("form_id")
        await forms_collection.create_index("is_active")
        await workflows_collection.create_index("is_active")
        
        # Create default form if it doesn't exist
        default_form_exists = await forms_collection.find_one({"name": "Default Visitor Form"})
        if not default_form_exists:
            default_form = {
                "name": "Default Visitor Form",
                "description": "Standard visitor check-in form",
                "fields": [
                    {"name": "full_name", "type": "text", "label": "Full Name", "required": True},
                    {"name": "company", "type": "text", "label": "Company", "required": False},
                    {"name": "email", "type": "email", "label": "Email", "required": True},
                    {"name": "phone", "type": "phone", "label": "Phone", "required": False},
                    {
                        "name": "visit_purpose",
                        "type": "select",
                        "label": "Purpose of Visit",
                        "required": True,
                        "options": ["Meeting", "Interview", "Delivery", "Maintenance", "Other"]
                    },
                    {"name": "host_name", "type": "text", "label": "Host Name", "required": True},
                    {"name": "notes", "type": "textarea", "label": "Additional Notes", "required": False}
                ],
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            await forms_collection.insert_one(default_form)
            print("Default form created successfully")
            
    except Exception as e:
        print(f"Error during startup: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
            
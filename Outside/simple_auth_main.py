#!/usr/bin/env python3
"""
Simple authentication-enabled visitor management API
Uses only basic Python libraries to avoid compatibility issues
"""
import asyncio
import json
import hashlib
import time
import base64
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
import uvicorn
from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os

app = FastAPI(title="Visitor Management API with Authentication", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = "visitor_management"

client = AsyncIOMotorClient(MONGODB_URL)
db = client[DATABASE_NAME]
companies_collection = db.companies

# Security
security = HTTPBearer(auto_error=False)
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")

# Simple password hashing using SHA-256
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

def create_access_token(company_id: str) -> str:
    """Create a simple access token"""
    expire_time = time.time() + 1800  # 30 minutes
    token_data = {
        "company_id": company_id,
        "exp": expire_time,
        "signature": hashlib.sha256(f"{company_id}{expire_time}{SECRET_KEY}".encode()).hexdigest()
    }
    token_json = json.dumps(token_data)
    return base64.b64encode(token_json.encode()).decode()

def verify_token(token: str) -> Optional[str]:
    """Verify token and return company_id if valid"""
    try:
        token_json = base64.b64decode(token.encode()).decode()
        payload = json.loads(token_json)
        
        company_id = payload.get("company_id")
        exp = payload.get("exp", 0)
        signature = payload.get("signature", "")
        
        if not company_id or time.time() > exp:
            return None
            
        expected_signature = hashlib.sha256(f"{company_id}{exp}{SECRET_KEY}".encode()).hexdigest()
        if signature != expected_signature:
            return None
            
        return company_id
    except:
        return None

async def get_current_company(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated company"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    company_id = verify_token(credentials.credentials)
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    company = await companies_collection.find_one({"_id": ObjectId(company_id)})
    if not company:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Company not found",
        )
    
    return company

# Pydantic models
class CompanyRegistration(BaseModel):
    name: str
    account_email: str
    password: str
    domain: Optional[str] = None

class CompanyLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# API Routes
@app.get("/")
async def root():
    return {"message": "Visitor Management API with Authentication", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    try:
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

@app.post("/auth/register", response_model=Token)
async def register_company(registration: CompanyRegistration):
    """Register a new company account"""
    try:
        # Check if email already exists
        existing_company = await companies_collection.find_one({"account_email": registration.account_email})
        if existing_company:
            raise HTTPException(status_code=400, detail="Company with this email already exists")
        
        # Hash password
        hashed_password = hash_password(registration.password)
        
        # Create company document
        company_dict = {
            "name": registration.name,
            "domain": registration.domain,
            "status": "active",
            "subscription_plan": "basic",
            "max_locations": 5,
            "max_devices_per_location": 10,
            "settings": {},
            "account_email": registration.account_email,
            "password_hash": hashed_password,
            "email_verified": False,
            "registration_date": datetime.now(timezone.utc),
            "last_login": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Insert company
        result = await companies_collection.insert_one(company_dict)
        company_id = str(result.inserted_id)
        
        # Create access token
        access_token = create_access_token(company_id)
        
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/login", response_model=Token)
async def login_company(login: CompanyLogin):
    """Authenticate a company account"""
    try:
        # Find company by email
        company = await companies_collection.find_one({"account_email": login.email})
        if not company:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Verify password
        if not verify_password(login.password, company["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Update last login
        await companies_collection.update_one(
            {"_id": company["_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )
        
        # Create access token
        access_token = create_access_token(str(company["_id"]))
        
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/auth/me")
async def get_current_company_info(current_company: dict = Depends(get_current_company)):
    """Get current authenticated company information"""
    return {
        "id": str(current_company["_id"]),
        "name": current_company["name"],
        "account_email": current_company["account_email"],
        "domain": current_company.get("domain"),
        "status": current_company["status"],
        "subscription_plan": current_company.get("subscription_plan"),
        "email_verified": current_company.get("email_verified", False),
        "registration_date": current_company.get("registration_date"),
        "last_login": current_company.get("last_login")
    }

@app.get("/companies")
async def get_companies(current_company: dict = Depends(get_current_company)):
    """Get companies (for authenticated users)"""
    try:
        # For now, just return the current company
        # In a multi-tenant system, you might return companies the user has access to
        return [{
            "id": str(current_company["_id"]),
            "name": current_company["name"],
            "domain": current_company.get("domain"),
            "status": current_company["status"],
            "subscription_plan": current_company.get("subscription_plan", "basic"),
            "max_locations": current_company.get("max_locations", 5),
            "max_devices_per_location": current_company.get("max_devices_per_location", 10),
            "locations_count": 0,  # TODO: Calculate from database
            "devices_count": 0,    # TODO: Calculate from database
            "active_visitors_count": 0,  # TODO: Calculate from database
            "account_email": current_company.get("account_email"),
            "email_verified": current_company.get("email_verified", False),
            "registration_date": current_company.get("registration_date"),
            "last_login": current_company.get("last_login"),
            "created_at": current_company.get("created_at"),
            "updated_at": current_company.get("updated_at")
        }]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/analytics/summary")
async def get_analytics_summary(current_company: dict = Depends(get_current_company)):
    """Get analytics summary for authenticated company"""
    return {
        "total_visitors": 0,    # TODO: Calculate from database
        "active_visitors": 0,   # TODO: Calculate from database
        "today_visitors": 0,    # TODO: Calculate from database
        "timestamp": datetime.now(timezone.utc)
    }

@app.get("/analytics/company")
async def get_company_analytics(current_company: dict = Depends(get_current_company)):
    """Get company analytics for authenticated company"""
    return {
        "company_id": str(current_company["_id"]),
        "total_visitors": 0,    # TODO: Calculate from database
        "active_visitors": 0,   # TODO: Calculate from database
        "today_visitors": 0,    # TODO: Calculate from database
        "total_locations": 0,   # TODO: Calculate from database
        "total_devices": 0,     # TODO: Calculate from database
        "online_devices": 0,    # TODO: Calculate from database
    }

if __name__ == "__main__":
    uvicorn.run(
        "simple_auth_main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
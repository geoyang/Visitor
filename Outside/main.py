from fastapi import FastAPI, HTTPException, Depends, status, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import uvicorn
from enum import Enum
import hashlib
import secrets
import time
import stripe
import logging
import traceback
import random
import string
import json 

app = FastAPI(
    title="Visitor Management API", 
    version="1.0.0"
)

# Increase request body size limit to 50MB for image uploads
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from starlette.responses import Response as StarletteResponse

class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_size: int = 50 * 1024 * 1024):  # 50MB default
        super().__init__(app)
        self.max_size = max_size

    async def dispatch(self, request: StarletteRequest, call_next):
        # Check content length
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_size:
            return StarletteResponse(
                content="Request entity too large", 
                status_code=413,
                headers={"content-type": "text/plain"}
            )
        
        response = await call_next(request)
        return response

# Add the middleware to increase request size limit
app.add_middleware(RequestSizeLimitMiddleware, max_size=50 * 1024 * 1024)  # 50MB

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Global exception handler for 500 errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception occurred: {str(exc)}")
    logger.error(f"Request URL: {request.url}")
    logger.error(f"Request method: {request.method}")
    logger.error(f"Exception traceback: {traceback.format_exc()}")
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error_code": "INTERNAL_SERVER_ERROR",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

# Custom exception for token expiration
class TokenExpiredException(Exception):
    def __init__(self, message: str = "Token has expired"):
        self.message = message
        super().__init__(self.message)

# Exception handler for token expiration
@app.exception_handler(TokenExpiredException)
async def token_expired_exception_handler(request: Request, exc: TokenExpiredException):
    return JSONResponse(
        status_code=401,
        content={
            "detail": "Token has expired. Please log in again.",
            "error_code": "TOKEN_EXPIRED",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    )

# Custom exception handler for authentication errors
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 401:
        return JSONResponse(
            status_code=401,
            content={
                "detail": exc.detail,
                "error_code": "AUTHENTICATION_FAILED",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    # For non-auth errors, use default handler
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

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
form_submissions_collection = db.form_submissions
workflows_collection = db.workflows
companies_collection = db.companies
themes_collection = db.themes
theme_activations_collection = db.theme_activations
locations_collection = db.locations
devices_collection = db.devices
users_collection = db.users
subscriptions_collection = db.subscriptions

# Security
security = HTTPBearer(auto_error=False)

# Authentication configuration (simplified)
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", 30))

# Stripe configuration
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_...")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "pk_test_...")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_...")

class VisitorStatus(str, Enum):
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    EXPIRED = "expired"

class CompanyStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class LocationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"

class DeviceStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"

class FormFieldType(str, Enum):
    TEXT = "text"
    EMAIL = "email"
    PHONE = "phone"
    SELECT = "select"
    TEXTAREA = "textarea"
    DATE = "date"
    CHECKBOX = "checkbox"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    UNPAID = "unpaid"
    TRIALING = "trialing"
    INCOMPLETE = "incomplete"

class SubscriptionPlan(str, Enum):
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

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
    location_id: str
    data: Dict[str, Any]
    check_in_time: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    check_out_time: Optional[datetime] = None
    status: VisitorStatus = VisitorStatus.CHECKED_IN
    host_notified: bool = False
    notes: Optional[str] = None

class VisitorResponse(BaseModel):
    id: str
    form_id: str
    location_id: Optional[str] = None
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

# Multitenant models
class Company(BaseModel):
    name: str
    domain: Optional[str] = None
    status: CompanyStatus = CompanyStatus.ACTIVE
    settings: Optional[Dict[str, Any]] = None
    # Stripe fields
    stripe_customer_id: Optional[str] = None
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

class User(BaseModel):
    email: str
    password_hash: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_id: str
    role: str = "company_admin"  # "super_admin", "company_admin", "manager", "employee", "viewer"
    status: str = "active"  # "active", "inactive", "suspended"
    email_verified: bool = False
    permissions: Optional[List[str]] = Field(default_factory=list)
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

class Location(BaseModel):
    company_id: str
    name: str
    address: str
    status: LocationStatus = LocationStatus.ACTIVE
    subscription_id: Optional[str] = None  # Links to subscription
    subscription_status: Optional[str] = None  # Subscription status
    subscription_plan: Optional[str] = None  # Subscription plan
    settings: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

class Subscription(BaseModel):
    company_id: str
    location_id: Optional[str] = None  # Made optional - can be assigned later
    plan: SubscriptionPlan
    status: SubscriptionStatus = SubscriptionStatus.TRIALING
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    stripe_price_id: str
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    canceled_at: Optional[datetime] = None
    monthly_price: float  # Price in dollars
    currency: str = "usd"
    metadata: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

class Device(BaseModel):
    company_id: str
    location_id: str
    name: str
    device_type: str = "tablet"
    device_id: str
    status: DeviceStatus = DeviceStatus.ACTIVE
    is_online: bool = False
    last_heartbeat: Optional[datetime] = None
    settings: Optional[Dict[str, Any]] = None
    assigned_forms: Optional[List[str]] = None
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

# Request/Response models
class CompanyCreate(BaseModel):
    name: str
    domain: Optional[str] = None
    status: Optional[str] = "active"
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class LocationCreate(BaseModel):
    name: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = "UTC"
    status: Optional[str] = "active"
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)
    working_hours: Optional[Dict[str, Any]] = Field(default_factory=dict)
    contact_info: Optional[Dict[str, Any]] = Field(default_factory=dict)

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = None
    status: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    working_hours: Optional[Dict[str, Any]] = None
    contact_info: Optional[Dict[str, Any]] = None

class DeviceCreate(BaseModel): 
    name: str
    device_type: Optional[str] = "tablet"
    device_id: str
    status: Optional[str] = "active"
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type: Optional[str] = None
    device_id: Optional[str] = None
    status: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    company_id: str
    role: str = "employee"  # admin, manager, employee, viewer
    status: str = "active"  # active, inactive, suspended
    permissions: List[str] = Field(default_factory=list)

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    company_id: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    permissions: Optional[List[str]] = None

# Authentication models
class UserRegistration(BaseModel):
    # Company information
    company_name: str
    company_domain: Optional[str] = None
    # User information
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str = "company_admin"

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
    company_id: Optional[str] = None

# Legacy models for backward compatibility
class CompanyRegistration(BaseModel):
    name: str
    account_email: str
    password: str
    domain: Optional[str] = None
    subscription_plan: Optional[str] = "basic"
    max_locations: Optional[int] = 5
    max_devices_per_location: Optional[int] = 10

class CompanyLogin(BaseModel):
    email: str
    password: str

# Subscription request/response models
class SubscriptionCreate(BaseModel):
    location_id: Optional[str] = None  # Made optional - can be assigned later
    plan: SubscriptionPlan
    price_id: str  # Stripe price ID
    payment_method_id: Optional[str] = None

class SubscriptionUpdate(BaseModel):
    plan: Optional[SubscriptionPlan] = None
    cancel_at_period_end: Optional[bool] = None

class CreatePaymentIntentRequest(BaseModel):
    subscription_id: str
    payment_method_id: str

class StripeWebhookEvent(BaseModel):
    type: str
    data: Dict[str, Any]

# Theme models
class ThemeColors(BaseModel):
    primary: str
    secondary: str
    background: str
    surface: str
    text: str
    textSecondary: str
    error: str
    warning: str
    success: str
    info: str
    border: str
    headerBackground: str
    headerText: str
    buttonBackground: str
    buttonText: str
    linkColor: str

class ThemeFontSizes(BaseModel):
    xs: int = 10
    sm: int = 12
    md: int = 14
    lg: int = 16
    xl: int = 20
    xxl: int = 24

class ThemeFontWeights(BaseModel):
    light: str = "300"
    regular: str = "400"
    medium: str = "500"
    semibold: str = "600"
    bold: str = "700"

class ThemeFonts(BaseModel):
    primary: str = "System"
    heading: str = "System"
    body: str = "System"
    button: str = "System"
    sizes: ThemeFontSizes = Field(default_factory=ThemeFontSizes)
    weights: ThemeFontWeights = Field(default_factory=ThemeFontWeights)

class ThemeImages(BaseModel):
    logo: str = ""
    background: str = ""
    welcomeImage: str = ""

class ThemeSpacing(BaseModel):
    xs: int = 4
    sm: int = 8
    md: int = 16
    lg: int = 24
    xl: int = 32
    xxl: int = 48

class ThemeBorderRadius(BaseModel):
    none: int = 0
    sm: int = 4
    md: int = 8
    lg: int = 12
    xl: int = 16
    full: int = 9999

class ThemeShadows(BaseModel):
    none: str = "none"
    sm: str = "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
    md: str = "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
    lg: str = "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
    xl: str = "0 20px 25px -5px rgba(0, 0, 0, 0.1)"

class ThemeAnimationDuration(BaseModel):
    fast: int = 150
    normal: int = 300
    slow: int = 500

class ThemeAnimationEasing(BaseModel):
    linear: str = "linear"
    easeIn: str = "ease-in"
    easeOut: str = "ease-out"
    easeInOut: str = "ease-in-out"

class ThemeAnimations(BaseModel):
    duration: ThemeAnimationDuration = Field(default_factory=ThemeAnimationDuration)
    easing: ThemeAnimationEasing = Field(default_factory=ThemeAnimationEasing)

class ThemeFormConfig(BaseModel):
    defaultFormIds: List[str] = Field(default_factory=list)
    formOrder: List[str] = Field(default_factory=list)
    hiddenFormIds: List[str] = Field(default_factory=list)
    formStyles: Dict[str, Any] = Field(default_factory=dict)

class ThemeLayoutConfig(BaseModel):
    showLogo: bool = True
    logoPosition: str = "center"  # left, center, right
    showCompanyName: bool = True
    showWelcomeMessage: bool = True
    welcomeMessage: str = "Welcome!"
    showDateTime: bool = True
    showLocationInfo: bool = True

class ThemeCategory(str, Enum):
    DEFAULT = "default"
    SEASONAL = "seasonal"
    BRAND = "brand"
    EVENT = "event"
    CUSTOM = "custom"

class ThemeStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DRAFT = "draft"

class ThemeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: ThemeCategory = ThemeCategory.CUSTOM
    status: ThemeStatus = ThemeStatus.DRAFT
    colors: ThemeColors
    fonts: ThemeFonts = Field(default_factory=ThemeFonts)
    images: ThemeImages = Field(default_factory=ThemeImages)
    spacing: ThemeSpacing = Field(default_factory=ThemeSpacing)
    borderRadius: ThemeBorderRadius = Field(default_factory=ThemeBorderRadius)
    shadows: ThemeShadows = Field(default_factory=ThemeShadows)
    animations: ThemeAnimations = Field(default_factory=ThemeAnimations)
    formConfig: ThemeFormConfig = Field(default_factory=ThemeFormConfig)
    layoutConfig: ThemeLayoutConfig = Field(default_factory=ThemeLayoutConfig)
    companyId: str
    createdBy: Optional[str] = None

class ThemeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[ThemeCategory] = None
    status: Optional[ThemeStatus] = None
    colors: Optional[ThemeColors] = None
    fonts: Optional[ThemeFonts] = None
    images: Optional[ThemeImages] = None
    spacing: Optional[ThemeSpacing] = None
    borderRadius: Optional[ThemeBorderRadius] = None
    shadows: Optional[ThemeShadows] = None
    animations: Optional[ThemeAnimations] = None
    formConfig: Optional[ThemeFormConfig] = None
    layoutConfig: Optional[ThemeLayoutConfig] = None

class ThemeResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: ThemeCategory
    status: ThemeStatus
    colors: ThemeColors
    fonts: ThemeFonts
    images: ThemeImages
    spacing: ThemeSpacing
    borderRadius: ThemeBorderRadius
    shadows: ThemeShadows
    animations: ThemeAnimations
    formConfig: ThemeFormConfig
    layoutConfig: ThemeLayoutConfig
    companyId: str
    createdBy: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime
    version: int = 1

class ThemeActivation(BaseModel):
    companyId: str
    themeId: Optional[str] = None
    themeType: str = "custom"  # builtin, custom
    builtinThemeName: Optional[str] = None
    activatedBy: Optional[str] = None

class ThemeActivationResponse(BaseModel):
    id: str
    companyId: str
    themeId: Optional[str] = None
    themeType: str
    builtinThemeName: Optional[str] = None
    activatedBy: Optional[str] = None
    activatedAt: datetime

# Helper functions
def visitor_helper(visitor) -> dict:
    return {
        "id": str(visitor["_id"]),
        "form_id": visitor["form_id"],
        "location_id": visitor.get("location_id"),
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

def subscription_helper(subscription) -> dict:
    return {
        "id": str(subscription["_id"]),
        "company_id": subscription["company_id"],
        "location_id": subscription.get("location_id"),  # Made optional
        "plan": subscription["plan"],
        "status": subscription["status"],
        "stripe_subscription_id": subscription.get("stripe_subscription_id"),
        "stripe_customer_id": subscription.get("stripe_customer_id"),
        "stripe_price_id": subscription["stripe_price_id"],
        "current_period_start": subscription.get("current_period_start"),
        "current_period_end": subscription.get("current_period_end"),
        "trial_end": subscription.get("trial_end"),
        "cancel_at_period_end": subscription.get("cancel_at_period_end", False),
        "canceled_at": subscription.get("canceled_at"),
        "monthly_price": subscription["monthly_price"],
        "currency": subscription.get("currency", "usd"),
        "metadata": subscription.get("metadata", {}),
        "created_at": subscription.get("created_at"),
        "updated_at": subscription.get("updated_at")
    }

# Authentication helper functions (simplified)
def verify_password(plain_password, hashed_password):
    """Simple password verification using SHA-256"""
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

def generate_linking_code():
    """Generate a unique 5-character alphanumeric linking code"""
    characters = string.ascii_uppercase + string.digits
    # Exclude confusing characters: 0, O, I, 1
    characters = characters.replace('0', '').replace('O', '').replace('I', '').replace('1', '')
    return ''.join(random.choices(characters, k=5))

def generate_device_token():
    """Generate a permanent device token"""
    import secrets
    # Generate a secure random token
    return secrets.token_urlsafe(32)

async def get_unique_linking_code():
    """Generate a unique linking code that doesn't exist in the database"""
    while True:
        code = generate_linking_code()
        existing = await locations_collection.find_one({"linking_code": code})
        if not existing:
            return code

def get_password_hash(password):
    """Simple password hashing using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a simple access token"""
    expire_time = time.time() + (expires_delta.total_seconds() if expires_delta else 1800)  # 30 minutes default
    
    # Support both old and new token formats
    user_id = data.get("user_id")
    company_id = data.get("company_id")
    
    # For backward compatibility, also support "sub" field
    if not user_id and not company_id:
        company_id = data.get("sub")
    
    token_data = {
        "user_id": user_id,
        "company_id": company_id,
        "exp": expire_time,
        "signature": hashlib.sha256(f"{user_id or company_id}{expire_time}{SECRET_KEY}".encode()).hexdigest()
    }
    # Simple token: base64 encoded JSON
    import json
    import base64
    token_json = json.dumps(token_data)
    return base64.b64encode(token_json.encode()).decode()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    print(f"get_current_user called with credentials: {credentials is not None}")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        if credentials is None:
            print("No credentials provided")
            raise credentials_exception
        
        # Decode simple token
        import json
        import base64
        token = credentials.credentials
        print(f"Token: {token[:20]}..." if token else "No token")
        try:
            token_json = base64.b64decode(token.encode()).decode()
            payload = json.loads(token_json)
        except:
            raise credentials_exception
            
        # Verify token signature and expiry
        user_id = payload.get("user_id")
        company_id = payload.get("company_id")
        exp = payload.get("exp", 0)
        signature = payload.get("signature", "")
        
        # Support legacy tokens that only have company_id
        if not user_id and company_id:
            # Legacy token format - find user by company_id with company_admin role
            users = await users_collection.find({"company_id": company_id, "role": "company_admin"}).to_list(1)
            if users:
                user_id = str(users[0]["_id"])
        
        current_time = time.time()
        print(f"Token expiration check: current_time={current_time}, exp={exp}, valid={current_time <= exp}")
        
        if not user_id:
            print(f"No user_id found in token")
            raise credentials_exception
            
        if current_time > exp:
            print(f"Token expired. current_time={current_time}, exp={exp}")
            raise TokenExpiredException("Authentication token has expired")
            
        # Verify signature
        expected_signature = hashlib.sha256(f"{user_id or company_id}{exp}{SECRET_KEY}".encode()).hexdigest()
        if signature != expected_signature:
            raise credentials_exception
            
    except Exception as e:
        print(f"Token validation failed: {e}")
        raise credentials_exception
        
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if user is None:
        print(f"User not found with ID: {user_id}")
        raise credentials_exception
    
    print(f"User authenticated: {user.get('email')}, role: {user.get('role')}")
    return user

async def get_current_company(current_user: dict = Depends(get_current_user)):
    """Get current user's company - maintains backward compatibility"""
    print(f"Getting company for user: {current_user.get('email')}, role: {current_user.get('role')}")
    
    # Check if user is super admin
    if current_user.get("role") == "super_admin":
        print("User is super admin, returning virtual company")
        # For super admins, create a virtual company object
        # This allows super admins to create subscriptions without being tied to a specific company
        return {
            "_id": ObjectId("000000000000000000000000"),  # Virtual company ID
            "name": "Super Admin",
            "role": "super_admin",
            "current_user": current_user,
            "stripe_customer_id": None  # Super admins can create test subscriptions
        }
    
    company_id = current_user.get("company_id")
    print(f"User company_id: {company_id}")
    if not company_id:
        print("No company_id found for user")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not associated with a company"
        )
    
    company = await companies_collection.find_one({"_id": ObjectId(company_id)})
    if company is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Company not found"
        )
    
    # Add user information to company object for backward compatibility
    company["current_user"] = current_user
    company["role"] = current_user.get("role", "company_admin")
    return company

async def get_current_device(device_token: str = Header(None, alias="X-Device-Token")):
    """Get current authenticated device by device token"""
    if not device_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Device token required",
            headers={"X-Device-Token": "Required"},
        )
    
    # Find device by token
    device = await devices_collection.find_one({"device_token": device_token})
    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid device token",
        )
    
    # Update last seen
    await devices_collection.update_one(
        {"_id": device["_id"]},
        {"$set": {"last_seen": datetime.now(timezone.utc)}}
    )
    
    return device

async def validate_location_subscription_from_body(visitor: VisitorData, current_company: dict = Depends(get_current_company)):
    """Validate that a location has an active subscription for visitor creation"""
    location_id = visitor.location_id
    try:
        logger.info(f"Validating subscription for location {location_id}")
        logger.debug(f"Current company: {current_company.get('_id')}, role: {current_company.get('role')}")
        # Get the location to verify it belongs to the current company
        location = await locations_collection.find_one({"_id": ObjectId(location_id)})
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Verify location belongs to current company (skip for super admin)
        if current_company.get("role") != "super_admin" and str(location.get("company_id")) != str(current_company["_id"]):
            raise HTTPException(status_code=403, detail="Access denied to this location")
        
        # Get the location's subscription
        subscription = None
        if location.get("subscription_id"):
            subscription = await subscriptions_collection.find_one({
                "_id": ObjectId(location["subscription_id"]),
                "status": {"$in": ["active", "trialing", "past_due"]}
            })
        
        if not subscription:
            raise HTTPException(
                status_code=402, 
                detail="No active subscription found for this location. Please assign a subscription to continue."
            )
        
        # Check if subscription has expired (for subscriptions with trial_end)
        if subscription.get("trial_end") and subscription["status"] == "trialing":
            trial_end = subscription["trial_end"]
            # Ensure both datetimes are timezone-aware for comparison
            if trial_end.tzinfo is None:
                trial_end = trial_end.replace(tzinfo=timezone.utc)
            if trial_end < datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=402,
                    detail="Trial period has expired. Please add a payment method to continue."
                )
        
        return {"location": location, "subscription": subscription}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Subscription validation error: {str(e)}")
        logger.error(f"Exception traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Subscription validation error: {str(e)}")

async def validate_location_subscription(location_id: str, current_company: dict = Depends(get_current_company)):
    """Validate that a location has an active subscription before allowing operations"""
    try:
        logger.info(f"Validating subscription for location {location_id}")
        logger.debug(f"Current company: {current_company.get('_id')}, role: {current_company.get('role')}")
        # Get the location to verify it belongs to the current company
        location = await locations_collection.find_one({"_id": ObjectId(location_id)})
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Verify location belongs to current company (skip for super admin)
        if current_company.get("role") != "super_admin" and str(location.get("company_id")) != str(current_company["_id"]):
            raise HTTPException(status_code=403, detail="Access denied to this location")
        
        # Get the location's subscription
        subscription = None
        if location.get("subscription_id"):
            subscription = await subscriptions_collection.find_one({
                "_id": ObjectId(location["subscription_id"]),
                "status": {"$in": ["active", "trialing", "past_due"]}
            })
        
        if not subscription:
            raise HTTPException(
                status_code=402, 
                detail="No active subscription found for this location. Please assign a subscription to continue."
            )
        
        # Check if subscription has expired (for subscriptions with trial_end)
        if subscription.get("trial_end") and subscription["status"] == "trialing":
            trial_end = subscription["trial_end"]
            # Ensure both datetimes are timezone-aware for comparison
            if trial_end.tzinfo is None:
                trial_end = trial_end.replace(tzinfo=timezone.utc)
            if trial_end < datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=402,
                    detail="Trial period has expired. Please add a payment method to continue."
                )
        
        return {"location": location, "subscription": subscription}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Subscription validation error: {str(e)}")
        logger.error(f"Exception traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Subscription validation error: {str(e)}")

async def check_device_limits(location_id: str, current_company: dict = Depends(get_current_company)):
    """Check if the location has reached its device limit based on subscription plan"""
    try:
        logger.info(f"Checking device limits for location {location_id}")
        # Get the location first
        location = await locations_collection.find_one({"_id": ObjectId(location_id)})
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
            
        # Get location's subscription
        subscription = None
        if location.get("subscription_id"):
            subscription = await subscriptions_collection.find_one({
                "_id": ObjectId(location["subscription_id"]),
                "status": {"$in": ["active", "trialing", "past_due"]}
            })
        
        if not subscription:
            raise HTTPException(
                status_code=402,
                detail="No active subscription found for this location"
            )
        
        # Get subscription plan details
        plan_type = subscription.get("plan", "basic")
        
        # Get max devices from subscription metadata or use default limits
        max_devices = subscription.get("metadata", {}).get("max_devices")
        if not max_devices:
            # Define device limits per plan
            device_limits = {
                "basic": 5,
                "professional": 15,
                "enterprise": 999
            }
            max_devices = device_limits.get(plan_type, 5)  # Default to basic plan limit
        
        # Count current devices for this location
        current_device_count = await devices_collection.count_documents({
            "location_id": ObjectId(location_id),
            "status": {"$ne": "inactive"}  # Count only active devices
        })
        
        if current_device_count >= max_devices:
            raise HTTPException(
                status_code=403,
                detail=f"Device limit reached. Your {plan_type} plan allows {max_devices} devices per location. Please upgrade your plan or remove inactive devices."
            )
        
        return {
            "current_devices": current_device_count,
            "max_devices": max_devices,
            "plan_type": plan_type,
            "devices_remaining": max_devices - current_device_count if max_devices != float('inf') else "unlimited"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Device limit check error: {str(e)}")
        logger.error(f"Exception traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Device limit check error: {str(e)}")

# API Routes

@app.get("/")
async def root():
    return {"message": "Visitor Management API", "version": "1.0.0"}

# Authentication endpoints
@app.post("/auth/register", response_model=Token)
async def register_user(registration: UserRegistration):
    """Register a new user and company account"""
    try:
        # Check if email already exists
        existing_user = await users_collection.find_one({"email": registration.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Hash password
        hashed_password = get_password_hash(registration.password)
        
        # Create company document first
        company_dict = {
            "name": registration.company_name,
            "domain": registration.company_domain,
            "status": "active",
            "settings": {},
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Insert company
        company_result = await companies_collection.insert_one(company_dict)
        company_id = str(company_result.inserted_id)
        
        # Create user document
        user_dict = {
            "email": registration.email,
            "password_hash": hashed_password,
            "first_name": registration.first_name,
            "last_name": registration.last_name,
            "company_id": company_id,
            "role": registration.role,
            "status": "active",
            "email_verified": False,
            "permissions": [],
            "last_login": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Insert user
        user_result = await users_collection.insert_one(user_dict)
        user_id = str(user_result.inserted_id)
        
        # Create access token with both user and company ID
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"user_id": user_id, "company_id": company_id}, expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Legacy registration endpoint for backward compatibility
@app.post("/auth/register-company", response_model=Token)
async def register_company(registration: CompanyRegistration):
    """Legacy registration endpoint - register a new company account (backward compatibility)"""
    # Convert to new format and use the new registration
    user_registration = UserRegistration(
        company_name=registration.name,
        company_domain=registration.domain,
        email=registration.account_email,
        password=registration.password,
        role="company_admin"
    )
    return await register_user(user_registration)

@app.post("/auth/login", response_model=Token)
async def login_user(login: UserLogin):
    """Authenticate a user account"""
    try:
        logger.info(f"Login attempt for email: {login.email}")
        # Find user by email
        user = await users_collection.find_one({"email": login.email})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Check if user is active
        if user.get("status") != "active":
            raise HTTPException(status_code=401, detail="Account is inactive")
        
        # Verify password
        if not verify_password(login.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # Update last login
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc)}}
        )
        
        # Create access token with both user and company ID
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"user_id": str(user["_id"]), "company_id": user["company_id"]}, 
            expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Legacy login endpoint for backward compatibility
@app.post("/auth/login-company", response_model=Token)
async def login_company(login: CompanyLogin):
    """Legacy login endpoint - authenticate a company account (backward compatibility)"""
    # Convert to new format and use the new login
    user_login = UserLogin(email=login.email, password=login.password)
    return await login_user(user_login)

@app.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information"""
    # Get company information
    company = await companies_collection.find_one({"_id": ObjectId(current_user["company_id"])})
    
    return {
        "user": {
            "id": str(current_user["_id"]),
            "email": current_user["email"],
            "first_name": current_user.get("first_name"),
            "last_name": current_user.get("last_name"),
            "role": current_user["role"],
            "status": current_user["status"],
            "email_verified": current_user.get("email_verified", False),
            "permissions": current_user.get("permissions", []),
            "last_login": current_user.get("last_login"),
            "created_at": current_user.get("created_at")
        },
        "company": {
            "id": str(company["_id"]) if company else None,
            "name": company["name"] if company else None,
            "domain": company.get("domain") if company else None,
            "status": company["status"] if company else None,
            "created_at": company.get("created_at") if company else None
        }
    }

# Legacy endpoint for backward compatibility
@app.get("/auth/company")
async def get_current_company_info(current_company: dict = Depends(get_current_company)):
    """Legacy endpoint - Get current authenticated company information (backward compatibility)"""
    current_user = current_company.get("current_user", {})
    return {
        "id": str(current_company["_id"]),
        "name": current_company["name"],
        "account_email": current_user.get("email"),  # Get from user now
        "domain": current_company.get("domain"),
        "status": current_company["status"],
        "email_verified": current_user.get("email_verified", False),
        "role": current_user.get("role", "company_admin"),
        "registration_date": current_user.get("created_at"),
        "last_login": current_user.get("last_login")
    }

# Health check
@app.get("/health")
async def health_check():
    try:
        # Test database connection
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

# Debug endpoint to see raw visitor data
@app.post("/debug/visitors")
async def debug_visitor_data(request: Request):
    """Debug endpoint to see what data is being sent"""
    try:
        body = await request.json()
        logger.info(f"Raw visitor data received: {body}")
        return {"received": body, "status": "ok"}
    except Exception as e:
        logger.error(f"Error parsing visitor data: {e}")
        return {"error": str(e), "status": "error"}

# Debug endpoint to see raw login data
@app.post("/debug/login")
async def debug_login_data(request: Request):
    """Debug endpoint to see what login data is being sent"""
    try:
        body = await request.json()
        logger.info(f"Raw login data received: {body}")
        return {"received": body, "status": "ok"}
    except Exception as e:
        logger.error(f"Error parsing login data: {e}")
        return {"error": str(e), "status": "error"}

# Linking code endpoint
@app.get("/locations/by-code/{linking_code}")
async def get_location_by_code(linking_code: str):
    """Get location and company information by linking code"""
    try:
        # Find location by linking code
        location = await locations_collection.find_one({"linking_code": linking_code.upper()})
        if not location:
            raise HTTPException(status_code=404, detail="Invalid linking code")
        
        # Get company information
        company = await companies_collection.find_one({"_id": ObjectId(location["company_id"])})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Generate a permanent device token
        device_token = generate_device_token()
        device_id = f"DEVICE-{int(time.time())}"
        
        # Store the device token in a device record
        device_record = {
            "device_id": device_id,
            "device_token": device_token,
            "location_id": str(location["_id"]),
            "company_id": location["company_id"],
            "device_type": "mobile",
            "status": "active",
            "created_at": datetime.now(timezone.utc),
            "last_seen": datetime.now(timezone.utc)
        }
        
        # Insert device record
        await devices_collection.insert_one(device_record)
        
        return {
            "location_id": str(location["_id"]),
            "location_name": location["name"],
            "company_id": location["company_id"],
            "company_name": company["name"],
            "device_token": device_token,
            "device_id": device_id
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error looking up linking code {linking_code}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to lookup linking code")

# Visitor endpoints
@app.post("/visitors", response_model=VisitorResponse)
async def create_visitor(
    visitor: VisitorData,
    current_company: dict = Depends(get_current_company)
):
    """Create a new visitor entry"""
    try:
        logger.info(f"Creating visitor with data: {visitor.dict()}")
        
        # Validate location and subscription
        location_id = visitor.location_id
        location = await locations_collection.find_one({"_id": ObjectId(location_id)})
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Verify location belongs to current company (skip for super admin)
        if current_company.get("role") != "super_admin" and str(location.get("company_id")) != str(current_company["_id"]):
            raise HTTPException(status_code=403, detail="Access denied to this location")
        
        # Get the location's subscription
        subscription = None
        if location.get("subscription_id"):
            subscription = await subscriptions_collection.find_one({
                "_id": ObjectId(location["subscription_id"]),
                "status": {"$in": ["active", "trialing", "past_due"]}
            })
        
        if not subscription:
            raise HTTPException(
                status_code=402, 
                detail="No active subscription found for this location. Please assign a subscription to continue."
            )
        
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

@app.post("/device/visitors", response_model=VisitorResponse)
async def create_visitor_device(
    visitor: VisitorData,
    current_device: dict = Depends(get_current_device)
):
    """Create a new visitor entry using device authentication"""
    try:
        logger.info(f"Creating visitor with device authentication: {visitor.dict()}")
        
        # Validate that visitor location matches device location
        if visitor.location_id != current_device["location_id"]:
            raise HTTPException(status_code=403, detail="Device not authorized for this location")
        
        # Get location to verify it exists and get subscription
        location = await locations_collection.find_one({"_id": ObjectId(visitor.location_id)})
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Get the location's subscription
        subscription = None
        if location.get("subscription_id"):
            subscription = await subscriptions_collection.find_one({
                "_id": ObjectId(location["subscription_id"]),
                "status": {"$in": ["active", "trialing", "past_due"]}
            })
        
        if not subscription:
            raise HTTPException(
                status_code=402, 
                detail="No active subscription found for this location."
            )
        
        # Validate form exists
        if visitor.form_id != "default":
            form = await forms_collection.find_one({"_id": ObjectId(visitor.form_id)})
            if not form:
                raise HTTPException(status_code=404, detail="Form not found")
        
        visitor_dict = visitor.dict()
        logger.info(f"Creating visitor with data: {visitor_dict}")
        result = await visitors_collection.insert_one(visitor_dict)
        
        # Get the created visitor
        new_visitor = await visitors_collection.find_one({"_id": result.inserted_id})
        
        # Trigger workflows
        await trigger_workflows(visitor.form_id, "on_checkin", new_visitor)
        
        return visitor_helper(new_visitor)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating visitor with device auth: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/device/visitors", response_model=List[VisitorResponse])
async def get_visitors_device(
    status: Optional[VisitorStatus] = None,
    limit: int = 100,
    skip: int = 0,
    current_device: dict = Depends(get_current_device)
):
    """Get visitors for device's location using device authentication"""
    try:
        query = {"location_id": current_device["location_id"]}
        if status:
            query["status"] = status
        
        visitors = await visitors_collection.find(query).skip(skip).limit(limit).to_list(length=limit)
        return [visitor_helper(visitor) for visitor in visitors]
    except Exception as e:
        logger.error(f"Error getting visitors with device auth: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/device/visitors/{visitor_id}/checkout", response_model=VisitorResponse)
async def checkout_visitor_device(
    visitor_id: str,
    current_device: dict = Depends(get_current_device)
):
    """Check out a visitor using device authentication"""
    try:
        # Find the visitor
        visitor = await visitors_collection.find_one({"_id": ObjectId(visitor_id)})
        if not visitor:
            raise HTTPException(status_code=404, detail="Visitor not found")
        
        # Validate that visitor belongs to device's location
        if visitor.get("location_id") != current_device["location_id"]:
            raise HTTPException(status_code=403, detail="Device not authorized for this visitor")
        
        # Check if visitor is already checked out
        if visitor.get("check_out_time"):
            raise HTTPException(status_code=400, detail="Visitor is already checked out")
        
        # Update visitor with checkout time
        checkout_time = datetime.now(timezone.utc)
        result = await visitors_collection.update_one(
            {"_id": ObjectId(visitor_id)},
            {
                "$set": {
                    "check_out_time": checkout_time,
                    "status": "checked_out"
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to checkout visitor")
        
        # Get the updated visitor
        updated_visitor = await visitors_collection.find_one({"_id": ObjectId(visitor_id)})
        
        # Trigger workflows for checkout
        await trigger_workflows(visitor.get("form_id", "default"), "on_checkout", updated_visitor)
        
        return visitor_helper(updated_visitor)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking out visitor with device auth: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/visitors", response_model=List[VisitorResponse])
async def get_visitors(
    status: Optional[VisitorStatus] = None,
    limit: int = 100,
    skip: int = 0,
    current_company: dict = Depends(get_current_company)
):
    """Get visitors - super admin sees all, company admin sees only visitors from their company's locations"""
    current_role = current_company.get("role", "company_admin")
    
    query = {}
    if status:
        query["status"] = status
    
    # Add company filtering for non-super admin users
    if current_role != "super_admin":
        # Get all location IDs for the current company
        company_locations = await locations_collection.find(
            {"company_id": str(current_company["_id"])}, 
            {"_id": 1}
        ).to_list(length=None)
        location_ids = [str(loc["_id"]) for loc in company_locations]
        
        # Filter visitors by location_id
        if location_ids:
            query["location_id"] = {"$in": location_ids}
        else:
            # If company has no locations, return empty result
            return []
    
    visitors = await visitors_collection.find(query).skip(skip).limit(limit).to_list(length=limit)
    print(f"{visitors}")
    return [visitor_helper(visitor) for visitor in visitors]

@app.get("/visitors/active", response_model=List[VisitorResponse])
async def get_active_visitors(current_company: dict = Depends(get_current_company)):
    """Get currently checked-in visitors - super admin sees all, company admin sees only visitors from their company's locations"""
    current_role = current_company.get("role", "company_admin")
    
    query = {"status": VisitorStatus.CHECKED_IN}
    
    # Add company filtering for non-super admin users
    if current_role != "super_admin":
        # Get all location IDs for the current company
        company_locations = await locations_collection.find(
            {"company_id": str(current_company["_id"])}, 
            {"_id": 1}
        ).to_list(length=None)
        location_ids = [str(loc["_id"]) for loc in company_locations]
        
        # Filter visitors by location_id
        if location_ids:
            query["location_id"] = {"$in": location_ids}
        else:
            # If company has no locations, return empty result
            return []
    
    visitors = await visitors_collection.find(query).to_list(length=None)
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
async def checkout_visitor(
    visitor_id: str,
    current_company: dict = Depends(get_current_company)
):
    """Check out a visitor"""
    try:
        # First get the visitor to extract location_id
        visitor = await visitors_collection.find_one({"_id": ObjectId(visitor_id)})
        if not visitor:
            raise HTTPException(status_code=404, detail="Visitor not found")
        
        # Validate location subscription
        location_id = visitor.get("location_id")
        if not location_id:
            raise HTTPException(status_code=400, detail="Visitor has no associated location")
        
        # Get the location to verify it belongs to the current company
        location = await locations_collection.find_one({"_id": ObjectId(location_id)})
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Verify location belongs to current company
        if str(location.get("company_id")) != str(current_company["_id"]):
            raise HTTPException(status_code=403, detail="Access denied to this location")
        
        # Get the company's subscription
        subscription = await subscriptions_collection.find_one({
            "company_id": ObjectId(current_company["_id"]),
            "status": "active"
        })
        
        if not subscription:
            raise HTTPException(
                status_code=402, 
                detail="No active subscription found. Please subscribe to continue using this service."
            )
        
        # Check if subscription has expired
        if subscription.get("end_date") and subscription["end_date"] < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=402,
                detail="Subscription has expired. Please renew your subscription to continue."
            )
        
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
# Commented out - using the more comprehensive form endpoint below that handles device auth
# @app.post("/forms", response_model=CustomFormResponse)
# async def create_form(form: CustomForm):
#     """Create a new custom form"""
#     try:
#         form_dict = form.dict()
#         result = await forms_collection.insert_one(form_dict)
#         
#         new_form = await forms_collection.find_one({"_id": result.inserted_id})
#         return form_helper(new_form)
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=str(e))

# Commented out - using the more comprehensive form endpoint below that handles device auth
# @app.get("/forms", response_model=List[CustomFormResponse])
# async def get_forms():
#     """Get all forms"""
#     forms = await forms_collection.find({"is_active": True}).to_list(length=None)
#     return [form_helper(form) for form in forms]

# Commented out - using the more comprehensive form endpoint below that handles device auth
# @app.get("/forms/{form_id}", response_model=CustomFormResponse)
# async def get_form(form_id: str):
#     """Get a specific form by ID"""
#     try:
#         form = await forms_collection.find_one({"_id": ObjectId(form_id)})
#         if not form:
#             raise HTTPException(status_code=404, detail="Form not found")
#         return form_helper(form)
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=str(e))

# Commented out - using the more comprehensive form endpoint below that handles device auth
# @app.put("/forms/{form_id}", response_model=CustomFormResponse)
# async def update_form(form_id: str, form_update: CustomForm):
#     """Update a form"""
#     try:
#         update_dict = form_update.dict()
#         update_dict["updated_at"] = datetime.now(timezone.utc)
#         
#         result = await forms_collection.update_one(
#             {"_id": ObjectId(form_id)},
#             {"$set": update_dict}
#         )
#         
#         if result.matched_count == 0:
#             raise HTTPException(status_code=404, detail="Form not found")
#         
#         updated_form = await forms_collection.find_one({"_id": ObjectId(form_id)})
#         return form_helper(updated_form)
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=str(e))

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

# Multitenant endpoints
@app.get("/companies/validate/{company_id}")
async def validate_company(company_id: str):
    """Validate if a company exists and is active"""
    try:
        company = await companies_collection.find_one({"_id": ObjectId(company_id)})
        if company and company.get("status") == "active":
            return {
                "valid": True,
                "company": {
                    "id": str(company["_id"]),
                    "name": company["name"],
                    "status": company["status"]
                }
            }
        else:
            raise HTTPException(status_code=404, detail="Company not found or inactive")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/analytics/company")
async def get_company_analytics(current_company: dict = Depends(get_current_company)):
    """Get company analytics summary - super admin sees global data, company admin sees only their company's data"""
    try:
        current_role = current_company.get("role", "company_admin")
        
        # Build location filter based on role
        if current_role == "super_admin":
            # Super admin sees all data
            location_filter = {}
        else:
            # Company admin sees only their company's data
            location_filter = {"company_id": str(current_company["_id"])}
        
        # Get location IDs for the company(s)
        locations = await locations_collection.find(location_filter, {"_id": 1}).to_list(length=None)
        location_ids = [str(location["_id"]) for location in locations]
        
        # Build visitor query based on locations
        if current_role == "super_admin":
            visitor_filter = {}
        else:
            visitor_filter = {"location_id": {"$in": location_ids}}
        
        # Get analytics data
        total_visitors = await visitors_collection.count_documents(visitor_filter)
        active_visitors = await visitors_collection.count_documents({
            **visitor_filter,
            "status": VisitorStatus.CHECKED_IN
        })
        
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_visitors = await visitors_collection.count_documents({
            **visitor_filter,
            "check_in_time": {"$gte": today_start}
        })
        
        # Get device counts
        if current_role == "super_admin":
            device_filter = {}
        else:
            device_filter = {"location_id": {"$in": location_ids}}
        
        total_devices = await devices_collection.count_documents(device_filter)
        online_devices = await devices_collection.count_documents({
            **device_filter,
            "status": "online"
        })
        
        return {
            "company_id": str(current_company["_id"]) if current_role != "super_admin" else "all_companies",
            "total_visitors": total_visitors,
            "active_visitors": active_visitors,
            "today_visitors": today_visitors,
            "total_locations": len(location_ids) if current_role != "super_admin" else await locations_collection.count_documents({}),
            "total_devices": total_devices,
            "online_devices": online_devices,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/locations")
async def get_locations(current_company: dict = Depends(get_current_company)):
    """Get locations - super admin sees all, company admin sees only their company's locations"""
    try:
        current_role = current_company.get("role", "company_admin")
        
        # Build query based on role
        if current_role == "super_admin":
            # Super admin can see all locations
            query = {}
        else:
            # Company admin sees only their company's locations
            query = {"company_id": str(current_company["_id"])}
        
        locations = await locations_collection.find(query).to_list(length=None)
        
        result = []
        for location in locations:
            # Get company name
            company = await companies_collection.find_one({"_id": ObjectId(location["company_id"])})
            company_name = company["name"] if company else "Unknown Company"
            
            # Count devices for this location
            devices_count = await devices_collection.count_documents({"location_id": str(location["_id"])})
            
            # Count active visitors for this location (if visitor collection has location_id)
            active_visitors_count = await visitors_collection.count_documents({
                "location_id": str(location["_id"]),
                "status": "checked_in"
            }) if "location_id" in (await visitors_collection.find_one({}) or {}) else 0
            
            result.append({
                "id": str(location["_id"]),
                "company_id": location["company_id"],
                "name": location["name"],
                "address": location.get("address", ""),
                "status": location.get("status", "active"),
                "subscription_id": location.get("subscription_id"),
                "subscription_status": location.get("subscription_status"),
                "subscription_plan": location.get("subscription_plan"),
                "devices_count": devices_count,
                "active_visitors_count": active_visitors_count,
                "company_name": company_name,
                "linking_code": location.get("linking_code", "")
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/companies")
async def get_companies(current_company: dict = Depends(get_current_company)):
    """Get companies - super admin sees all, company admin sees only their own"""
    try:
        current_role = current_company.get("role", "company_admin")
        
        if current_role == "super_admin":
            # Super admin can see all companies
            companies = await companies_collection.find({}).to_list(length=None)
        else:
            # Company admin sees only their own company
            companies = [current_company]
        
        result = []
        for company in companies:
            # Count locations for this company
            locations_count = await locations_collection.count_documents({"company_id": str(company["_id"])})
            
            # Count devices for this company
            devices_count = await devices_collection.count_documents({"company_id": str(company["_id"])})
            
            # Count active visitors for this company
            active_visitors_count = await visitors_collection.count_documents({
                "company_id": str(company["_id"]),
                "status": "checked_in"
            }) if "company_id" in (await visitors_collection.find_one({}) or {}) else 0
            
            result.append({
                "id": str(company["_id"]),
                "name": company["name"],
                "domain": company.get("domain"),
                "status": company.get("status", "active"),
                "subscription_plan": company.get("subscription_plan", "basic"),
                "max_locations": company.get("max_locations", 5),
                "max_devices_per_location": company.get("max_devices_per_location", 10),
                "locations_count": locations_count,
                "devices_count": devices_count,
                "active_visitors_count": active_visitors_count,
                "account_email": company.get("account_email"),
                "email_verified": company.get("email_verified", False),
                "role": company.get("role", "company_admin"),
                "registration_date": company.get("registration_date"),
                "last_login": company.get("last_login"),
                "created_at": company.get("created_at"),
                "updated_at": company.get("updated_at")
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/companies")
async def create_company(company_data: dict):
    """Create a new company (legacy endpoint - use /auth/register for new accounts)"""
    try:
        print(f"Raw company_data received: {company_data}")
        print(f"Type: {type(company_data)}")
        
        # Validate required fields
        if "name" not in company_data or not company_data["name"]:
            raise HTTPException(status_code=400, detail="Field 'name' is required")
        
        # Create company document
        company_dict = {
            "name": company_data["name"],
            "domain": company_data.get("domain"),
            "status": company_data.get("status", "active"),
            "subscription_plan": company_data.get("subscription_plan", "basic"),
            "max_locations": company_data.get("max_locations", 5),
            "max_devices_per_location": company_data.get("max_devices_per_location", 10),
            "settings": company_data.get("settings", {}),
            "account_email": company_data.get("account_email"),
            "password_hash": get_password_hash(company_data["password"]) if company_data.get("password") else None,
            "email_verified": False,
            "registration_date": datetime.now(timezone.utc) if company_data.get("account_email") else None,
            "last_login": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Insert company
        result = await companies_collection.insert_one(company_dict)
        
        # Get created company
        new_company = await companies_collection.find_one({"_id": result.inserted_id})
        
        return {
            "id": str(new_company["_id"]),
            "name": new_company["name"],
            "domain": new_company.get("domain"),
            "status": new_company["status"],
            "subscription_plan": new_company.get("subscription_plan"),
            "max_locations": new_company.get("max_locations"),
            "max_devices_per_location": new_company.get("max_devices_per_location"),
            "locations_count": 0,
            "devices_count": 0,
            "active_visitors_count": 0,
            "created_at": new_company["created_at"],
            "updated_at": new_company["updated_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/companies/{company_id}")
async def get_company(company_id: str):
    """Get a specific company by ID"""
    try:
        company = await companies_collection.find_one({"_id": ObjectId(company_id)})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Count related data
        locations_count = await locations_collection.count_documents({"company_id": company_id})
        devices_count = await devices_collection.count_documents({"company_id": company_id})
        active_visitors_count = await visitors_collection.count_documents({
            "company_id": company_id,
            "status": "checked_in"
        }) if "company_id" in (await visitors_collection.find_one({}) or {}) else 0
        
        return {
            "id": str(company["_id"]),
            "name": company["name"],
            "domain": company.get("domain"),
            "status": company["status"],
            "subscription_plan": company.get("subscription_plan"),
            "max_locations": company.get("max_locations"),
            "max_devices_per_location": company.get("max_devices_per_location"),
            "settings": company.get("settings", {}),
            "locations_count": locations_count,
            "devices_count": devices_count,
            "active_visitors_count": active_visitors_count,
            "account_email": company.get("account_email"),
            "email_verified": company.get("email_verified", False),
            "registration_date": company.get("registration_date"),
            "last_login": company.get("last_login"),
            "created_at": company.get("created_at"),
            "updated_at": company.get("updated_at")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/companies/{company_id}")
async def update_company(company_id: str, update_data: dict):
    """Update a company"""
    try:
        print(f"Raw update_data received: {update_data}")
        print(f"Type: {type(update_data)}")
        
        # Verify company exists
        company = await companies_collection.find_one({"_id": ObjectId(company_id)})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Prepare update data - filter allowed fields
        allowed_fields = ["name", "domain", "status", "subscription_plan", "max_locations", "max_devices_per_location", "settings"]
        update_dict = {}
        
        for field in allowed_fields:
            if field in update_data and update_data[field] is not None:
                update_dict[field] = update_data[field]
        
        if not update_dict:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        update_dict["updated_at"] = datetime.now(timezone.utc)
        
        # Update company
        result = await companies_collection.update_one(
            {"_id": ObjectId(company_id)},
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Get updated company
        updated_company = await companies_collection.find_one({"_id": ObjectId(company_id)})
        
        # Count related data
        locations_count = await locations_collection.count_documents({"company_id": company_id})
        devices_count = await devices_collection.count_documents({"company_id": company_id})
        
        return {
            "id": str(updated_company["_id"]),
            "name": updated_company["name"],
            "domain": updated_company.get("domain"),
            "status": updated_company["status"],
            "subscription_plan": updated_company.get("subscription_plan"),
            "max_locations": updated_company.get("max_locations"),
            "max_devices_per_location": updated_company.get("max_devices_per_location"),
            "settings": updated_company.get("settings", {}),
            "locations_count": locations_count,
            "devices_count": devices_count,
            "created_at": updated_company.get("created_at"),
            "updated_at": updated_company["updated_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/companies/{company_id}")
async def delete_company(company_id: str):
    """Delete a company (with safety checks)"""
    try:
        # Verify company exists
        company = await companies_collection.find_one({"_id": ObjectId(company_id)})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Check if company has locations
        locations_count = await locations_collection.count_documents({"company_id": company_id})
        if locations_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete company. It has {locations_count} location(s). Please remove locations first."
            )
        
        # Check if company has devices
        devices_count = await devices_collection.count_documents({"company_id": company_id})
        if devices_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete company. It has {devices_count} device(s). Please remove devices first."
            )
        
        # Check if company has users
        users_count = await users_collection.count_documents({"company_id": company_id})
        if users_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete company. It has {users_count} user(s). Please remove users first."
            )
        
        # Soft delete: mark as inactive instead of hard delete
        result = await companies_collection.update_one(
            {"_id": ObjectId(company_id)},
            {"$set": {
                "status": "inactive",
                "updated_at": datetime.now(timezone.utc),
                "deleted_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Company not found")
        
        return {"message": "Company deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/companies/{company_id}/locations")
async def get_company_locations(company_id: str):
    """Get all locations for a specific company"""
    try:
        # Verify company exists
        company = await companies_collection.find_one({"_id": ObjectId(company_id)})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Get locations for this company
        locations = await locations_collection.find({"company_id": company_id}).to_list(length=None)
        
        result = []
        for location in locations:
            # Count devices for this location
            devices_count = await devices_collection.count_documents({"location_id": str(location["_id"])})
            
            # Count active visitors for this location
            active_visitors_count = await visitors_collection.count_documents({
                "location_id": str(location["_id"]),
                "status": "checked_in"
            }) if "location_id" in (await visitors_collection.find_one({}) or {}) else 0
            
            result.append({
                "id": str(location["_id"]),
                "company_id": location["company_id"],
                "name": location["name"],
                "address": location.get("address", ""),
                "latitude": location.get("latitude"),
                "longitude": location.get("longitude"),
                "timezone": location.get("timezone", "UTC"),
                "status": location.get("status", "active"),
                "subscription_id": location.get("subscription_id"),
                "subscription_status": location.get("subscription_status"),
                "subscription_plan": location.get("subscription_plan"),
                "settings": location.get("settings", {}),
                "working_hours": location.get("working_hours", {}),
                "contact_info": location.get("contact_info", {}),
                "devices_count": devices_count,
                "active_visitors_count": active_visitors_count,
                "company_name": company["name"],
                "linking_code": location.get("linking_code", ""),
                "created_at": location.get("created_at"),
                "updated_at": location.get("updated_at")
            })
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class LocationCreate(BaseModel):
    name: str
    subscription_id: str  # Required subscription ID
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = "UTC"
    status: Optional[str] = "active"
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)
    working_hours: Optional[Dict[str, Any]] = Field(default_factory=dict)
    contact_info: Optional[Dict[str, Any]] = Field(default_factory=dict)


@app.post("/companies/{company_id}/locations")
async def create_location(company_id: str, location_data: LocationCreate):
    """Create a new location for a company"""
    try:
        # Verify company exists and get company limits
        company = await companies_collection.find_one({"_id": ObjectId(company_id)})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Validate subscription
        subscription = await subscriptions_collection.find_one({"_id": ObjectId(location_data.subscription_id)})
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Verify subscription belongs to the company
        if subscription["company_id"] != company_id:
            raise HTTPException(status_code=400, detail="Subscription does not belong to this company")
        
        # Verify subscription is active (active, trialing, or past_due)
        valid_statuses = ["active", "trialing", "past_due"]
        if subscription["status"] not in valid_statuses:
            raise HTTPException(
                status_code=400, 
                detail=f"Subscription status '{subscription['status']}' is not valid for creating locations. Must be one of: {', '.join(valid_statuses)}"
            )
        
        # Verify subscription is not already linked to another location
        existing_location = await locations_collection.find_one({"subscription_id": location_data.subscription_id})
        if existing_location:
            raise HTTPException(
                status_code=400, 
                detail="Subscription is already linked to another location"
            )
        
        # Check if company has reached location limit
        current_locations = await locations_collection.count_documents({"company_id": company_id})
        max_locations = company.get("max_locations", 5)
        
        if current_locations >= max_locations:
            raise HTTPException(
                status_code=400, 
                detail=f"Company has reached maximum location limit ({max_locations})"
            )
        
        # Create location document from Pydantic model
        location_dict = location_data.dict()
        location_dict["company_id"] = company_id
        
        # Set default working hours if not provided
        if not location_dict.get("working_hours"):
            location_dict["working_hours"] = {
                "monday": {"start": "09:00", "end": "17:00"},
                "tuesday": {"start": "09:00", "end": "17:00"},
                "wednesday": {"start": "09:00", "end": "17:00"},
                "thursday": {"start": "09:00", "end": "17:00"},
                "friday": {"start": "09:00", "end": "17:00"},
                "saturday": {"start": "10:00", "end": "14:00"},
                "sunday": {"start": "closed", "end": "closed"}
            }
        
        # Generate unique linking code
        location_dict["linking_code"] = await get_unique_linking_code()
        location_dict["created_at"] = datetime.now(timezone.utc)
        location_dict["updated_at"] = datetime.now(timezone.utc)
        
        # Insert location
        result = await locations_collection.insert_one(location_dict)
        
        # Update subscription to link it to the new location
        await subscriptions_collection.update_one(
            {"_id": ObjectId(location_data.subscription_id)},
            {"$set": {"location_id": str(result.inserted_id)}}
        )
        
        # Get created location
        new_location = await locations_collection.find_one({"_id": result.inserted_id})
        
        return {
            "id": str(new_location["_id"]),
            "company_id": new_location["company_id"],
            "name": new_location["name"],
            "subscription_id": new_location["subscription_id"],
            "linking_code": new_location["linking_code"],
            "address": new_location.get("address"),
            "latitude": new_location.get("latitude"),
            "longitude": new_location.get("longitude"),
            "timezone": new_location.get("timezone"),
            "status": new_location["status"],
            "settings": new_location.get("settings", {}),
            "working_hours": new_location.get("working_hours", {}),
            "contact_info": new_location.get("contact_info", {}),
            "devices_count": 0,
            "active_visitors_count": 0,
            "company_name": company["name"],
            "created_at": new_location["created_at"],
            "updated_at": new_location["updated_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/companies/{company_id}/available-subscriptions")
async def get_available_subscriptions(company_id: str):
    """Get available subscriptions for a company (not already linked to locations)"""
    try:
        # Verify company exists
        company = await companies_collection.find_one({"_id": ObjectId(company_id)})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Get all subscriptions for this company that are active, trialing, or past_due
        # and not already linked to a location
        valid_statuses = ["active", "trialing", "past_due"]
        subscriptions = await subscriptions_collection.find({
            "company_id": company_id,
            "status": {"$in": valid_statuses},
            "$or": [
                {"location_id": {"$exists": False}},
                {"location_id": None},
                {"location_id": ""}
            ]
        }).to_list(length=None)
        
        return [subscription_helper(subscription) for subscription in subscriptions]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/locations/{location_id}")
async def get_location(location_id: str):
    """Get a specific location by ID"""
    try:
        location = await locations_collection.find_one({"_id": ObjectId(location_id)})
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Get company name
        company = await companies_collection.find_one({"_id": ObjectId(location["company_id"])})
        company_name = company["name"] if company else "Unknown Company"
        
        # Count devices and visitors
        devices_count = await devices_collection.count_documents({"location_id": location_id})
        active_visitors_count = await visitors_collection.count_documents({
            "location_id": location_id,
            "status": "checked_in"
        }) if "location_id" in (await visitors_collection.find_one({}) or {}) else 0
        
        return {
            "id": str(location["_id"]),
            "company_id": location["company_id"],
            "name": location["name"],
            "address": location.get("address"),
            "latitude": location.get("latitude"),
            "longitude": location.get("longitude"),
            "timezone": location.get("timezone"),
            "status": location["status"],
            "subscription_id": location.get("subscription_id"),
            "subscription_status": location.get("subscription_status"),
            "subscription_plan": location.get("subscription_plan"),
            "settings": location.get("settings", {}),
            "working_hours": location.get("working_hours", {}),
            "contact_info": location.get("contact_info", {}),
            "devices_count": devices_count,
            "active_visitors_count": active_visitors_count,
            "company_name": company_name,
            "linking_code": location.get("linking_code", ""),
            "created_at": location.get("created_at"),
            "updated_at": location.get("updated_at")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/locations/{location_id}")
async def update_location(location_id: str, update_data: dict):
    """Update a location"""
    try:
        print(f"Raw location update_data received: {update_data}")
        print(f"Type: {type(update_data)}")
        
        # Verify location exists
        location = await locations_collection.find_one({"_id": ObjectId(location_id)})
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Prepare update data - filter allowed fields
        allowed_fields = ["name", "address", "latitude", "longitude", "timezone", "status", "settings", "working_hours", "contact_info"]
        update_dict = {}
        
        for field in allowed_fields:
            if field in update_data and update_data[field] is not None:
                update_dict[field] = update_data[field]
        
        if not update_dict:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        update_dict["updated_at"] = datetime.now(timezone.utc)
        
        # Update location
        result = await locations_collection.update_one(
            {"_id": ObjectId(location_id)},
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Get updated location
        updated_location = await locations_collection.find_one({"_id": ObjectId(location_id)})
        
        # Get company name
        company = await companies_collection.find_one({"_id": ObjectId(updated_location["company_id"])})
        company_name = company["name"] if company else "Unknown Company"
        
        return {
            "id": str(updated_location["_id"]),
            "company_id": updated_location["company_id"],
            "name": updated_location["name"],
            "address": updated_location.get("address"),
            "latitude": updated_location.get("latitude"),
            "longitude": updated_location.get("longitude"),
            "timezone": updated_location.get("timezone"),
            "status": updated_location["status"],
            "settings": updated_location.get("settings", {}),
            "working_hours": updated_location.get("working_hours", {}),
            "contact_info": updated_location.get("contact_info", {}),
            "company_name": company_name,
            "created_at": updated_location.get("created_at"),
            "updated_at": updated_location["updated_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/locations/{location_id}")
async def delete_location(location_id: str):
    """Delete a location (with safety checks)"""
    try:
        # Verify location exists
        location = await locations_collection.find_one({"_id": ObjectId(location_id)})
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Check if location has active devices
        devices_count = await devices_collection.count_documents({"location_id": location_id})
        if devices_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete location. It has {devices_count} active device(s). Please remove devices first."
            )
        
        # Check if location has active visitors
        active_visitors = await visitors_collection.count_documents({
            "location_id": location_id,
            "status": "checked_in"
        }) if "location_id" in (await visitors_collection.find_one({}) or {}) else 0
        
        if active_visitors > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete location. It has {active_visitors} active visitor(s). Please check out visitors first."
            )
        
        # Soft delete: mark as inactive instead of hard delete
        result = await locations_collection.update_one(
            {"_id": ObjectId(location_id)},
            {"$set": {
                "status": "inactive",
                "updated_at": datetime.now(timezone.utc),
                "deleted_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Location not found")
        
        return {"message": "Location deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/users")
async def get_users(current_company: dict = Depends(get_current_company)):
    """Get users - super admin sees all, company admin sees only their company's users"""
    try:
        current_role = current_company.get("role", "company_admin")
        
        # Build query based on role
        if current_role == "super_admin":
            # Super admin can see all users
            query = {}
        else:
            # Company admin sees only their company's users
            query = {"company_id": str(current_company["_id"])}
        
        users = await users_collection.find(query).to_list(length=None)
        
        result = []
        for user in users:
            # Get company name if user has company_id
            company_name = None
            if user.get("company_id"):
                company = await companies_collection.find_one({"_id": ObjectId(user["company_id"])})
                company_name = company["name"] if company else None
            
            result.append({
                "id": str(user["_id"]),
                "email": user["email"],
                "first_name": user.get("first_name") or "",
                "last_name": user.get("last_name") or "",
                "full_name": user.get("full_name") or "",
                "role": user.get("role", "employee"),
                "status": user.get("status", "active"),
                "company_id": user.get("company_id"),
                "company_name": company_name or "",
                "permissions": user.get("permissions", []),
                "last_login": user.get("last_login"),
                "created_at": user.get("created_at"),
                "updated_at": user.get("updated_at")
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/users")
async def create_user(user_data: UserCreate):
    """Create a new user"""
    try:
        # Check if user already exists
        existing_user = await users_collection.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
        
        # Verify company exists
        company = await companies_collection.find_one({"_id": ObjectId(user_data.company_id)})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Create user document
        user_doc = {
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "full_name": f"{user_data.first_name} {user_data.last_name}",
            "email": user_data.email,
            "company_id": user_data.company_id,
            "role": user_data.role,
            "status": user_data.status,
            "permissions": user_data.permissions,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        result = await users_collection.insert_one(user_doc)
        
        # Return the created user
        created_user = await users_collection.find_one({"_id": result.inserted_id})
        return {
            "id": str(created_user["_id"]),
            "first_name": created_user["first_name"],
            "last_name": created_user["last_name"],
            "email": created_user["email"],
            "company_id": created_user["company_id"],
            "company_name": company["name"],
            "role": created_user["role"],
            "status": created_user["status"],
            "permissions": created_user["permissions"],
            "created_at": created_user["created_at"],
            "updated_at": created_user["updated_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/users/{user_id}")
async def get_user(user_id: str):
    """Get a specific user by ID"""
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get company name
        company_name = None
        if user.get("company_id"):
            company = await companies_collection.find_one({"_id": ObjectId(user["company_id"])})
            company_name = company["name"] if company else None
        
        return {
            "id": str(user["_id"]),
            "first_name": user.get("first_name") or "",
            "last_name": user.get("last_name") or "",
            "email": user["email"],
            "company_id": user.get("company_id"),
            "company_name": company_name or "",
            "role": user.get("role", "employee"),
            "status": user.get("status", "active"),
            "permissions": user.get("permissions", []),
            "last_login": user.get("last_login"),
            "created_at": user.get("created_at"),
            "updated_at": user.get("updated_at")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/users/{user_id}")
async def update_user(user_id: str, update_data: UserUpdate):
    """Update a user"""
    try:
        # Check if user exists
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Build update document
        update_doc = {"updated_at": datetime.now(timezone.utc)}
        
        # Update fields if provided
        if update_data.first_name is not None:
            update_doc["first_name"] = update_data.first_name
        if update_data.last_name is not None:
            update_doc["last_name"] = update_data.last_name
        if update_data.first_name is not None or update_data.last_name is not None:
            first_name = update_data.first_name if update_data.first_name is not None else user["first_name"]
            last_name = update_data.last_name if update_data.last_name is not None else user["last_name"]
            update_doc["full_name"] = f"{first_name} {last_name}"
        if update_data.email is not None:
            # Check if email is already taken by another user
            existing_user = await users_collection.find_one({
                "email": update_data.email,
                "_id": {"$ne": ObjectId(user_id)}
            })
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already taken by another user")
            update_doc["email"] = update_data.email
        if update_data.company_id is not None:
            # Verify company exists
            company = await companies_collection.find_one({"_id": ObjectId(update_data.company_id)})
            if not company:
                raise HTTPException(status_code=404, detail="Company not found")
            update_doc["company_id"] = update_data.company_id
        if update_data.role is not None:
            update_doc["role"] = update_data.role
        if update_data.status is not None:
            update_doc["status"] = update_data.status
        if update_data.permissions is not None:
            update_doc["permissions"] = update_data.permissions
        
        # Update the user
        await users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_doc}
        )
        
        # Return updated user
        updated_user = await users_collection.find_one({"_id": ObjectId(user_id)})
        
        # Get company name
        company_name = None
        if updated_user.get("company_id"):
            company = await companies_collection.find_one({"_id": ObjectId(updated_user["company_id"])})
            company_name = company["name"] if company else None
        
        return {
            "id": str(updated_user["_id"]),
            "first_name": updated_user.get("first_name") or "",
            "last_name": updated_user.get("last_name") or "",
            "email": updated_user["email"],
            "company_id": updated_user.get("company_id"),
            "company_name": company_name or "",
            "role": updated_user.get("role", "employee"),
            "status": updated_user.get("status", "active"),
            "permissions": updated_user.get("permissions", []),
            "last_login": updated_user.get("last_login"),
            "created_at": updated_user.get("created_at"),
            "updated_at": updated_user.get("updated_at")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/users/{user_id}")
async def delete_user(user_id: str):
    """Delete a user"""
    try:
        # Check if user exists
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete the user
        await users_collection.delete_one({"_id": ObjectId(user_id)})
        
        return {"message": "User deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/devices")
async def get_devices(
    location_id: Optional[str] = None,
    current_company: dict = Depends(get_current_company)
):
    """Get devices - super admin sees all, company admin sees only their company's devices"""
    try:
        current_role = current_company.get("role", "company_admin")
        
        # Build query filter based on role
        if current_role == "super_admin":
            # Super admin can see all devices
            query = {}
            if location_id:
                query["location_id"] = location_id
        else:
            # Company admin sees only their company's devices
            query = {"company_id": str(current_company["_id"])}
            if location_id:
                query["location_id"] = location_id
        
        devices = await devices_collection.find(query).to_list(length=None)
        
        result = []
        for device in devices:
            # Get company name
            company = await companies_collection.find_one({"_id": ObjectId(device["company_id"])})
            company_name = company["name"] if company else "Unknown Company"
            
            # Get location name
            location = await locations_collection.find_one({"_id": ObjectId(device["location_id"])})
            location_name = location["name"] if location else "Unknown Location"
            
            # Check if device is online (last heartbeat within 5 minutes)
            is_online = False
            if device.get("last_heartbeat"):
                last_heartbeat = device["last_heartbeat"]
                # Ensure both datetimes are timezone-aware
                if last_heartbeat.tzinfo is None:
                    last_heartbeat = last_heartbeat.replace(tzinfo=timezone.utc)
                time_diff = datetime.now(timezone.utc) - last_heartbeat
                is_online = time_diff.total_seconds() < 300  # 5 minutes
            
            result.append({
                "id": str(device["_id"]),
                "company_id": device["company_id"],
                "location_id": device["location_id"],
                "name": device["name"],
                "device_type": device["device_type"],
                "device_id": device["device_id"],
                "status": device.get("status", "active"),
                "is_online": is_online,
                "last_heartbeat": device.get("last_heartbeat"),
                "settings": device.get("settings", {}),
                "company_name": company_name,
                "location_name": location_name,
                "created_at": device.get("created_at"),
                "updated_at": device.get("updated_at")
            })
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/locations/{location_id}/devices")
async def create_device(
    location_id: str, 
    device_data: DeviceCreate,
    location_validation: dict = Depends(validate_location_subscription),
    device_limits_check: dict = Depends(check_device_limits)
):
    """Create a new device for a location"""
    try:
        logger.info(f"Creating device for location {location_id}")
        logger.debug(f"Device data: {device_data}")
        logger.debug(f"Location validation: {location_validation}")
        logger.debug(f"Device limits check: {device_limits_check}")
        # Get location and company info from middleware
        location = location_validation["location"]
        subscription = location_validation["subscription"]
        
        # Get company info
        company = await companies_collection.find_one({"_id": ObjectId(location["company_id"])})
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Create device document
        device_dict = device_data.dict()
        device_dict["company_id"] = location["company_id"]
        device_dict["location_id"] = location_id
        device_dict["is_online"] = False
        device_dict["last_heartbeat"] = None
        device_dict["created_at"] = datetime.now(timezone.utc)
        device_dict["updated_at"] = datetime.now(timezone.utc)
        
        # Insert device
        result = await devices_collection.insert_one(device_dict)
        
        # Get created device
        new_device = await devices_collection.find_one({"_id": result.inserted_id})
        
        return {
            "id": str(new_device["_id"]),
            "company_id": new_device["company_id"],
            "location_id": new_device["location_id"],
            "name": new_device["name"],
            "device_type": new_device["device_type"],
            "device_id": new_device["device_id"],
            "status": new_device["status"],
            "is_online": new_device["is_online"],
            "last_heartbeat": new_device.get("last_heartbeat"),
            "settings": new_device.get("settings", {}),
            "company_name": company["name"],
            "location_name": location["name"],
            "created_at": new_device["created_at"],
            "updated_at": new_device["updated_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating device: {e}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Exception traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/devices/{device_id}/heartbeat")
async def device_heartbeat(
    device_id: str,
    x_company_id: Optional[str] = Header(None, alias="X-Company-ID")
):
    """Record device heartbeat"""
    try:
        # Update device heartbeat timestamp
        await devices_collection.update_one(
            {"_id": ObjectId(device_id) if len(device_id) == 24 else device_id},
            {"$set": {
                "is_online": True,
                "last_heartbeat": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        return {"message": "Heartbeat recorded successfully"}
    except Exception as e:
        return {"message": "Heartbeat recorded successfully"}  # Return success even if device not found

@app.get("/devices/{device_id}")
async def get_device(device_id: str):
    """Get a specific device by ID"""
    try:
        device = await devices_collection.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Get company name
        company = await companies_collection.find_one({"_id": ObjectId(device["company_id"])})
        company_name = company["name"] if company else "Unknown Company"
        
        # Get location name
        location = await locations_collection.find_one({"_id": ObjectId(device["location_id"])})
        location_name = location["name"] if location else "Unknown Location"
        
        # Check if device is online
        is_online = False
        if device.get("last_heartbeat"):
            last_heartbeat = device["last_heartbeat"]
            if last_heartbeat.tzinfo is None:
                last_heartbeat = last_heartbeat.replace(tzinfo=timezone.utc)
            time_diff = datetime.now(timezone.utc) - last_heartbeat
            is_online = time_diff.total_seconds() < 300  # 5 minutes
        
        return {
            "id": str(device["_id"]),
            "company_id": device["company_id"],
            "location_id": device["location_id"],
            "name": device["name"],
            "device_type": device["device_type"],
            "device_id": device["device_id"],
            "status": device["status"],
            "is_online": is_online,
            "last_heartbeat": device.get("last_heartbeat"),
            "settings": device.get("settings", {}),
            "company_name": company_name,
            "location_name": location_name,
            "created_at": device.get("created_at"),
            "updated_at": device.get("updated_at")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/devices/{device_id}")
async def update_device(device_id: str, update_data: DeviceUpdate):
    """Update a device"""
    try:
        print(f"Raw device update_data received: {update_data}")
        print(f"Type: {type(update_data)}")
        
        # Verify device exists
        device = await devices_collection.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Build update document from DeviceUpdate model
        update_dict = {"updated_at": datetime.now(timezone.utc)}
        
        # Update fields if provided
        if update_data.name is not None:
            update_dict["name"] = update_data.name
        if update_data.device_type is not None:
            update_dict["device_type"] = update_data.device_type
        if update_data.device_id is not None:
            update_dict["device_id"] = update_data.device_id
        if update_data.status is not None:
            update_dict["status"] = update_data.status
        if update_data.settings is not None:
            update_dict["settings"] = update_data.settings
        
        # Check if we have any fields to update beyond updated_at
        if len(update_dict) == 1:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        # Update device
        result = await devices_collection.update_one(
            {"_id": ObjectId(device_id)},
            {"$set": update_dict}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Get updated device
        updated_device = await devices_collection.find_one({"_id": ObjectId(device_id)})
        
        # Get company and location names
        company = await companies_collection.find_one({"_id": ObjectId(updated_device["company_id"])})
        company_name = company["name"] if company else "Unknown Company"
        
        location = await locations_collection.find_one({"_id": ObjectId(updated_device["location_id"])})
        location_name = location["name"] if location else "Unknown Location"
        
        return {
            "id": str(updated_device["_id"]),
            "company_id": updated_device["company_id"],
            "location_id": updated_device["location_id"],
            "name": updated_device["name"],
            "device_type": updated_device["device_type"],
            "device_id": updated_device["device_id"],
            "status": updated_device["status"],
            "is_online": updated_device.get("is_online", False),
            "last_heartbeat": updated_device.get("last_heartbeat"),
            "settings": updated_device.get("settings", {}),
            "company_name": company_name,
            "location_name": location_name,
            "created_at": updated_device.get("created_at"),
            "updated_at": updated_device["updated_at"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/devices/{device_id}")
async def delete_device(device_id: str):
    """Delete a device (soft delete)"""
    try:
        # Verify device exists
        device = await devices_collection.find_one({"_id": ObjectId(device_id)})
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        
        # Soft delete: mark as inactive instead of hard delete
        result = await devices_collection.update_one(
            {"_id": ObjectId(device_id)},
            {"$set": {
                "status": "inactive",
                "updated_at": datetime.now(timezone.utc),
                "deleted_at": datetime.now(timezone.utc)
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Device not found")
        
        return {"message": "Device deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Theme management endpoints
@app.get("/api/themes", response_model=List[ThemeResponse])
async def get_company_themes(
    companyId: str = None,
    current_company: dict = Depends(get_current_company)
):
    """Get all themes for a company"""
    try:
        # Use provided companyId or current company's ID
        company_id = companyId or current_company["id"]
        
        # Verify access - users can only access their own company's themes
        if current_company.get("role") != "super_admin" and company_id != current_company["id"]:
            raise HTTPException(status_code=403, detail="Access denied to company themes")
        
        themes_cursor = themes_collection.find({"companyId": company_id})
        themes = await themes_cursor.to_list(length=None)
        
        if not themes:
            return []
        
        return [
            ThemeResponse(
                id=theme.get("id", str(theme["_id"])),  # Use custom id if available, otherwise _id
                name=theme["name"],
                description=theme.get("description"),
                category=theme["category"],
                status=theme["status"],
                colors=ThemeColors(**theme["colors"]),
                fonts=ThemeFonts(**theme.get("fonts", {})),
                images=ThemeImages(**theme.get("images", {})),
                spacing=ThemeSpacing(**theme.get("spacing", {})),
                borderRadius=ThemeBorderRadius(**theme.get("borderRadius", {})),
                shadows=ThemeShadows(**theme.get("shadows", {})),
                animations=ThemeAnimations(**theme.get("animations", {})),
                formConfig=ThemeFormConfig(**theme.get("formConfig", {})),
                layoutConfig=ThemeLayoutConfig(**theme.get("layoutConfig", {})),
                companyId=theme["companyId"],
                createdBy=theme.get("createdBy"),
                createdAt=theme["createdAt"],
                updatedAt=theme["updatedAt"],
                version=theme.get("version", 1)
            )
            for theme in themes
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching themes: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch themes")

@app.post("/api/themes", response_model=dict)
async def create_theme(
    theme_data: ThemeCreate,
    current_company: dict = Depends(get_current_company)
):
    """Create a new theme"""
    try:
        # Verify company access
        if current_company.get("role") != "super_admin" and theme_data.companyId != current_company["id"]:
            raise HTTPException(status_code=403, detail="Access denied to create theme for this company")
        
        # Generate unique theme ID
        theme_id = f"theme_{int(time.time())}_{random.randint(1000, 9999)}"
        
        # Create theme document
        theme_doc = {
            "id": theme_id,
            "name": theme_data.name,
            "description": theme_data.description,
            "category": theme_data.category.value,
            "status": theme_data.status.value,
            "colors": theme_data.colors.dict(),
            "fonts": theme_data.fonts.dict(),
            "images": theme_data.images.dict(),
            "spacing": theme_data.spacing.dict(),
            "borderRadius": theme_data.borderRadius.dict(),
            "shadows": theme_data.shadows.dict(),
            "animations": theme_data.animations.dict(),
            "formConfig": theme_data.formConfig.dict(),
            "layoutConfig": theme_data.layoutConfig.dict(),
            "companyId": theme_data.companyId,
            "createdBy": theme_data.createdBy,
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
            "version": 1
        }
        
        result = await themes_collection.insert_one(theme_doc)
        
        return {
            "id": theme_id,
            "message": "Theme created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating theme: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create theme")

@app.get("/api/themes/{theme_id}", response_model=ThemeResponse)
async def get_theme(
    theme_id: str,
    current_company: dict = Depends(get_current_company)
):
    """Get a specific theme by ID"""
    try:
        theme = await themes_collection.find_one({"id": theme_id})
        if not theme:
            raise HTTPException(status_code=404, detail="Theme not found")
        
        # Verify access
        if current_company.get("role") != "super_admin" and theme["companyId"] != current_company["id"]:
            raise HTTPException(status_code=403, detail="Access denied to this theme")
        
        return ThemeResponse(
            id=str(theme["_id"]),
            name=theme["name"],
            description=theme.get("description"),
            category=theme["category"],
            status=theme["status"],
            colors=ThemeColors(**theme["colors"]),
            fonts=ThemeFonts(**theme.get("fonts", {})),
            images=ThemeImages(**theme.get("images", {})),
            spacing=ThemeSpacing(**theme.get("spacing", {})),
            borderRadius=ThemeBorderRadius(**theme.get("borderRadius", {})),
            shadows=ThemeShadows(**theme.get("shadows", {})),
            animations=ThemeAnimations(**theme.get("animations", {})),
            formConfig=ThemeFormConfig(**theme.get("formConfig", {})),
            layoutConfig=ThemeLayoutConfig(**theme.get("layoutConfig", {})),
            companyId=theme["companyId"],
            createdBy=theme.get("createdBy"),
            createdAt=theme["createdAt"],
            updatedAt=theme["updatedAt"],
            version=theme.get("version", 1)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching theme: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch theme")

@app.put("/api/themes/{theme_id}", response_model=dict)
async def update_theme(
    theme_id: str,
    theme_update: ThemeUpdate,
    current_company: dict = Depends(get_current_company)
):
    """Update a theme"""
    try:
        # Check if theme exists and verify access
        existing_theme = await themes_collection.find_one({"id": theme_id})
        if not existing_theme:
            raise HTTPException(status_code=404, detail="Theme not found")
        
        # Verify access
        if current_company.get("role") != "super_admin" and existing_theme["companyId"] != current_company["id"]:
            raise HTTPException(status_code=403, detail="Access denied to this theme")
        
        # Build update document
        update_doc = {"updatedAt": datetime.now(timezone.utc)}
        
        for field, value in theme_update.dict(exclude_unset=True).items():
            if value is not None:
                if hasattr(value, 'dict'):  # Pydantic model
                    update_doc[field] = value.dict()
                else:
                    update_doc[field] = value.value if hasattr(value, 'value') else value
        
        result = await themes_collection.update_one(
            {"id": theme_id},
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Theme not found")
        
        return {"message": "Theme updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating theme: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update theme")

@app.delete("/api/themes/{theme_id}", response_model=dict)
async def delete_theme(
    theme_id: str,
    current_company: dict = Depends(get_current_company)
):
    """Delete a theme"""
    try:
        # Check if theme exists and verify access
        existing_theme = await themes_collection.find_one({"id": theme_id})
        if not existing_theme:
            raise HTTPException(status_code=404, detail="Theme not found")
        
        # Verify access
        if current_company.get("role") != "super_admin" and existing_theme["companyId"] != current_company["id"]:
            raise HTTPException(status_code=403, detail="Access denied to this theme")
        
        # Check if theme is currently active
        active_theme = await theme_activations_collection.find_one({
            "companyId": existing_theme["companyId"],
            "themeId": theme_id
        })
        
        if active_theme:
            raise HTTPException(status_code=400, detail="Cannot delete active theme. Please activate a different theme first.")
        
        result = await themes_collection.delete_one({"id": theme_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Theme not found")
        
        return {"message": "Theme deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting theme: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete theme")

@app.get("/api/themes/active", response_model=dict)
async def get_active_theme(
    companyId: str = None,
    current_company: dict = Depends(get_current_company)
):
    """Get the currently active theme for a company"""
    try:
        # Use provided companyId or current company's ID
        company_id = companyId or current_company["id"]
        
        # Verify access
        if current_company.get("role") != "super_admin" and company_id != current_company["id"]:
            raise HTTPException(status_code=403, detail="Access denied to company themes")
        
        # Find active theme
        activation = await theme_activations_collection.find_one({"companyId": company_id})
        
        if not activation:
            return {"theme": None, "isActive": False}
        
        if activation.get("themeType") == "builtin":
            return {
                "theme": {
                    "name": activation.get("builtinThemeName"),
                    "type": "builtin"
                },
                "isActive": True
            }
        
        # Get custom theme
        if activation.get("themeId"):
            theme = await themes_collection.find_one({"id": activation["themeId"]})
            if theme:
                theme_response = ThemeResponse(
                    id=str(theme["_id"]),
                    name=theme["name"],
                    description=theme.get("description"),
                    category=theme["category"],
                    status=theme["status"],
                    colors=ThemeColors(**theme["colors"]),
                    fonts=ThemeFonts(**theme.get("fonts", {})),
                    images=ThemeImages(**theme.get("images", {})),
                    spacing=ThemeSpacing(**theme.get("spacing", {})),
                    borderRadius=ThemeBorderRadius(**theme.get("borderRadius", {})),
                    shadows=ThemeShadows(**theme.get("shadows", {})),
                    animations=ThemeAnimations(**theme.get("animations", {})),
                    formConfig=ThemeFormConfig(**theme.get("formConfig", {})),
                    layoutConfig=ThemeLayoutConfig(**theme.get("layoutConfig", {})),
                    companyId=theme["companyId"],
                    createdBy=theme.get("createdBy"),
                    createdAt=theme["createdAt"],
                    updatedAt=theme["updatedAt"],
                    version=theme.get("version", 1)
                )
                return {"theme": theme_response.dict(), "isActive": True}
        
        return {"theme": None, "isActive": False}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching active theme: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch active theme")

@app.post("/api/themes/{theme_id}/activate", response_model=dict)
async def activate_theme(
    theme_id: str,
    current_company: dict = Depends(get_current_company)
):
    """Activate a theme for a company"""
    try:
        # Check if theme exists
        theme = await themes_collection.find_one({"id": theme_id})
        if not theme:
            raise HTTPException(status_code=404, detail="Theme not found")
        
        # Verify access
        if current_company.get("role") != "super_admin" and theme["companyId"] != current_company["id"]:
            raise HTTPException(status_code=403, detail="Access denied to this theme")
        
        # Create or update activation record
        activation_doc = {
            "companyId": theme["companyId"],
            "themeId": theme_id,
            "themeType": "custom",
            "builtinThemeName": None,
            "activatedAt": datetime.now(timezone.utc),
            "activatedBy": current_company.get("id")
        }
        
        await theme_activations_collection.replace_one(
            {"companyId": theme["companyId"]},
            activation_doc,
            upsert=True
        )
        
        return {"message": "Theme activated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating theme: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to activate theme")

# Device-based theme endpoints (for React Native app)
@app.get("/device/themes", response_model=List[ThemeResponse])
async def get_device_themes(current_device: dict = Depends(get_current_device)):
    """Get all themes for the device's company (device token auth)"""
    try:
        company_id = current_device.get("company_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Device not associated with a company")
        
        themes_cursor = themes_collection.find({"companyId": company_id})
        themes = await themes_cursor.to_list(length=None)
        
        # Log raw formConfig data from each theme document
        for theme in themes:
            raw_form_config = theme.get("formConfig", {})
            logger.info(f"Raw formConfig from theme '{theme.get('name', 'Unknown')}' (ID: {theme.get('_id')}): {raw_form_config}")
        
        return [
            ThemeResponse(
                id=theme.get("id", str(theme["_id"])),  # Use custom id if available, otherwise _id
                name=theme["name"],
                description=theme.get("description"),
                category=theme["category"],
                status=theme["status"],
                colors=ThemeColors(**theme["colors"]),
                fonts=ThemeFonts(**theme.get("fonts", {})),
                images=ThemeImages(**theme.get("images", {})),
                spacing=ThemeSpacing(**theme.get("spacing", {})),
                borderRadius=ThemeBorderRadius(**theme.get("borderRadius", {})),
                shadows=ThemeShadows(**theme.get("shadows", {})),
                animations=ThemeAnimations(**theme.get("animations", {})),
                formConfig=ThemeFormConfig(**theme.get("formConfig", {})),
                layoutConfig=ThemeLayoutConfig(**theme.get("layoutConfig", {})),
                companyId=theme["companyId"],
                createdBy=theme.get("createdBy"),
                createdAt=theme["createdAt"],
                updatedAt=theme["updatedAt"],
                version=theme.get("version", 1)
            )
            for theme in themes
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching device themes: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch themes")

@app.post("/device/themes", response_model=dict)
async def create_device_theme(
    theme_data: ThemeCreate,
    current_device: dict = Depends(get_current_device)
):
    """Create a new theme for the device's company (device token auth)"""
    try:
        company_id = current_device.get("company_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Device not associated with a company")
        
        # Override companyId to ensure it matches the device's company
        theme_data.companyId = company_id
        
        # Generate unique theme ID
        theme_id = f"theme_{int(time.time())}_{random.randint(1000, 9999)}"
        
        # Create theme document
        theme_doc = {
            "id": theme_id,
            "name": theme_data.name,
            "description": theme_data.description,
            "category": theme_data.category.value,
            "status": theme_data.status.value,
            "colors": theme_data.colors.dict(),
            "fonts": theme_data.fonts.dict(),
            "images": theme_data.images.dict(),
            "spacing": theme_data.spacing.dict(),
            "borderRadius": theme_data.borderRadius.dict(),
            "shadows": theme_data.shadows.dict(),
            "animations": theme_data.animations.dict(),
            "formConfig": theme_data.formConfig.dict(),
            "layoutConfig": theme_data.layoutConfig.dict(),
            "companyId": company_id,
            "createdBy": f"device_{current_device.get('id', 'unknown')}",
            "createdAt": datetime.now(timezone.utc),
            "updatedAt": datetime.now(timezone.utc),
            "version": 1
        }
        
        result = await themes_collection.insert_one(theme_doc)
        
        return {
            "id": theme_id,
            "message": "Theme created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating device theme: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create theme")

@app.post("/device/themes/{theme_id}/activate", response_model=dict)
async def activate_device_theme(
    theme_id: str,
    current_device: dict = Depends(get_current_device)
):
    """Activate a theme for the device's company (device token auth)"""
    try:
        company_id = current_device.get("company_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Device not associated with a company")
        
        # Check if theme exists and belongs to the same company
        # Try by custom id first, then by MongoDB _id
        theme = await themes_collection.find_one({"id": theme_id, "companyId": company_id})
        if not theme:
            try:
                from bson import ObjectId
                theme = await themes_collection.find_one({"_id": ObjectId(theme_id), "companyId": company_id})
            except:
                pass
        
        if not theme:
            raise HTTPException(status_code=404, detail="Theme not found or access denied")
        
        # Create or update activation record
        # Use the theme's custom id if available, otherwise use MongoDB _id
        actual_theme_id = theme.get("id") or str(theme["_id"])
        
        activation_doc = {
            "companyId": company_id,
            "themeId": actual_theme_id,
            "themeType": "custom",
            "builtinThemeName": None,
            "activatedAt": datetime.now(timezone.utc),
            "activatedBy": f"device_{current_device.get('id', 'unknown')}"
        }
        
        await theme_activations_collection.replace_one(
            {"companyId": company_id},
            activation_doc,
            upsert=True
        )
        
        return {"message": "Theme activated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error activating device theme: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to activate theme")

@app.put("/device/themes/{theme_id}", response_model=dict)
async def update_device_theme(
    theme_id: str,
    theme_update: ThemeUpdate,
    current_device: dict = Depends(get_current_device)
):
    """Update a theme for the device's company (device token auth)"""
    try:
        # Log payload size for debugging
        payload_size = len(str(theme_update.dict()))
        logger.info(f"Theme update payload size: {payload_size} bytes ({payload_size / 1024:.2f} KB)")
        
        # Check for large images
        if hasattr(theme_update, 'images') and theme_update.images:
            image_data = theme_update.images.dict() if hasattr(theme_update.images, 'dict') else theme_update.images
            for key, value in image_data.items():
                if value and isinstance(value, str) and len(value) > 1000:
                    logger.info(f"Large image detected in {key}: {len(value)} characters")
        
        company_id = current_device.get("company_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Device not associated with a company")
        
        # Check if theme exists and belongs to the same company
        existing_theme = await themes_collection.find_one({"id": theme_id, "companyId": company_id})
        if not existing_theme:
            raise HTTPException(status_code=404, detail="Theme not found or access denied")
        
        # Log incoming update data
        logger.info(f"Updating theme {theme_id} with data: {theme_update.dict(exclude_unset=True)}")
        
        # Build update document
        update_doc = {"updatedAt": datetime.now(timezone.utc)}
        
        for field, value in theme_update.dict(exclude_unset=True).items():
            if value is not None:
                if hasattr(value, 'dict'):  # Pydantic model
                    update_doc[field] = value.dict()
                    logger.info(f"Setting field {field} with dict value: {value.dict()}")
                else:
                    update_doc[field] = value.value if hasattr(value, 'value') else value
                    logger.info(f"Setting field {field} with value: {value}")
        
        logger.info(f"Final update document: {update_doc}")
        
        result = await themes_collection.update_one(
            {"id": theme_id, "companyId": company_id},
            {"$set": update_doc}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Theme not found")
        
        # Verify the update by reading back the theme
        updated_theme = await themes_collection.find_one({"id": theme_id, "companyId": company_id})
        logger.info(f"Theme after update - formConfig: {updated_theme.get('formConfig', {})}")
        
        return {"message": "Theme updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating device theme: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update theme")

@app.delete("/device/themes/{theme_id}", response_model=dict)
async def delete_device_theme(
    theme_id: str,
    current_device: dict = Depends(get_current_device)
):
    """Delete a theme for the device's company (device token auth)"""
    try:
        company_id = current_device.get("company_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Device not associated with a company")
        
        # Check if theme exists and belongs to the same company
        existing_theme = await themes_collection.find_one({"id": theme_id, "companyId": company_id})
        if not existing_theme:
            raise HTTPException(status_code=404, detail="Theme not found or access denied")
        
        # Check if theme is currently active
        active_theme = await theme_activations_collection.find_one({
            "companyId": company_id,
            "themeId": theme_id
        })
        
        if active_theme:
            raise HTTPException(status_code=400, detail="Cannot delete active theme. Please activate a different theme first.")
        
        result = await themes_collection.delete_one({"id": theme_id, "companyId": company_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Theme not found")
        
        return {"message": "Theme deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting device theme: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete theme")

@app.get("/device/themes/active", response_model=dict)
async def get_active_device_theme(current_device: dict = Depends(get_current_device)):
    """Get the currently active theme for the device's company (device token auth)"""
    try:
        company_id = current_device.get("company_id")
        if not company_id:
            raise HTTPException(status_code=400, detail="Device not associated with a company")
        
        # Find active theme
        activation = await theme_activations_collection.find_one({"companyId": company_id})
        
        if not activation:
            return {"theme": None, "isActive": False}
        
        if activation.get("themeType") == "builtin":
            return {
                "theme": {
                    "name": activation.get("builtinThemeName"),
                    "type": "builtin"
                },
                "isActive": True
            }
        
        # Get custom theme
        if activation.get("themeId"):
            theme = await themes_collection.find_one({"id": activation["themeId"], "companyId": company_id})
            if theme:
                # Log the raw formConfig data from the database
                logger.info(f"Raw formConfig from database: {theme.get('formConfig', {})}")
                
                theme_response = ThemeResponse(
                    id=theme.get("id", str(theme["_id"])),
                    name=theme["name"],
                    description=theme.get("description"),
                    category=theme["category"],
                    status=theme["status"],
                    colors=ThemeColors(**theme["colors"]),
                    fonts=ThemeFonts(**theme.get("fonts", {})),
                    images=ThemeImages(**theme.get("images", {})),
                    spacing=ThemeSpacing(**theme.get("spacing", {})),
                    borderRadius=ThemeBorderRadius(**theme.get("borderRadius", {})),
                    shadows=ThemeShadows(**theme.get("shadows", {})),
                    animations=ThemeAnimations(**theme.get("animations", {})),
                    formConfig=ThemeFormConfig(**theme.get("formConfig", {})),
                    layoutConfig=ThemeLayoutConfig(**theme.get("layoutConfig", {})),
                    companyId=theme["companyId"],
                    createdBy=theme.get("createdBy"),
                    createdAt=theme["createdAt"],
                    updatedAt=theme["updatedAt"],
                    version=theme.get("version", 1)
                )
                
                # Log the processed formConfig data after ThemeFormConfig conversion
                logger.info(f"Processed formConfig in response: {theme_response.formConfig.dict()}")
                
                # Log the entire response to see what's being sent
                response_dict = theme_response.dict()
                
                # Convert datetime objects to ISO format strings for JSON serialization
                if isinstance(response_dict.get('createdAt'), datetime):
                    response_dict['createdAt'] = response_dict['createdAt'].isoformat()
                if isinstance(response_dict.get('updatedAt'), datetime):
                    response_dict['updatedAt'] = response_dict['updatedAt'].isoformat()
                
                logger.info(f"Full theme response being sent: {json.dumps(response_dict, indent=2)}")
                
                return {"theme": response_dict, "isActive": True}
        
        return {"theme": None, "isActive": False}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching active device theme: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch active theme")

# Analytics endpoints
@app.get("/analytics/summary")
async def get_analytics_summary(current_company: dict = Depends(get_current_company)):
    """Get visitor analytics summary - super admin sees global data, company admin sees only their company's data"""
    try:
        current_role = current_company.get("role", "company_admin")
        
        # Build location filter based on role
        if current_role == "super_admin":
            # Super admin sees all data
            location_filter = {}
        else:
            # Company admin sees only their company's data  
            location_filter = {"company_id": str(current_company["_id"])}
        
        # Get location IDs for the company(s)
        locations = await locations_collection.find(location_filter, {"_id": 1}).to_list(length=None)
        location_ids = [str(location["_id"]) for location in locations]
        
        # Build visitor query based on locations
        if current_role == "super_admin":
            visitor_filter = {}
        else:
            visitor_filter = {"location_id": {"$in": location_ids}}
        
        # Get analytics data
        total_visitors = await visitors_collection.count_documents(visitor_filter)
        active_visitors = await visitors_collection.count_documents({
            **visitor_filter,
            "status": VisitorStatus.CHECKED_IN
        })
        
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_visitors = await visitors_collection.count_documents({
            **visitor_filter,
            "check_in_time": {"$gte": today_start}
        })
        
        return {
            "total_visitors": total_visitors,
            "active_visitors": active_visitors,
            "today_visitors": today_visitors,
            "timestamp": datetime.now(timezone.utc),
            "scope": "global" if current_role == "super_admin" else "company"
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

# Subscription endpoints
@app.get("/subscriptions")
async def get_subscriptions(current_company: dict = Depends(get_current_company)):
    """Get subscriptions - super admin sees all, company admin sees only their company's subscriptions"""
    try:
        current_role = current_company.get("role", "company_admin")
        
        # Build query based on role
        if current_role == "super_admin":
            # Super admin can see all subscriptions
            subscriptions = await subscriptions_collection.find({}).to_list(length=None)
        else:
            # Company admin sees only their company's subscriptions
            company_id = str(current_company["_id"])
            subscriptions = await subscriptions_collection.find({"company_id": company_id}).to_list(length=None)
        
        result = []
        for subscription in subscriptions:
            # Get location name if location_id exists
            location_name = None
            if subscription.get("location_id"):
                location = await locations_collection.find_one({"_id": ObjectId(subscription["location_id"])})
                location_name = location["name"] if location else "Unknown Location"
            
            sub_data = subscription_helper(subscription)
            sub_data["location_name"] = location_name
            result.append(sub_data)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/subscriptions")
async def create_subscription(subscription_data: SubscriptionCreate, current_company: dict = Depends(get_current_company)):
    """Create a new subscription (optionally linked to a location)"""
    try:
        company_id = str(current_company["_id"])
        
        # Check if we're in development mode
        stripe_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_...")
        is_development = (
            os.getenv("DEBUG", "false").lower() == "true" or
            stripe_key.startswith("sk_test_") or
            stripe_key == "sk_test_..."
        )
        
        # If location_id is provided, verify it belongs to company
        if subscription_data.location_id:
            location = await locations_collection.find_one({
                "_id": ObjectId(subscription_data.location_id),
                "company_id": company_id
            })
            if not location:
                raise HTTPException(status_code=404, detail="Location not found or not owned by company")
            
            # Check if location already has an active subscription
            existing_sub = await subscriptions_collection.find_one({
                "location_id": subscription_data.location_id,
                "status": {"$in": ["active", "trialing", "past_due"]}
            })
            if existing_sub:
                raise HTTPException(status_code=400, detail="Location already has an active subscription")
        
        # Define pricing based on plan
        plan_pricing = {
            "basic": {"price": 29.99, "max_devices": 5},
            "professional": {"price": 79.99, "max_devices": 15},
            "enterprise": {"price": 199.99, "max_devices": 999}
        }
        
        plan_info = plan_pricing.get(subscription_data.plan.value)
        if not plan_info:
            raise HTTPException(status_code=400, detail="Invalid subscription plan")
        
        # Handle Stripe customer creation
        stripe_customer_id = current_company.get("stripe_customer_id")
        
        if is_development:
            # In development mode, create a mock customer ID if needed
            if not stripe_customer_id:
                stripe_customer_id = f"cus_dev_{company_id}_{int(time.time())}"
                
                # Update company with mock Stripe customer ID
                await companies_collection.update_one(
                    {"_id": current_company["_id"]},
                    {"$set": {"stripe_customer_id": stripe_customer_id}}
                )
        else:
            # Production mode - use real Stripe API
            if not stripe_customer_id:
                customer = stripe.Customer.create(
                    email=current_company["account_email"],
                    name=current_company["name"],
                    metadata={"company_id": company_id}
                )
                stripe_customer_id = customer.id
                
                # Update company with Stripe customer ID
                await companies_collection.update_one(
                    {"_id": current_company["_id"]},
                    {"$set": {"stripe_customer_id": stripe_customer_id}}
                )
        
        # Create subscription document
        subscription_dict = {
            "company_id": company_id,
            "plan": subscription_data.plan.value,
            "status": "trialing",
            "stripe_customer_id": stripe_customer_id,
            "stripe_price_id": subscription_data.price_id,
            "monthly_price": plan_info["price"],
            "currency": "usd",
            "trial_end": datetime.now(timezone.utc) + timedelta(days=14),  # 14-day trial
            "cancel_at_period_end": False,
            "metadata": {"max_devices": plan_info["max_devices"]},
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Add location_id only if provided
        if subscription_data.location_id:
            subscription_dict["location_id"] = subscription_data.location_id
        
        # Handle Stripe subscription creation
        if subscription_data.payment_method_id and not is_development:
            # Production mode - create real Stripe subscription
            try:
                # Attach payment method to customer
                stripe.PaymentMethod.attach(
                    subscription_data.payment_method_id,
                    customer=stripe_customer_id
                )
                
                # Create Stripe subscription
                stripe_metadata = {"company_id": company_id}
                if subscription_data.location_id:
                    stripe_metadata["location_id"] = subscription_data.location_id
                    
                stripe_subscription = stripe.Subscription.create(
                    customer=stripe_customer_id,
                    items=[{"price": subscription_data.price_id}],
                    payment_behavior="default_incomplete",
                    expand=["latest_invoice.payment_intent"],
                    trial_period_days=14,
                    metadata=stripe_metadata
                )
                
                subscription_dict.update({
                    "stripe_subscription_id": stripe_subscription.id,
                    "current_period_start": datetime.fromtimestamp(stripe_subscription.current_period_start, tz=timezone.utc),
                    "current_period_end": datetime.fromtimestamp(stripe_subscription.current_period_end, tz=timezone.utc),
                    "status": stripe_subscription.status
                })
                
            except stripe.error.StripeError as e:
                raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
                
        elif subscription_data.payment_method_id and is_development:
            # Development mode - create mock subscription data
            mock_subscription_id = f"sub_dev_{company_id}_{int(time.time())}"
            current_time = datetime.now(timezone.utc)
            
            subscription_dict.update({
                "stripe_subscription_id": mock_subscription_id,
                "current_period_start": current_time,
                "current_period_end": current_time + timedelta(days=30),
                "status": "trialing"  # Keep as trialing for development
            })
        
        # Insert subscription
        result = await subscriptions_collection.insert_one(subscription_dict)
        
        # Update location with subscription information only if location_id is provided
        if subscription_data.location_id:
            await locations_collection.update_one(
                {"_id": ObjectId(subscription_data.location_id)},
                {"$set": {
                    "subscription_id": str(result.inserted_id),
                    "subscription_status": subscription_dict["status"],
                    "subscription_plan": subscription_dict["plan"]
                }}
            )
        
        # Get created subscription
        new_subscription = await subscriptions_collection.find_one({"_id": result.inserted_id})
        return subscription_helper(new_subscription)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating subscription: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/subscriptions/{subscription_id}")
async def get_subscription(subscription_id: str, current_company: dict = Depends(get_current_company)):
    """Get a specific subscription"""
    try:
        company_id = str(current_company["_id"])
        subscription = await subscriptions_collection.find_one({
            "_id": ObjectId(subscription_id),
            "company_id": company_id
        })
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        return subscription_helper(subscription)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/subscriptions/{subscription_id}")
async def update_subscription(subscription_id: str, update_data: SubscriptionUpdate, current_company: dict = Depends(get_current_company)):
    """Update a subscription (e.g., cancel, change plan)"""
    try:
        company_id = str(current_company["_id"])
        subscription = await subscriptions_collection.find_one({
            "_id": ObjectId(subscription_id),
            "company_id": company_id
        })
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        update_dict = {"updated_at": datetime.now(timezone.utc)}
        
        # Handle cancellation
        if update_data.cancel_at_period_end is not None:
            update_dict["cancel_at_period_end"] = update_data.cancel_at_period_end
            
            # Update Stripe subscription if exists
            if subscription.get("stripe_subscription_id"):
                stripe.Subscription.modify(
                    subscription["stripe_subscription_id"],
                    cancel_at_period_end=update_data.cancel_at_period_end
                )
            
            if update_data.cancel_at_period_end:
                update_dict["canceled_at"] = datetime.now(timezone.utc)
        
        # Handle plan change (simplified - in production you'd handle prorations)
        if update_data.plan:
            plan_pricing = {
                "basic": {"price": 29.99, "max_devices": 5},
                "professional": {"price": 79.99, "max_devices": 15},
                "enterprise": {"price": 199.99, "max_devices": 999}
            }
            
            plan_info = plan_pricing.get(update_data.plan.value)
            if plan_info:
                update_dict.update({
                    "plan": update_data.plan.value,
                    "monthly_price": plan_info["price"],
                    "metadata": {"max_devices": plan_info["max_devices"]}
                })
        
        # Update subscription
        await subscriptions_collection.update_one(
            {"_id": ObjectId(subscription_id)},
            {"$set": update_dict}
        )
        
        # Get updated subscription to get the latest data
        updated_subscription = await subscriptions_collection.find_one({"_id": ObjectId(subscription_id)})
        
        # Update location with new subscription information
        location_update = {}
        if "plan" in update_dict:
            location_update["subscription_plan"] = update_dict["plan"]
        if "cancel_at_period_end" in update_dict and update_dict["cancel_at_period_end"]:
            location_update["subscription_status"] = "canceled"
        
        if location_update:
            await locations_collection.update_one(
                {"_id": ObjectId(subscription["location_id"])},
                {"$set": location_update}
            )
        
        return subscription_helper(updated_subscription)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/subscriptions/{subscription_id}/cancel")
async def cancel_subscription(subscription_id: str, current_company: dict = Depends(get_current_company)):
    """Cancel a subscription immediately"""
    try:
        logger.info(f"Canceling subscription {subscription_id}")
        company_id = str(current_company["_id"])
        subscription = await subscriptions_collection.find_one({
            "_id": ObjectId(subscription_id),
            "company_id": company_id
        })
        if not subscription:
            raise HTTPException(status_code=404, detail="Subscription not found")
        
        # Cancel Stripe subscription if exists
        if subscription.get("stripe_subscription_id"):
            stripe.Subscription.delete(subscription["stripe_subscription_id"])
        
        # Update subscription status
        await subscriptions_collection.update_one(
            {"_id": ObjectId(subscription_id)},
            {"$set": {
                "status": "canceled",
                "canceled_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        # Update location to reflect canceled subscription (if subscription has a location)
        if subscription.get("location_id"):
            await locations_collection.update_one(
                {"_id": ObjectId(subscription["location_id"])},
                {"$set": {"subscription_status": "canceled"}}
            )
        
        logger.info(f"Subscription {subscription_id} canceled successfully")
        return {"message": "Subscription canceled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error canceling subscription {subscription_id}: {str(e)}")
        logger.error(f"Exception traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/stripe/webhook")
async def stripe_webhook(request: dict):
    """Handle Stripe webhooks"""
    try:
        # In production, verify the webhook signature
        event_type = request.get("type")
        data = request.get("data", {})
        
        if event_type == "invoice.payment_succeeded":
            # Update subscription status
            subscription_id = data.get("object", {}).get("subscription")
            if subscription_id:
                # Update subscription
                result = await subscriptions_collection.update_one(
                    {"stripe_subscription_id": subscription_id},
                    {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc)}}
                )
                
                # Update corresponding location
                if result.modified_count > 0:
                    subscription = await subscriptions_collection.find_one({"stripe_subscription_id": subscription_id})
                    if subscription:
                        await locations_collection.update_one(
                            {"_id": ObjectId(subscription["location_id"])},
                            {"$set": {"subscription_status": "active"}}
                        )
        
        elif event_type == "invoice.payment_failed":
            # Handle failed payment
            subscription_id = data.get("object", {}).get("subscription")
            if subscription_id:
                # Update subscription
                result = await subscriptions_collection.update_one(
                    {"stripe_subscription_id": subscription_id},
                    {"$set": {"status": "past_due", "updated_at": datetime.now(timezone.utc)}}
                )
                
                # Update corresponding location
                if result.modified_count > 0:
                    subscription = await subscriptions_collection.find_one({"stripe_subscription_id": subscription_id})
                    if subscription:
                        await locations_collection.update_one(
                            {"_id": ObjectId(subscription["location_id"])},
                            {"$set": {"subscription_status": "past_due"}}
                        )
        
        elif event_type == "customer.subscription.deleted":
            # Handle subscription cancellation
            subscription_id = data.get("object", {}).get("id")
            if subscription_id:
                # Update subscription
                result = await subscriptions_collection.update_one(
                    {"stripe_subscription_id": subscription_id},
                    {"$set": {
                        "status": "canceled",
                        "canceled_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc)
                    }}
                )
                
                # Update corresponding location
                if result.modified_count > 0:
                    subscription = await subscriptions_collection.find_one({"stripe_subscription_id": subscription_id})
                    if subscription:
                        await locations_collection.update_one(
                            {"_id": ObjectId(subscription["location_id"])},
                            {"$set": {"subscription_status": "canceled"}}
                        )
        
        return {"status": "success"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/stripe/config")
async def get_stripe_config():
    """Get Stripe publishable key for frontend"""
    return {"publishable_key": STRIPE_PUBLISHABLE_KEY}

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
        
        # Create super admin account if it doesn't exist
        admin_email = "admin@eoyang.com"
        existing_admin = await companies_collection.find_one({"account_email": admin_email})
        if not existing_admin:
            admin_password = "SuperAdmin123!"  # Change this in production
            password_hash = get_password_hash(admin_password)
            
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
            
            result = await companies_collection.insert_one(super_admin_data)
            print(f"✅ Super admin account created: {admin_email}")
            print(f"   Account ID: {result.inserted_id}")
            print(f"   Default password: {admin_password}")
            print("   🔒 IMPORTANT: Change password after first login!")
        else:
            print(f"ℹ️  Super admin account already exists: {admin_email}")
        
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

# Workflow endpoints
@app.get("/workflows", response_model=List[dict])
async def get_workflows(
    current_user: dict = Depends(get_current_user)
):
    """Get all workflows for the current user's company"""
    try:
        # Check if user has admin privileges
        if current_user.get("role") not in ["admin", "company_admin", "owner"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        workflows = await workflows_collection.find(
            {"company_id": current_user["company_id"]}
        ).to_list(length=None)
        
        # Convert ObjectId to string
        for workflow in workflows:
            workflow["id"] = str(workflow.pop("_id"))
            workflow["createdAt"] = workflow.get("created_at", datetime.utcnow()).isoformat()
            workflow["updatedAt"] = workflow.get("updated_at", datetime.utcnow()).isoformat()
        
        return workflows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch workflows: {str(e)}")

@app.post("/workflows", response_model=dict)
async def create_workflow(
    workflow: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create a new workflow"""
    try:
        # Check if user has admin privileges
        if current_user.get("role") not in ["admin", "company_admin", "owner"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Add metadata
        workflow["company_id"] = current_user["company_id"]
        workflow["created_by"] = current_user["user_id"]
        workflow["created_at"] = datetime.utcnow()
        workflow["updated_at"] = datetime.utcnow()
        
        # Remove id if present (will be generated by MongoDB)
        workflow.pop("id", None)
        
        result = await workflows_collection.insert_one(workflow)
        workflow["id"] = str(result.inserted_id)
        workflow.pop("_id", None)
        
        return workflow
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create workflow: {str(e)}")

@app.put("/workflows/{workflow_id}", response_model=dict)
async def update_workflow(
    workflow_id: str,
    workflow: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update an existing workflow"""
    try:
        # Check if user has admin privileges
        if current_user.get("role") not in ["admin", "company_admin", "owner"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Verify workflow belongs to user's company
        existing = await workflows_collection.find_one({
            "_id": ObjectId(workflow_id),
            "company_id": current_user["company_id"]
        })
        
        if not existing:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Update metadata
        workflow["updated_at"] = datetime.utcnow()
        workflow.pop("id", None)
        workflow.pop("_id", None)
        
        await workflows_collection.update_one(
            {"_id": ObjectId(workflow_id)},
            {"$set": workflow}
        )
        
        workflow["id"] = workflow_id
        return workflow
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update workflow: {str(e)}")

@app.delete("/workflows/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a workflow"""
    try:
        # Check if user has admin privileges
        if current_user.get("role") not in ["admin", "company_admin", "owner"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        # Verify workflow belongs to user's company
        existing = await workflows_collection.find_one({
            "_id": ObjectId(workflow_id),
            "company_id": current_user["company_id"]
        })
        
        if not existing:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        await workflows_collection.delete_one({"_id": ObjectId(workflow_id)})
        
        return {"message": "Workflow deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete workflow: {str(e)}")

# Device endpoint for workflows (read-only)
@app.get("/device/workflows", response_model=List[dict])
async def get_device_workflows(
    current_device: dict = Depends(get_current_device)
):
    """Get active workflows for the device's location"""
    try:
        # Find active workflows for this company/location
        query = {
            "company_id": current_device["company_id"],
            "status": "active"
        }
        
        # If location-specific workflows are configured
        if "location_id" in current_device:
            query["$or"] = [
                {"location_ids": current_device["location_id"]},
                {"location_ids": {"$exists": False}},
                {"location_ids": []}
            ]
        
        workflows = await workflows_collection.find(query).to_list(length=None)
        
        # Convert ObjectId to string
        for workflow in workflows:
            workflow["id"] = str(workflow.pop("_id"))
            workflow["createdAt"] = workflow.get("created_at", datetime.utcnow()).isoformat()
            workflow["updatedAt"] = workflow.get("updated_at", datetime.utcnow()).isoformat()
        
        return workflows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch workflows: {str(e)}")

# Test endpoint for debugging form creation
@app.post("/forms/test")
async def test_form_creation(
    form_data: dict,
    current_device: dict = Depends(get_current_device)
):
    """Test endpoint to debug form creation issues"""
    return {
        "received_data": form_data,
        "device_info": {
            "device_id": current_device.get("device_id"),
            "company_id": current_device.get("company_id"),
        },
        "validation": {
            "has_name": bool(form_data.get("name")),
            "has_category": bool(form_data.get("category")),
            "name_value": form_data.get("name"),
            "category_value": form_data.get("category"),
        }
    }

# Form Management Endpoints
@app.get("/forms", response_model=List[dict])
async def get_forms(
    current_device: dict = Depends(get_current_device)
):
    """Get all forms for the device's company"""
    try:
        forms = await forms_collection.find({"company_id": current_device["company_id"]}).to_list(length=None)
        
        # Convert ObjectId to string and format dates
        serialized_forms = []
        for form in forms:
            serialized_form = {
                "id": str(form["_id"]),
                "name": form.get("name", ""),
                "description": form.get("description", ""),
                "category": form.get("category", "visitor"),
                "status": form.get("status", "draft"),
                "fields": form.get("fields", []),
                "layout": form.get("layout", {}),
                "theme": form.get("theme", {}),
                "settings": form.get("settings", {}),
                "version": form.get("version", 1),
                "location_ids": form.get("location_ids", []),
                "company_id": str(form.get("company_id", "")),
                "created_by": str(form.get("created_by", "")),
                "created_at": form.get("created_at", datetime.now(timezone.utc)).isoformat(),
                "updated_at": form.get("updated_at", datetime.now(timezone.utc)).isoformat(),
            }
            
            # Add optional fields if they exist
            if "totalSubmissions" in form:
                serialized_form["totalSubmissions"] = form["totalSubmissions"]
            if "lastSubmissionAt" in form:
                serialized_form["lastSubmissionAt"] = form["lastSubmissionAt"].isoformat()
                
            serialized_forms.append(serialized_form)
        
        return serialized_forms
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch forms: {str(e)}")

@app.post("/forms", response_model=dict)
async def create_form(
    form_data: dict,
    current_device: dict = Depends(get_current_device)
):
    """Create a new form"""
    logger.info("=== FORM CREATION START ===")
    try:
        logger.info(f"Step 1: Received form data with keys: {list(form_data.keys())}")
        logger.info(f"Form name: {form_data.get('name')}")
        logger.info(f"Form category: {form_data.get('category')}")
        logger.info(f"Current device ID: {current_device.get('device_id')}")
        logger.info(f"Current device company: {current_device.get('company_id')}")
        
        logger.info("Step 2: Adding metadata")
        # Add metadata
        form_data["company_id"] = current_device["company_id"]
        form_data["created_by"] = current_device.get("_id", current_device.get("device_id", "unknown"))
        form_data["created_at"] = datetime.now(timezone.utc)
        form_data["updated_at"] = datetime.now(timezone.utc)
        
        logger.info("Step 3: Processing ID - Let MongoDB auto-generate ObjectId")
        # Remove any client-sent ID - let MongoDB handle _id generation like visitors do
        form_data.pop("id", None)  # Remove id if present
        # Don't set _id manually - let MongoDB auto-generate proper ObjectId
        logger.info("Will use MongoDB auto-generated ObjectId (like visitors)")
        
        logger.info("Step 4: Validating required fields")
        # Validate required fields before processing
        if not form_data.get("name"):
            logger.error("Validation failed: Form name is missing")
            raise HTTPException(status_code=422, detail="Form name is required")
        if not form_data.get("category"):
            logger.error("Validation failed: Form category is missing")
            raise HTTPException(status_code=422, detail="Form category is required")
        logger.info("Required fields validation passed")
        
        logger.info("Step 5: Ensuring nested objects exist")
        # Ensure all nested objects are properly structured
        if "fields" not in form_data:
            form_data["fields"] = []
        if "layout" not in form_data:
            form_data["layout"] = {}
        if "theme" not in form_data:
            form_data["theme"] = {}
        if "settings" not in form_data:
            form_data["settings"] = {}
        logger.info("Nested objects validation passed")
            
        logger.info("Step 6: Attempting database insertion with MongoDB auto-generated ObjectId")
        try:
            result = await forms_collection.insert_one(form_data)
            logger.info(f"Step 7: Database insertion successful. Auto-generated ObjectId: {result.inserted_id}")
        except Exception as db_error:
            logger.error(f"Step 7: Database insertion failed: {str(db_error)}")
            logger.error(f"Error type: {type(db_error)}")
            raise HTTPException(status_code=422, detail=f"Database error: {str(db_error)}")
        
        logger.info("Step 8: Retrieving created form with MongoDB ObjectId")
        # Return the created form using the auto-generated ObjectId
        created_form = await forms_collection.find_one({"_id": result.inserted_id})
        if not created_form:
            logger.error("Step 8: Form retrieval failed - form not found after creation")
            raise HTTPException(status_code=500, detail="Form was not created properly")
            
        logger.info("Step 9: Formatting response")
        # Convert to JSON-serializable format
        response_form = {
            "id": str(created_form["_id"]),
            "name": created_form["name"],
            "description": created_form.get("description", ""),
            "category": created_form["category"],
            "status": created_form["status"],
            "fields": created_form.get("fields", []),
            "layout": created_form.get("layout", {}),
            "theme": created_form.get("theme", {}),
            "settings": created_form.get("settings", {}),
            "version": created_form.get("version", 1),
            "location_ids": created_form.get("location_ids", []),
            "company_id": str(created_form["company_id"]) if created_form.get("company_id") else "",
            "created_by": str(created_form["created_by"]) if created_form.get("created_by") else "",
            "created_at": created_form["created_at"].isoformat(),
            "updated_at": created_form["updated_at"].isoformat(),
        }
        
        logger.info("=== FORM CREATION SUCCESS ===")
        return response_form
    except HTTPException as http_ex:
        logger.error(f"HTTPException raised: {http_ex.detail}")
        raise
    except Exception as e:
        logger.error(f"=== FORM CREATION ERROR ===")
        logger.error(f"Unexpected error: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Form data at error: {form_data}")
        raise HTTPException(status_code=500, detail=f"Failed to create form: {str(e)}")

@app.put("/forms/{form_id}", response_model=dict)
async def update_form(
    form_id: str,
    form_data: dict,
    current_device: dict = Depends(get_current_device)
):
    """Update an existing form"""
    logger.info(f"=== FORM UPDATE REQUEST ===")
    logger.info(f"Form ID: {form_id}")
    logger.info(f"Update data keys: {list(form_data.keys())}")
    
    try:
        # Convert string ID to ObjectId
        try:
            object_id = ObjectId(form_id)
            logger.info(f"Converted form_id to ObjectId: {object_id}")
        except Exception as e:
            logger.error(f"Invalid form ID format: {form_id}, Error: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid form ID format")
        
        # Check if form exists and belongs to device's company
        existing_form = await forms_collection.find_one({
            "_id": object_id,
            "company_id": current_device["company_id"]
        })
        if not existing_form:
            logger.error(f"Form not found with ID: {object_id} for company: {current_device['company_id']}")
            raise HTTPException(status_code=404, detail="Form not found")
        
        logger.info(f"Found existing form: {existing_form.get('name', 'Unknown')}")
        
        # Update metadata
        form_data["updated_at"] = datetime.now(timezone.utc)
        if "id" in form_data:
            form_data.pop("id")  # Remove id from update data
        
        # Increment version
        form_data["version"] = existing_form.get("version", 1) + 1
        
        logger.info(f"Updating form with version: {form_data['version']}")
        
        await forms_collection.update_one(
            {"_id": object_id},
            {"$set": form_data}
        )
        
        logger.info("Form updated in database, retrieving updated form...")
        
        # Return updated form
        updated_form = await forms_collection.find_one({"_id": object_id})
        
        if not updated_form:
            logger.error("Failed to retrieve updated form")
            raise HTTPException(status_code=500, detail="Failed to retrieve updated form")
        
        # Convert to JSON-serializable format with safe field access
        response_form = {
            "id": str(updated_form["_id"]),
            "name": updated_form.get("name", ""),
            "description": updated_form.get("description", ""),
            "category": updated_form.get("category", "general"),
            "status": updated_form.get("status", "active"),
            "fields": updated_form.get("fields", []),
            "layout": updated_form.get("layout", {}),
            "theme": updated_form.get("theme", {}),
            "settings": updated_form.get("settings", {}),
            "version": updated_form.get("version", 1),
            "location_ids": updated_form.get("location_ids", []),
            "company_id": str(updated_form["company_id"]) if updated_form.get("company_id") else "",
            "created_by": str(updated_form["created_by"]) if updated_form.get("created_by") else "",
            "created_at": updated_form["created_at"].isoformat() if updated_form.get("created_at") else datetime.now(timezone.utc).isoformat(),
            "updated_at": updated_form["updated_at"].isoformat() if updated_form.get("updated_at") else datetime.now(timezone.utc).isoformat(),
        }
        
        logger.info(f"=== FORM UPDATE SUCCESS ===")
        return response_form
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"=== FORM UPDATE ERROR ===")
        logger.error(f"Unexpected error during form update: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Form ID: {form_id}")
        raise HTTPException(status_code=500, detail=f"Failed to update form: {str(e)}")

@app.delete("/forms/{form_id}")
async def delete_form(
    form_id: str,
    current_device: dict = Depends(get_current_device)
):
    """Delete a form"""
    try:
        # Convert string ID to ObjectId
        try:
            object_id = ObjectId(form_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid form ID format")
        
        # Check if form exists and belongs to device's company
        existing_form = await forms_collection.find_one({
            "_id": object_id,
            "company_id": current_device["company_id"]
        })
        if not existing_form:
            raise HTTPException(status_code=404, detail="Form not found")
        
        # Check if form has submissions
        submission_count = await form_submissions_collection.count_documents({"form_id": form_id})
        if submission_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete form with {submission_count} submissions. Archive it instead."
            )
        
        await forms_collection.delete_one({"_id": object_id})
        return {"message": "Form deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete form: {str(e)}")

@app.get("/device/forms", response_model=List[dict])
async def get_device_forms(
    current_device: dict = Depends(get_current_device)
):
    """Get active forms for the device's location"""
    try:
        # Find active forms for this company/location
        query = {
            "company_id": current_device["company_id"],
            "status": "active"
        }
        
        # If location-specific forms are configured
        if "location_id" in current_device:
            query["$or"] = [
                {"location_ids": current_device["location_id"]},
                {"location_ids": {"$exists": False}},
                {"location_ids": []}
            ]
        
        forms = await forms_collection.find(query).to_list(length=None)
        
        # Convert ObjectId to string
        for form in forms:
            form["id"] = str(form.pop("_id"))
            form["createdAt"] = form.get("created_at", datetime.utcnow()).isoformat()
            form["updatedAt"] = form.get("updated_at", datetime.utcnow()).isoformat()
        
        return forms
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch forms: {str(e)}")

# Migration endpoint to add linking codes to existing locations
@app.post("/admin/migrate-linking-codes")
async def migrate_linking_codes():
    """Add linking codes to existing locations that don't have them"""
    try:
        # Find locations without linking codes
        locations_without_codes = await locations_collection.find({"linking_code": {"$exists": False}}).to_list(length=None)
        
        updated_count = 0
        for location in locations_without_codes:
            # Generate a unique linking code
            attempts = 0
            while attempts < 10:  # Limit attempts to prevent infinite loop
                linking_code = generate_linking_code()
                existing_location = await locations_collection.find_one({"linking_code": linking_code})
                if not existing_location:
                    # Code is unique, use it
                    await locations_collection.update_one(
                        {"_id": location["_id"]},
                        {"$set": {"linking_code": linking_code}}
                    )
                    updated_count += 1
                    break
                attempts += 1
            
            if attempts >= 10:
                print(f"Failed to generate unique linking code for location {location['_id']}")
        
        return {
            "message": f"Successfully added linking codes to {updated_count} locations",
            "updated_count": updated_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    
    # Configure uvicorn with larger limits
    config = uvicorn.Config(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        loop="asyncio",
        # Increase these limits for larger payloads
        limit_max_requests=1000,
        limit_concurrency=100,
        # Most importantly, increase the max request size
        h11_max_incomplete_event_size=50 * 1024 * 1024,  # 50MB
    )
    
    server = uvicorn.Server(config)
    server.run()
            
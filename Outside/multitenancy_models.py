from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum

def utc_now():
    return datetime.now(timezone.utc)

# Enums
class CompanyStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"

class LocationStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"

class DeviceStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    OFFLINE = "offline"

class DeviceType(str, Enum):
    TABLET = "tablet"
    KIOSK = "kiosk"
    MOBILE = "mobile"

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    COMPANY_ADMIN = "company_admin"
    LOCATION_ADMIN = "location_admin"
    OPERATOR = "operator"

# Company Models
class Company(BaseModel):
    name: str
    slug: str  # URL-safe identifier
    domain: Optional[str] = None  # Company domain for email-based tenant detection
    logo_url: Optional[str] = None
    status: CompanyStatus = CompanyStatus.ACTIVE
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)
    subscription_plan: Optional[str] = "basic"
    max_locations: Optional[int] = 5
    max_devices_per_location: Optional[int] = 10
    created_at: Optional[datetime] = Field(default_factory=utc_now)
    updated_at: Optional[datetime] = Field(default_factory=utc_now)

class CompanyResponse(Company):
    id: str
    locations_count: Optional[int] = 0
    devices_count: Optional[int] = 0
    active_visitors_count: Optional[int] = 0

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    logo_url: Optional[str] = None
    status: Optional[CompanyStatus] = None
    settings: Optional[Dict[str, Any]] = None
    subscription_plan: Optional[str] = None
    max_locations: Optional[int] = None
    max_devices_per_location: Optional[int] = None

# Location Models
class Location(BaseModel):
    company_id: str
    name: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = "UTC"
    status: LocationStatus = LocationStatus.ACTIVE
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)
    working_hours: Optional[Dict[str, Any]] = Field(default_factory=lambda: {
        "monday": {"start": "09:00", "end": "17:00"},
        "tuesday": {"start": "09:00", "end": "17:00"},
        "wednesday": {"start": "09:00", "end": "17:00"},
        "thursday": {"start": "09:00", "end": "17:00"},
        "friday": {"start": "09:00", "end": "17:00"},
        "saturday": {"start": "10:00", "end": "14:00"},
        "sunday": {"start": "closed", "end": "closed"}
    })
    contact_info: Optional[Dict[str, Any]] = Field(default_factory=dict)
    created_at: Optional[datetime] = Field(default_factory=utc_now)
    updated_at: Optional[datetime] = Field(default_factory=utc_now)

class LocationResponse(Location):
    id: str
    company_name: Optional[str] = None
    devices_count: Optional[int] = 0
    active_visitors_count: Optional[int] = 0

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timezone: Optional[str] = None
    status: Optional[LocationStatus] = None
    settings: Optional[Dict[str, Any]] = None
    working_hours: Optional[Dict[str, Any]] = None
    contact_info: Optional[Dict[str, Any]] = None

# Device Models
class Device(BaseModel):
    company_id: str
    location_id: str
    name: str
    device_type: DeviceType = DeviceType.TABLET
    device_id: str  # Unique device identifier (could be MAC address, IMEI, etc.)
    status: DeviceStatus = DeviceStatus.ACTIVE
    last_seen: Optional[datetime] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    app_version: Optional[str] = None
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict)
    assigned_forms: Optional[List[str]] = Field(default_factory=list)  # Form IDs
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

class DeviceResponse(Device):
    id: str
    company_name: Optional[str] = None
    location_name: Optional[str] = None
    is_online: Optional[bool] = False

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type: Optional[DeviceType] = None
    status: Optional[DeviceStatus] = None
    settings: Optional[Dict[str, Any]] = None
    assigned_forms: Optional[List[str]] = None

class DeviceHeartbeat(BaseModel):
    device_id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    app_version: Optional[str] = None
    timestamp: Optional[datetime] = Field(default_factory=utc_now)

# User Models
class User(BaseModel):
    email: str
    full_name: str
    role: UserRole
    company_id: Optional[str] = None  # None for super_admin
    location_ids: Optional[List[str]] = Field(default_factory=list)  # For location_admin and operator
    is_active: bool = True
    last_login: Optional[datetime] = None
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(User):
    id: str
    company_name: Optional[str] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    location_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None

# Enhanced Visitor Models with Multitenancy
class VisitorDataMT(BaseModel):
    company_id: str
    location_id: str
    device_id: str
    form_id: str
    data: Dict[str, Any]
    check_in_time: Optional[datetime] = Field(default_factory=utc_now)
    check_out_time: Optional[datetime] = None
    status: str = "checked_in"  # Using existing VisitorStatus enum
    host_notified: bool = False
    notes: Optional[str] = None

class VisitorResponseMT(BaseModel):
    id: str
    company_id: str
    location_id: str
    device_id: str
    form_id: str
    data: Dict[str, Any]
    check_in_time: datetime
    check_out_time: Optional[datetime] = None
    status: str
    host_notified: bool
    notes: Optional[str] = None
    # Denormalized fields for easy access
    company_name: Optional[str] = None
    location_name: Optional[str] = None
    device_name: Optional[str] = None
    # Extracted visitor fields
    full_name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    host_name: Optional[str] = None
    visit_purpose: Optional[str] = None

# Enhanced Form Models with Multitenancy
class CustomFormMT(BaseModel):
    company_id: str
    name: str
    description: Optional[str] = None
    fields: List[Dict[str, Any]]  # Using existing FormField structure
    is_active: bool = True
    is_global: bool = False  # Can be used across all locations in company
    location_ids: Optional[List[str]] = Field(default_factory=list)  # Specific locations if not global
    created_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomFormResponseMT(CustomFormMT):
    id: str
    company_name: Optional[str] = None

# Analytics Models
class CompanyAnalytics(BaseModel):
    company_id: str
    total_visitors: int = 0
    active_visitors: int = 0
    today_visitors: int = 0
    total_locations: int = 0
    total_devices: int = 0
    online_devices: int = 0
    timestamp: datetime = Field(default_factory=utc_now)

class LocationAnalytics(BaseModel):
    location_id: str
    company_id: str
    total_visitors: int = 0
    active_visitors: int = 0
    today_visitors: int = 0
    total_devices: int = 0
    online_devices: int = 0
    peak_hours: Optional[Dict[str, int]] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Tenant Context (for middleware)
class TenantContext(BaseModel):
    company_id: str
    company_slug: str
    user_id: Optional[str] = None
    user_role: Optional[UserRole] = None
    location_ids: Optional[List[str]] = Field(default_factory=list)
    permissions: Optional[List[str]] = Field(default_factory=list)